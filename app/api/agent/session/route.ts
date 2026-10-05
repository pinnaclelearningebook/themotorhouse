import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/agent/session";
import { agentSettings } from "@/lib/agent/settings";
import { checkRateLimit, AGENT_WINDOWS } from "@/lib/rate-limit";

/**
 * Open a conversation.
 *
 * Takes the lead and vehicle the widget is sitting beside. Both are
 * checked to exist before a session is issued, so a fabricated id cannot
 * create a conversation attached to someone else's record — and the token
 * this returns, not the ids, is what authorises everything afterwards.
 */

const bodySchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  vehicleId: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const settings = await agentSettings();
  if (!settings.enabled) {
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

  const session = await createSession({
    leadId: parsed.data.leadId ?? null,
    vehicleId: parsed.data.vehicleId ?? null,
  });

  if (!session) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ conversationId: session.conversationId });
}
