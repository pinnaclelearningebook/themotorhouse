import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveSession, createSession } from "@/lib/agent/session";
import { currentAdmin } from "@/lib/admin/auth";
import { agentSettings } from "@/lib/agent/settings";
import {
  signedConversationUrl,
  isVoiceConfigured,
  voiceUnavailableReason,
} from "@/lib/agent/voice";

/**
 * Open the microphone, once consent is recorded.
 *
 * Two things this deliberately does not do. It does not return the
 * ElevenLabs API key — the browser gets a short-lived signed URL scoped
 * to one conversation, and nothing else. And it does not issue that URL
 * until consent is written to the conversation row.
 *
 * The consent gate is here rather than in the widget because ElevenLabs
 * speaks its configured first message as soon as a session opens, before
 * our server is involved in the exchange at all. If the session could be
 * opened before consent, the first thing a seller heard would be a voice
 * they had not agreed to. Holding the URL back is the only point where
 * that can actually be prevented.
 */

export async function POST(request: Request) {
  const settings = await agentSettings();

  /**
   * The admin test path.
   *
   * Testing voice on production otherwise means turning agent_enabled on,
   * which makes Maya live to every visitor for the duration. Instead a
   * signed-in, allow-listed admin may open one conversation while the
   * switch stays false. The conversation is marked, and /api/agent/llm
   * will serve it — and only it — for thirty minutes.
   *
   * currentAdmin() is the same two-gate check the dashboard uses: a
   * Supabase session, and membership of admin_users. A seller cannot
   * reach this branch.
   */
  let adminTest = false;
  if (!settings.enabled) {
    const admin = await currentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    adminTest = true;
    console.warn("[agent] admin voice test started by", admin.email);
  }

  if (!isVoiceConfigured()) {
    console.error("[agent] voice:", voiceUnavailableReason());
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  let session = await resolveSession();

  /**
   * An admin testing voice has no conversation yet.
   *
   * The normal path reaches here with one already open, because the
   * seller has been typing. An admin starting cold has not, and
   * /api/agent/session refuses while Maya is off — correctly, since it is
   * the seller-facing door. So the admin branch opens the conversation
   * here, where the caller has already been proved to be an admin.
   */
  if (!session && adminTest) {
    const body = (await request.json().catch(() => ({}))) as { reg?: string };
    let vehicleId: string | null = null;
    if (body.reg) {
      const { data } = await db()
        .from("vehicles")
        .select("id")
        .eq("reg", body.reg.toUpperCase().replace(/\s+/g, ""))
        .maybeSingle();
      vehicleId = (data?.id as string) ?? null;
    }
    // Bind the most recent lead for this car, if there is one. A test
    // conversation with no lead makes every write fail, and the failures
    // are what she then talks about instead of the car.
    let leadId: string | null = null;
    if (vehicleId) {
      const { data: lead } = await db()
        .from("leads")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      leadId = (lead?.id as string) ?? null;
    }

    const created = await createSession({ leadId, vehicleId });
    if (!created) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    session = {
      conversationId: created.conversationId,
      leadId,
      vehicleId,
      turnCount: 0,
    };
  }

  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  // Consent is recorded before the URL exists, not after it is used.
  const consentAt = new Date().toISOString();
  const { error } = await db()
    .from("conversations")
    .update({
      mode: "voice",
      consent_recorded_at: consentAt,
      admin_test: adminTest,
    })
    .eq("id", session.conversationId);

  if (error) {
    console.error("[agent] could not record consent:", error.message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const url = await signedConversationUrl();
  if (!url) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    signedUrl: url,
    adminTest,
    // Echoed back to us on every custom-LLM call so the turn can be tied
    // to this conversation.
    conversationId: session.conversationId,
  });
}
