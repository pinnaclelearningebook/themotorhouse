import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveSession } from "@/lib/agent/session";
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

export async function POST() {
  const settings = await agentSettings();
  if (!settings.enabled) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (!isVoiceConfigured()) {
    console.error("[agent] voice:", voiceUnavailableReason());
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }

  // Consent is recorded before the URL exists, not after it is used.
  const consentAt = new Date().toISOString();
  const { error } = await db()
    .from("conversations")
    .update({ mode: "voice", consent_recorded_at: consentAt })
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
    // Echoed back to us on every custom-LLM call so the turn can be tied
    // to this conversation.
    conversationId: session.conversationId,
  });
}
