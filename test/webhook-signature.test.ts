import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * The post-call webhook's signature check.
 *
 * This endpoint is public and writes to a seller's record, so being
 * approximately right about the scheme is not good enough. The route uses
 * the SDK's constructEvent; these tests pin the behaviour we are relying
 * on, so an SDK upgrade that changed it would fail here rather than
 * silently start accepting forgeries.
 */

const SECRET = "whsec_test_only_not_a_real_secret";
const client = new ElevenLabsClient({ apiKey: "test" });

function sign(body: string, secret = SECRET, at = Date.now()) {
  const timestamp = Math.floor(at / 1000);
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v0=${digest}`;
}

const BODY = JSON.stringify({
  type: "post_call_transcription",
  data: { conversation_id: "abc", transcript: [] },
});

describe("post-call webhook signatures", () => {
  it("accepts a correctly signed body", async () => {
    const event = await client.webhooks.constructEvent(BODY, sign(BODY), SECRET);
    expect((event as { type: string }).type).toBe("post_call_transcription");
  });

  it("rejects a body that was altered after signing", async () => {
    // The whole point: someone replaying a real signature with their own
    // payload must not be able to write to a lead.
    const tampered = BODY.replace("abc", "someone-elses-conversation");
    await expect(
      client.webhooks.constructEvent(tampered, sign(BODY), SECRET),
    ).rejects.toThrow();
  });

  it("rejects a signature made with a different secret", async () => {
    await expect(
      client.webhooks.constructEvent(BODY, sign(BODY, "wrong-secret"), SECRET),
    ).rejects.toThrow();
  });

  it("rejects a missing signature", async () => {
    await expect(
      client.webhooks.constructEvent(BODY, "", SECRET),
    ).rejects.toThrow();
  });

  it("rejects a stale timestamp", async () => {
    // Replay protection: an hour old is outside the tolerance.
    const old = Date.now() - 60 * 60 * 1000;
    await expect(
      client.webhooks.constructEvent(BODY, sign(BODY, SECRET, old), SECRET),
    ).rejects.toThrow();
  });

  it("rejects a header without the v0 scheme", async () => {
    await expect(
      client.webhooks.constructEvent(
        BODY,
        `t=${Math.floor(Date.now() / 1000)}`,
        SECRET,
      ),
    ).rejects.toThrow();
  });
});
