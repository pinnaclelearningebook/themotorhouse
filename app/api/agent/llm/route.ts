import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentSettings } from "@/lib/agent/settings";
import { hasLlmSecret } from "@/lib/agent/voice";
import { streamVoiceTurn } from "@/lib/agent/run";
import { sentences, type VehicleContext } from "@/agent/guards";
import { getVehicleContext, readFormState } from "@/agent/tools";
import { PROMISES } from "@/config/site";

/**
 * The brain for voice: an OpenAI-compatible endpoint ElevenLabs calls for
 * every turn.
 *
 * This exists so voice and text cannot diverge. Same prompt, same guards,
 * same tools, same kill switch, same per-conversation turn cap. If this
 * were ElevenLabs' own LLM instead, their agent would answer from a
 * prompt nobody here controls and no guard would ever see it.
 *
 * On guarding: the whole turn is produced and passed through runGuards
 * before anything is emitted, then split into sentences and sent as
 * deltas. That is stricter than guarding each sentence as it streams,
 * because a price spread across a sentence boundary — "it's worth about"
 * then "twenty eight thousand" — cannot slip between two separately
 * guarded fragments. The cost is that speech begins when the model turn
 * finishes rather than part-way through it; the honest trade is a few
 * seconds of silence against a number that cannot be unsaid.
 */

export const dynamic = "force-dynamic";

/** How long an admin test conversation may be served while Maya is off. */
const ADMIN_TEST_WINDOW_MS = 30 * 60 * 1000;

/**
 * Spoken replies are shorter than typed ones.
 *
 * Two sentences is the target the prompt sets; this is the ceiling that
 * stops a long one reaching the ear at all. It has to leave room for tool
 * arguments, which come out of the same budget.
 */
const VOICE_MAX_TOKENS = 160;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.union([z.string(), z.array(z.unknown()), z.null()]),
      }),
    )
    .min(1),
  stream: z.boolean().optional(),
  // Set when we create the conversation, echoed back by ElevenLabs.
  elevenlabs_extra_body: z
    .object({ conversationId: z.string().uuid().optional() })
    .partial()
    .optional(),
  user_id: z.string().optional(),
});

