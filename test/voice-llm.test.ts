import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * The voice brain, called the way ElevenLabs calls it.
 *
 * ElevenLabs' servers reach /api/agent/llm with a shared secret and the
 * conversation id we gave them, and with no browser cookie of any kind.
 * So the authorisation there is the secret plus a conversation whose
 * access was decided when the session was created — live, or admin_test
 * inside the half-hour window — and a cookie check would refuse every
 * real spoken turn.
 *
 * This asserts that from the outside: a preview conversation, no cookies,
 * a reply. It also asserts the two refusals that keep it honest, since an
 * endpoint that answers everything is not authorising anything.
 *
 * Skipped unless E2E_PUBLIC_URL is set. Needs SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and AGENT_LLM_SECRET to stand in for the
 * session creation and for ElevenLabs:
 *
 *   npm run test:voice-llm
 */

const BASE = process.env.E2E_PUBLIC_URL?.replace(/\/$/, "");
const SECRET = process.env.AGENT_LLM_SECRET;
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIf = BASE && SECRET && URL_ && KEY ? describe : describe.skip;

function db() {
  return createClient(URL_ as string, KEY as string, {
    auth: { persistSession: false },
  });
}

async function previewConversation(opts: { startedAt?: string } = {}) {
  const { data: vehicle } = await db()
    .from("vehicles")
    .select("id")
    .eq("reg", "TE57VOX")
    .maybeSingle();

  const { data, error } = await db()
    .from("conversations")
    .insert({
      vehicle_id: (vehicle?.id as string) ?? null,
      mode: "voice",
      provider: "elevenlabs",
      session_token: `test-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      admin_test: true,
      ...(opts.startedAt ? { started_at: opts.startedAt } : {}),
    })
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "no conversation");
  return data.id as string;
}

async function turn(
  conversationId: string | undefined,
  opts: { secret?: string | null } = {},
) {
  const secret = opts.secret === undefined ? SECRET : opts.secret;
  return fetch(`${BASE}/api/agent/llm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      // No cookie header. That is the point of the file.
    },
    body: JSON.stringify({
      model: "the-motor-house",
      stream: true,
      messages: [
        { role: "system", content: "discarded — the prompt is ours" },
        { role: "user", content: "How can I submit this form?" },
      ],
      ...(conversationId
        ? { elevenlabs_extra_body: { conversationId } }
        : {}),
    }),
  });
}

function spoken(sse: string): string {
  return [...sse.matchAll(/"content":"((?:[^"\\]|\\.)*)"/g)]
    .map((match) => JSON.parse(`"${match[1]}"`) as string)
    .join("")
    .trim();
}

describeIf("the voice brain, with no cookies", () => {
  it("answers a preview conversation", async () => {
    const id = await previewConversation();
    const response = await turn(id);

    expect(response.status, await response.clone().text()).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);

    const body = await response.text();
    const said = spoken(body);
    expect(said.length, "nothing was spoken").toBeGreaterThan(0);
    expect(body).toMatch(/\[DONE\]/);

    // Two sentences is the spoken cap, and it is enforced in code.
    const count = (said.match(/[.!?](?:\s|$)/g) ?? []).length;
    expect(count).toBeLessThanOrEqual(2);

    // And never a price, whatever was asked.
    expect(said).not.toMatch(/£\s?\d/);
  }, 40_000);

  it("refuses a conversation that is not a preview", async () => {
    const id = await previewConversation();
    await db().from("conversations").update({ admin_test: false }).eq("id", id);
    expect((await turn(id)).status).toBe(503);
  }, 20_000);

  it("refuses a preview that has gone stale", async () => {
    // Thirty-one minutes old. Without the window an admin_test row would
    // be a permanent key to a switched-off assistant, and the id travels
    // through ElevenLabs to get here.
    const id = await previewConversation({
      startedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    });
    expect((await turn(id)).status).toBe(503);
  }, 20_000);

  it("refuses without the shared secret", async () => {
    const id = await previewConversation();
    expect((await turn(id, { secret: null })).status).toBe(401);
  }, 20_000);

  it("refuses with the secret but no conversation", async () => {
    expect((await turn(undefined)).status).toBe(400);
  }, 20_000);
});
