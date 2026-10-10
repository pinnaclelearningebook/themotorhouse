import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { agentSettings } from "@/lib/agent/settings";
import { hasLlmSecret } from "@/lib/agent/voice";
import { streamVoiceTurn } from "@/lib/agent/run";
import { sentences, claimsARecord } from "@/agent/guards";
import { loadVoiceContext } from "@/lib/agent/voice-context";
import { extractAndWriteNotes } from "@/lib/agent/notes";
import { PROMISES } from "@/config/site";

/**
 * The brain for voice: an OpenAI-compatible endpoint ElevenLabs calls for
 * every turn.
 *
 * An optional catch-all, so it answers at `/api/agent/llm` and at
 * whatever ElevenLabs appends to it. Their documentation says the server
 * must implement `/v1/chat/completions`, which means the URL in the agent
 * config is a base and the real request goes to
 * `/api/agent/llm/v1/chat/completions`. That path did not exist, so every
 * spoken turn 404'd before reaching any of this — and a 404 on a route
 * that is not there leaves no function log, which is why the failure
 * looked like nothing happening at all.
 *
 * A third party decides that path, and may change it, so this handler
 * answers at any of them and logs which one was used.
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
const VOICE_MAX_TOKENS = 90;

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

/**
 * The first chunk, carrying the role and no content.
 *
 * This is what OpenAI sends first, and here it has a second job: the
 * response headers do not leave the platform until the stream produces
 * its first bytes, so without it ElevenLabs waited on headers for as
 * long as the model took — 2.4s warm, 4.1s cold, measured — and gave up
 * at about 2.3s every time with "Failed to generate response from custom
 * LLM". The server-side timings looked fine throughout (ttft 787ms,
 * ttfs 1113ms) because they measure the model, not the socket.
 *
 * Sent before anything is known about the turn, so it cannot leak
 * anything: it is a role and an empty delta.
 */
