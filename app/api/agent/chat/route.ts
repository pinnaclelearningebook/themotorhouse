import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveSession } from "@/lib/agent/session";
import { agentSettings } from "@/lib/agent/settings";
import { checkRateLimit, AGENT_WINDOWS } from "@/lib/rate-limit";
import { runGuards, type VehicleContext } from "@/agent/guards";
import { isAgentConfigured, agentUnavailableReason } from "@/agent/provider";
import { runTurn } from "@/lib/agent/run";
import { getVehicleContext, readFormState } from "@/agent/tools";
import { PROMISES } from "@/config/site";

/**
 * One assistant turn.
 *
 * The order of the checks is the design. Cheapest and most absolute
 * first: the kill switch before anything is spent, then session
 * ownership, then the per-IP limit, then the per-conversation turn cap,
 * and only then the model. Every one of those can refuse without a
 * single token being bought.
 *
 * The guard runs after the model and before the seller, which is the
 * whole reason this endpoint exists rather than a hosted widget
 * (ARCHITECTURE.md section 9). A blocked turn is stored with what the
 * model actually wrote and the seller receives the deflection instead.
 */

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const settings = await agentSettings();
  if (!settings.enabled) {
    // Fails closed. Nothing is spent and nothing is said.
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (!isAgentConfigured()) {
    console.error("[agent]", agentUnavailableReason());
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  const limit = await checkRateLimit("agent", clientIp(request), AGENT_WINDOWS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "slow down" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter ?? 60) } },
    );
  }

  if (session.turnCount >= settings.maxTurns) {
    return NextResponse.json({ error: "turn limit" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Facts about the car come only from the lookup, never from the model.
  const vehicleResult = await getVehicleContext(session);
  const vehicleData = (vehicleResult.data ?? {}) as Record<string, unknown>;
  const known = vehicleData.known === true;
  const vehicle = known
    ? {
        make: vehicleData.make as string | null,
        model: vehicleData.model as string | null,
        year: vehicleData.year_of_manufacture as number | null,
        colour: vehicleData.colour as string | null,
        fuel: vehicleData.fuel as string | null,
        // Passed to the guards as well as the prompt: without the engine
        // size, Maya reading "2996cc" off her own context was blocked as
        // a fact she had invented.
        engineCapacity: vehicleData.engine_cc as number | null,
        // So quoting the mileage off the MOT record is not treated as a
        // figure she invented.
        mileage: vehicleData.lastRecordedMileage as number | null,
      }
    : null;

  const formState = await readFormState(session);

  const { data: conversation } = await db()
    .from("conversations")
    .select("transcript")
    .eq("id", session.conversationId)
    .maybeSingle();

  const history = Array.isArray(conversation?.transcript)
    ? (conversation.transcript as { role: "user" | "assistant"; content: string }[])
    : [];

  let reply;
  try {
    reply = await runTurn({
      session,
      history,
      message: parsed.data.message,
      vehicle,
      formState: JSON.stringify(formState.data ?? {}),
      model: settings.model,
      maxTokens: settings.maxOutputTokens,
    });
  } catch (error) {
    console.error("[agent] turn failed:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // The same object, not a copy of selected fields. Rebuilding it by hand
  // is how the engine size went missing: the vehicle gained a field and
  // this list did not, so Maya was blocked for reading her own context.
  const guardContext: VehicleContext = vehicle ?? {};

  const verdict = runGuards(reply.text, guardContext);

  let outgoing: string;
  if (verdict.ok) {
    outgoing = verdict.text;
  } else {
    outgoing = verdict.replacement.replace(
      /\{\{OFFER_HOURS\}\}/g,
      String(PROMISES.offerWithinHours),
    );
    await db().from("agent_blocks").insert({
      lead_id: session.leadId,
      conversation_id: session.conversationId,
      rule: verdict.rule,
      matched: verdict.matched,
      original: verdict.original,
      replacement: outgoing,
    });
  }

  // The transcript stores what the seller actually saw. The blocked text
  // lives in agent_blocks and nowhere else, so a later read of the
  // conversation cannot resurface a number we never stood behind.
  await db()
    .from("conversations")
    .update({
      transcript: [
        ...history,
        { role: "user", content: parsed.data.message },
        { role: "assistant", content: outgoing },
      ],
      turn_count: session.turnCount + 1,
    })
    .eq("id", session.conversationId);

  return NextResponse.json({
    reply: outgoing,
    // Side effects the widget acts on: moving the form, opening the photo
    // guide. Never anything about routing, scoring or price.
    effects: reply.effects,
    turnsRemaining: Math.max(0, settings.maxTurns - (session.turnCount + 1)),
  });
}
