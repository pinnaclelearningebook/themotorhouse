import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * ElevenLabs, which does transport and nothing else.
 *
 * It holds the microphone, the speech-to-text and the text-to-speech. The
 * brain stays here: their agent is configured with a Custom LLM pointing
 * at /api/agent/llm, so every voice turn runs the same prompt, the same
 * guards, the same tools and the same kill switch as a text turn. That is
 * the only arrangement where the two modes cannot drift apart, and the
 * only one where a guard sees what is about to be spoken.
 *
 * The API key never leaves the server. The browser receives a signed
 * conversation URL, which is short-lived and scoped to one conversation.
 */

const API = "https://api.elevenlabs.io/v1";

export function isVoiceConfigured(): boolean {
  return Boolean(
    process.env.ELEVENLABS_API_KEY &&
      process.env.ELEVENLABS_AGENT_ID &&
      process.env.AGENT_LLM_SECRET,
  );
}

export function voiceUnavailableReason(): string | null {
  if (!process.env.ELEVENLABS_API_KEY) return "ELEVENLABS_API_KEY is not set.";
  if (!process.env.ELEVENLABS_AGENT_ID) return "ELEVENLABS_AGENT_ID is not set.";
  if (!process.env.AGENT_LLM_SECRET) {
    return "AGENT_LLM_SECRET is not set, so the custom LLM endpoint would be open.";
  }
  return null;
}

/**
 * Does this request carry our shared secret?
 *
 * ElevenLabs sends the custom LLM's stored "API key" as a bearer token,
 * which is the documented way to authenticate an OpenAI-compatible
 * server. Compared in constant time: a comparison that returns early on
 * the first wrong byte leaks the secret one byte at a time to anyone
 * willing to measure.
 */
export function hasLlmSecret(authorization: string | null): boolean {
  const expected = process.env.AGENT_LLM_SECRET;
  if (!expected) return false;

  const presented = (authorization ?? "").replace(/^Bearer\s+/i, "");
  if (presented.length === 0) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which is itself a leak
  // of the length; comparing a fixed-size digest would avoid even that,
  // but the length of a random secret is not the part worth protecting.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** A short-lived URL the browser may open. Never the API key itself. */
export async function signedConversationUrl(): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!key || !agentId) return null;

  const response = await fetch(
    `${API}/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    console.error(
      "[agent] signed url failed:",
      response.status,
      (await response.text()).slice(0, 200),
    );
    return null;
  }

  const body = (await response.json()) as { signed_url?: string };
  return body.signed_url ?? null;
}

/** Point the agent's LLM at our endpoint. Used by scripts/configure-voice.mjs. */
export async function updateAgentLlm(opts: {
  llmUrl: string;
  secretId: string;
}): Promise<{ ok: boolean; detail: string }> {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!key || !agentId) return { ok: false, detail: "not configured" };

  const response = await fetch(`${API}/convai/agents/${agentId}`, {
    method: "PATCH",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            llm: "custom-llm",
            custom_llm: {
              url: opts.llmUrl,
              model_id: "the-motor-house",
              api_key: { secret_id: opts.secretId },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const detail = (await response.text()).slice(0, 400);
  return { ok: response.ok, detail };
}
