import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, endSession } from "@/lib/agent/session";
import { agentAccess } from "@/lib/agent/access";
import { checkRateLimit, AGENT_WINDOWS } from "@/lib/rate-limit";
import { openingLine } from "@/lib/agent/greeting";
import { titleCaseVehicle } from "@/lib/format";

/**
 * Open a conversation.
 *
 * The conversation starts against a vehicle, resolved here from the
 * registration rather than passed in as an id. No lead is attached yet:
 * that happens through /api/agent/notes once the form has created one and
 * the browser can prove it. The token this issues, not any id in a body,
 * is what authorises every later turn.
 */

/**
 * Only a registration. Deliberately no lead id and no vehicle id: an id
 * accepted here would be an id taken on trust, and the lead is attached
 * later through /api/agent/notes, which checks the browser actually
 * created it.
 */
const bodySchema = z.object({
  reg: z.string().trim().min(2).max(10).optional(),
});

export async function POST(request: NextRequest) {
  // live for everyone, preview for an admin, off for a seller while the
  // switch is false. The page and this endpoint read the same decision,
  // so there is no door the widget never offered.
  const { mode, adminTest } = await agentAccess();
  if (mode === "off") {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await checkRateLimit("agent-session", ip, AGENT_WINDOWS);
  if (!limit.ok) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Resolve the vehicle ourselves. A missing row is fine — Maya works
  // with no vehicle context and says so rather than guessing.
  let vehicleId: string | null = null;
  let vehicleName: string | null = null;
  if (parsed.data.reg) {
    const { data } = await db()
      .from("vehicles")
      .select("id, make, model")
      .eq("reg", parsed.data.reg.toUpperCase().replace(/\s+/g, ""))
      .maybeSingle();
    vehicleId = (data?.id as string) ?? null;
    const named = [data?.make, data?.model]
      .filter((part): part is string => Boolean(part))
      .map(titleCaseVehicle)
      .join(" ");
    vehicleName = named || null;
  }

  // Written into the transcript, not only returned, so the model's
  // history starts where the seller's screen does.
  const opening = openingLine(vehicleName);

  const session = await createSession({
    leadId: null,
    vehicleId,
    adminTest,
    opening,
  });

  if (!session) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    conversationId: session.conversationId,
    opening,
  });
}

/**
 * End the conversation.
 *
 * The panel's close control, as opposed to its minimise control. Clearing
 * the screen alone would leave the cookie pointing at a live row, so the
 * next conversation would continue the last one's transcript and the
 * model would answer with a history the seller thinks they threw away.
 *
 * Needs no access check: it can only end the conversation this browser's
 * own cookie names, and ending one is not something to protect.
 */
export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