function opening() {
  return {
    id: "tmh",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "the-motor-house",
    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
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
      controller.enqueue(encoder.encode(sseChunk(opening())));
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

export async function POST(
  request: NextRequest,
  route: { params: Promise<{ openai?: string[] }> },
) {
  // The shared secret first: an unauthenticated caller must not be able
  // to learn whether Maya is switched on, let alone spend a model call.
  if (!hasLlmSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Which path they actually used, so a change on their side shows up
  // here as a line in the log rather than as silence.
  const { openai } = await route.params;
  console.warn(
    `[agent] voice turn at /api/agent/llm${openai?.length ? `/${openai.join("/")}` : ""}`,
  );

  const settings = await agentSettings();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const conversationId = parsed.data.elevenlabs_extra_body?.conversationId;
  if (!conversationId) {
    /**
     * Logged, with the shape that arrived, because this is the one
     * failure here that nothing else can see.
     *
     * The only caller is ElevenLabs. When their client sends no
     * conversation id — the wrong SDK option name, or the agent not
     * permitted to override the extra body — the seller hears the
     * opening line and then silence, and all our side had was a 400
     * with nothing saying whose fault it was.
     */
    console.error(
      "[agent] voice turn with no conversation id. body keys:",
      Object.keys(parsed.data).join(","),
      "| extra body:",
      JSON.stringify(parsed.data.elevenlabs_extra_body ?? null),
    );
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

  // Everything about the car, assembled once. No tool round-trips.
  const context = await loadVoiceContext(session);

  const encoder = new TextEncoder();

  /**
   * Note extraction runs beside the reply, not inside it.
   *
   * Started here so it overlaps the model turn the seller is waiting on.
   * It is awaited before the stream closes, which costs nothing when it
   * finishes first and bounds the function's life when it does not.
   */
  const extraction = extractAndWriteNotes({
    session,
    message: latest,
    model: settings.model,
  }).catch((error) => {
    console.error("[agent] note extraction failed:", error);
    return { written: [] as string[], note: false };
  });

  /**
   * Released sentence by sentence, each one checked against everything
   * said so far in the turn. Speech starts as soon as the first sentence
   * is safe rather than when the whole turn is finished.
   */
  /**
   * What the turn produced, handed to the work that runs after it.
   *
   * ElevenLabs will not wait for the response to finish while we write
   * to the database. Every conversation died at about two and a half
   * seconds: the sentences and the terminator were out by ~1.3s, and the
   * body did not complete until the note extraction — a second model
   * call — and four round trips had finished at ~2.7s.
   *
   * Closing the stream before the writes was the original bug, because
   * the platform then tore the function down and the transcript came
   * back empty from a conversation that had plainly happened. after() is
   * the answer to both: the stream closes the moment the seller has
   * everything, and the platform keeps the function alive for the rest.
   */
  interface Outcome {
    spoken: string;
    blocked: { rule: string; matched: string; original: string } | null;
    timings: { firstTokenAt: number | null; firstSentenceAt: number | null };
  }
  let settle: (value: Outcome) => void = () => {};
  const outcome = new Promise<Outcome>((resolve) => {
    settle = resolve;
  });

  const stream = new ReadableStream({
    async start(controller) {
      // First, so the headers reach ElevenLabs now rather than whenever
      // the model finishes thinking.
      controller.enqueue(encoder.encode(sseChunk(opening())));

      let spoken = "";
      let blocked: { rule: string; matched: string; original: string } | null =
        null;
      let timings = { firstTokenAt: null as number | null, firstSentenceAt: null as number | null };

      try {
        for await (const event of streamVoiceTurn({
          session,
          history,
          message: latest,
          contextText: context.text,
          guardContext: context.guard,
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

      // Everything the seller needs, and nothing held open.
      controller.enqueue(encoder.encode(sseChunk(finish())));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
      settle({ spoken, blocked, timings });
    },
  });

  /**
   * The record of the turn, written after the response instead of inside
   * it.
   */
  after(async () => {
    const { spoken, blocked, timings } = await outcome;
    const notes = await extraction;
    console.warn(
      `[agent] voice turn ttft=${timings.firstTokenAt ?? "n/a"}ms ` +
        `ttfs=${timings.firstSentenceAt ?? "n/a"}ms ` +
        `blocked=${blocked?.rule ?? "no"} ` +
        `wrote=${notes.written.join("|") || "nothing"}`,
    );

    /**
     * She said she wrote it down, and nothing was written.
     *
     * The notes step runs beside the reply, so the model never learns
     * whether the write landed before it speaks. When it claims one
     * that did not happen, an operator rings a lead expecting a figure
     * that is not there — so the turn goes to review rather than being
     * found out loud later.
     */
    const claimed = claimsARecord(spoken);
    if (!blocked && claimed && notes.written.length === 0 && !notes.note) {
      await db().from("agent_blocks").insert({
        lead_id: session.leadId,
        conversation_id: session.conversationId,
        rule: "claim-without-write",
        matched: claimed,
        original: spoken,
        // Nothing was replaced: the seller heard this.
        replacement: spoken,
      });
    }

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
      .select("transcript, turn_count")
      .eq("id", session.conversationId)
      .maybeSingle();

    const transcript = Array.isArray(existing?.transcript)
      ? (existing.transcript as unknown[])
      : [];

    /**
     * Counted from what is stored, not from what this request read.
     *
     * The count was taken at the top of the handler and written here,
     * after the response. A seller speaking again before the previous
     * turn's write landed gave both turns the same base, so the count
     * stopped short of the transcript — five spoken turns, ten entries,
     * turn_count four. It is what the turn cap is judged on.
     */
    const counted = (existing?.turn_count as number) ?? turnCount;

    await db()
      .from("conversations")
      .update({
        mode: "voice",
        transcript: [
          ...transcript,
          { role: "user", content: latest },
          { role: "assistant", content: spoken },
        ],
        turn_count: counted + 1,
      })
      .eq("id", session.conversationId);
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
