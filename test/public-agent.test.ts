import { describe, expect, it } from "vitest";

/**
 * What a seller gets while Maya is off, against a real deployment.
 *
 * The admin preview puts her on the public site for one kind of visitor,
 * which means the thing to prove is about the other kind: a signed-out
 * request must get exactly what it got before — no widget, and a refusal
 * at every door. Asserted over HTTP rather than by reading the source,
 * because the source is what the unit tests already cover and this is
 * the question the source cannot answer: whether the deployed build, the
 * real settings row and the real cookie check agree.
 *
 * Skipped unless E2E_PUBLIC_URL is set:
 *
 *   E2E_PUBLIC_URL=https://themotorhouse.vercel.app npx vitest run \
 *     test/public-agent.test.ts
 *
 * Needs no credentials. Being signed out is the point.
 */

const BASE = process.env.E2E_PUBLIC_URL?.replace(/\/$/, "");
const describeIf = BASE ? describe : describe.skip;

describeIf("a signed-out visitor while Maya is off", () => {
  it("is not offered her on the valuation page", async () => {
    const response = await fetch(`${BASE}/valuation`, {
      headers: { "user-agent": "tmh-verification" },
    });
    expect(response.status).toBe(200);
    const html = await response.text();

    // The button, and the label that would say she is in preview.
    expect(html).not.toMatch(/Talk to Maya/);
    expect(html).not.toMatch(/Admin preview/);

    // And the prop the form is actually given. The widget mounts only
    // after the car is confirmed, so the absence of the button on step 1
    // proves nothing on its own — this is the part that does.
    expect(html).toMatch(/"agentEnabled":false/);
    expect(html).toMatch(/"agentPreview":false/);
  });

  it("is refused a text conversation", async () => {
    const response = await fetch(`${BASE}/api/agent/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reg: "TE57VOX" }),
    });
    expect(response.status).toBe(503);
  });

  it("is refused a voice conversation", async () => {
    const response = await fetch(`${BASE}/api/agent/voice-session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reg: "TE57VOX" }),
    });
    expect(response.status).toBe(503);
  });

  it("is refused a turn", async () => {
    const response = await fetch(`${BASE}/api/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is my car worth?" }),
    });
    // 503 from the kill switch, before the missing session is even
    // looked at. Not 401: the order of the checks is the design.
    expect(response.status).toBe(503);
  });

  it("is refused the notes endpoint", async () => {
    const response = await fetch(`${BASE}/api/agent/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leadId: "00000000-0000-0000-0000-000000000000",
        notes: ["anything"],
      }),
    });
    expect(response.status).toBe(503);
  });

  it("cannot become an admin by sending a cookie that looks like one", async () => {
    // The cheap pre-check is a Supabase auth cookie being present. It
    // only earns the real currentAdmin() call; a forged one must still
    // get nothing.
    const response = await fetch(`${BASE}/api/agent/session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "sb-forged-auth-token=not-a-session",
      },
      body: JSON.stringify({ reg: "TE57VOX" }),
    });
    expect(response.status).toBe(503);
  });
});
