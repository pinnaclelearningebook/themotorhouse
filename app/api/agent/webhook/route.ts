import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { db } from "@/lib/db";

/**
 * The post-call webhook, which writes nothing until it is proved genuine.
 *
 * This endpoint is public and it writes to a seller's record, so an
 * unsigned call is not a call we are interested in. Verification uses the
 * SDK's own constructEvent rather than a hand-rolled HMAC: the signature
 * format is not in the written documentation, and guessing at a scheme
 * that decides whether a stranger can write to our database is the wrong
 * place to be approximately right.
 *
 * For the record, the SDK checks an `elevenlabs-signature` header of the
 * form `t=<unix>,v0=<hex>`, HMAC-SHA256 over `${timestamp}.${rawBody}`,
 * rejecting anything older than thirty minutes.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[agent] ELEVENLABS_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // The raw body, not a parsed object: the signature covers the bytes.
  const rawBody = await request.text();
  const signature = request.headers.get("elevenlabs-signature");

  // Unsigned is rejected here rather than inside the SDK, so the refusal
  // is visible in this file: an unsigned call to an endpoint that writes
  // to a seller's record is not a call worth parsing.
  if (!signature) {
    console.error("[agent] rejected an unsigned webhook");
    return NextResponse.json({ error: "unsigned" }, { status: 401 });
  }

  let event: unknown;
  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    event = await client.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error(
      "[agent] rejected an unverified webhook:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const payload = event as {
    type?: string;
    data?: {
      conversation_id?: string;
      transcript?: { role?: string; message?: string }[];
      metadata?: { call_duration_secs?: number };
      conversation_initiation_client_data?: {
        dynamic_variables?: Record<string, unknown>;
      };
    };
  };

  if (payload.type !== "post_call_transcription") {
    // Acknowledged, deliberately ignored. Replying 200 stops ElevenLabs
    // retrying something we were never going to act on.
    return NextResponse.json({ ok: true, ignored: payload.type ?? "unknown" });
  }

  // Our own id, not theirs: theirs identifies their call, ours identifies
  // the row. It is echoed back through the extra body we set at session
  // creation.
  const ours = payload.data?.conversation_initiation_client_data
    ?.dynamic_variables?.conversationId;

  if (typeof ours !== "string") {
    console.error("[agent] webhook carried no conversation id of ours");
    return NextResponse.json({ ok: true, ignored: "no id" });
  }

  const spoken = (payload.data?.transcript ?? [])
    .filter((turn) => typeof turn.message === "string" && turn.message.length > 0)
    .map((turn) => ({
      role: turn.role === "agent" ? "assistant" : "user",
      content: turn.message as string,
    }));

  const { error } = await db()
    .from("conversations")
    .update({
      // Their transcript is the record of the audio. Ours, written turn
      // by turn in /api/agent/llm, is what passed the guards — they
      // should agree, and a disagreement is worth seeing, so this is
      // stored alongside rather than over the top.
      voice_transcript: spoken,
      ended_at: new Date().toISOString(),
    })
    .eq("id", ours);

  if (error) {
    console.error("[agent] could not store the voice transcript:", error.message);
    return NextResponse.json({ error: "could not store" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