function sseChunk(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function delta(content: string) {
  return {
    id: "tmh",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "the-motor-house",
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
}

function finish() {
  return {
    id: "tmh",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "the-motor-house",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
}

function speak(text: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // One delta per sentence. Every one of them has already been
      // through the guards as part of the whole turn.
      for (const sentence of sentences(text)) {
        controller.enqueue(encoder.encode(sseChunk(delta(`${sentence} `))));
      }
      controller.enqueue(encoder.encode(sseChunk(finish())));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  // The shared secret first: an unauthenticated caller must not be able
  // to learn whether Maya is switched on, let alone spend a model call.
  if (!hasLlmSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await agentSettings();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const conversationId = parsed.data.elevenlabs_extra_body?.conversationId;
  if (!conversationId) {
    return NextResponse.json({ error: "no conversation" }, { status: 400 });
  }

  // The conversation is the credential here, not a cookie: this request
  // comes from ElevenLabs, not from the seller's browser.
  const { data: conversation } = await db()
    .from("conversations")
    .select("id, lead_id, vehicle_id, turn_count, ended_at, admin_test, started_at")
    .eq("id", conversationId)
    .maybeSingle();

  /**
   * While Maya is off, exactly one kind of turn is served: one belonging
   * to a conversation an admin opened for testing, in the last half hour.
   *
   * The window matters. Without it an admin_test row would be a permanent
   * key to a switched-off assistant, and the id travels through
   * ElevenLabs to get here. Thirty minutes is long enough for a test call
   * and short enough that a leaked id is worthless by the time anyone
   * finds it.
   *
   * Every failure here returns the same 503, including a conversation
   * that does not exist. Distinguishing "no such conversation" from
   * "not allowed" would answer, for any id someone cared to try, whether
   * that conversation is real — and the id travels through a third party
   * to reach us.
   */
  if (!settings.enabled) {
    const isTest = conversation?.admin_test === true;
    const startedAt = Date.parse((conversation?.started_at as string) ?? "");
    const fresh =
      Number.isFinite(startedAt) && Date.now() - startedAt < ADMIN_TEST_WINDOW_MS;

    if (!conversation || conversation.ended_at || !isTest || !fresh) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.warn("[agent] serving an admin test turn while disabled");
  } else if (!conversation || conversation.ended_at) {
    return NextResponse.json({ error: "no conversation" }, { status: 404 });
  }

  const turnCount = (conversation.turn_count as number) ?? 0;
  if (turnCount >= settings.maxTurns) {
    return speak(
      "We've been talking a while and I need to hand over. A person will call you about the car.",
    );
  }

  const session = {
    conversationId: conversation.id as string,
    leadId: (conversation.lead_id as string) ?? null,
    vehicleId: (conversation.vehicle_id as string) ?? null,
  };

  // The last thing the seller said. ElevenLabs sends the whole exchange
  // including its own system message, which we discard: the prompt is
  // ours, built here, from agent/prompt.md.
  const spoken = parsed.data.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .filter((content): content is string => typeof content === "string");

  const latest = spoken[spoken.length - 1];
  if (!latest) {
    return NextResponse.json({ error: "nothing said" }, { status: 400 });
  }

  const history = parsed.data.messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(0, -1)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content as string,
    }));

  const vehicleResult = await getVehicleContext(session);
  const vehicleData = (vehicleResult.data ?? {}) as Record<string, unknown>;
  const vehicle =
    vehicleData.known === true
      ? {
          make: vehicleData.make as string | null,
          model: vehicleData.model as string | null,
          year: vehicleData.year_of_manufacture as number | null,
          colour: vehicleData.colour as string | null,
          fuel: vehicleData.fuel as string | null,
        }
      : null;

  const formState = await readFormState(session);

  const guardContext: VehicleContext = vehicle ?? {};
  const encoder = new TextEncoder();

  /**
   * Released sentence by sentence, each one checked against everything
   * said so far in the turn. Speech starts as soon as the first sentence
   * is safe rather than when the whole turn is finished.
   */
  const stream = new ReadableStream({
    async start(controller) {
      let spoken = "";
      let blocked: { rule: string; matched: string; original: string } | null =
        null;
      let timings = { firstTokenAt: null as number | null, firstSentenceAt: null as number | null };

      try {
        for await (const event of streamVoiceTurn({
          session,
          history,
          message: latest,
          vehicle,
          guardContext,
          formState: JSON.stringify(formState.data ?? {}),
          model: settings.model,
          // Shorter than text. A spoken paragraph is tiring, and a
          // shorter reply is less surface for a guard to have to catch.
          maxTokens: Math.min(settings.maxOutputTokens, VOICE_MAX_TOKENS),
        })) {
          if (event.type === "sentence") {
            spoken = `${spoken}${spoken ? " " : ""}${event.text}`;
            controller.enqueue(
              encoder.encode(sseChunk(delta(`${event.text} `))),
            );
          } else if (event.type === "blocked") {
            blocked = {
              rule: event.rule,
              matched: event.matched,
              original: event.original,
            };
            const deflection = event.replacement.replace(
              /\{\{OFFER_HOURS\}\}/g,
              String(PROMISES.offerWithinHours),
            );
            // Nothing more of the model's turn is released. The seller
            // hears the deflection after whatever was already safe.
            for (const sentence of sentences(deflection)) {
              controller.enqueue(
                encoder.encode(sseChunk(delta(`${sentence} `))),
              );
            }
            spoken = `${spoken}${spoken ? " " : ""}${deflection}`;
          } else if (event.type === "finished") {
            timings = {
              firstTokenAt: event.firstTokenAt,
              firstSentenceAt: event.firstSentenceAt,
            };
          }
        }
      } catch (error) {
        console.error("[agent] voice turn failed:", error);
        const apology =
          "I've dropped out for a moment. The form still works, and a person will call you.";
        controller.enqueue(encoder.encode(sseChunk(delta(apology))));
        spoken = spoken || apology;
      }

      console.warn(
        `[agent] voice turn ttft=${timings.firstTokenAt ?? "n/a"}ms ` +
          `ttfs=${timings.firstSentenceAt ?? "n/a"}ms blocked=${blocked?.rule ?? "no"}`,
      );

      if (blocked) {
        await db().from("agent_blocks").insert({
          lead_id: session.leadId,
          conversation_id: session.conversationId,
          rule: blocked.rule,
          matched: blocked.matched,
          original: blocked.original,
          replacement: spoken,
        });
      }

      const { data: existing } = await db()
        .from("conversations")
        .select("transcript")
        .eq("id", session.conversationId)
        .maybeSingle();

      const transcript = Array.isArray(existing?.transcript)
        ? (existing.transcript as unknown[])
        : [];

      await db()
        .from("conversations")
        .update({
          mode: "voice",
          transcript: [
            ...transcript,
            { role: "user", content: latest },
            { role: "assistant", content: spoken },
          ],
          turn_count: turnCount + 1,
        })
        .eq("id", session.conversationId);

      // Only now. Closing the stream first lets the platform tear the
      // function down before these writes land — which it did: the
      // transcript came back empty from a conversation that had plainly
      // happened. The cost is the last few hundred milliseconds of the
      // response, after the seller has already heard everything.
      controller.enqueue(encoder.encode(sseChunk(finish())));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
