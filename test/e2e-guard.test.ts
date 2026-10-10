import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * The guard path, end to end, against a running server.
 *
 * Everything else about the guards is tested against fixtures, and in
 * live use the model has never tripped one — twenty-two adversarial turns
 * produced zero blocks. That is a good result and a blind spot: the path
 * from a blocked turn to the replacement the seller reads to the row on
 * /admin/review had never once executed.
 *
 * This puts a known-bad sentence where the model's output goes, using the
 * AGENT_TEST_SCRIPTED_REPLY hook, and checks the real endpoint blocks it,
 * sends the deflection instead, and records the original for review.
 *
 * Skipped unless E2E_BASE_URL is set. The SERVER must be running with
 * AGENT_DEV_FORCE_ON=1 and AGENT_TEST_SCRIPTED_REPLY set to the sentence
 * below — the "dev-scripted" entry in .claude/launch.json does both. Then:
 *
 *   npm run test:e2e-guard
 *
 * The scripted reply is the server's business, not this process's; this
 * test only needs the database credentials to read the block back.
 */

const BASE = process.env.E2E_BASE_URL;
const PRICE = "Honestly, a car like yours is worth about £28,500.";

const describeIf = BASE ? describe : describe.skip;

describeIf("the guard path, end to end", () => {
  it("blocks a priced reply, deflects, and logs the original", async () => {
    const session = await fetch(`${BASE}/api/agent/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reg: "RV23TMH" }),
    });
    expect(session.status, "session should open").toBe(200);

    const cookie = session.headers.get("set-cookie")?.split(";")[0];
    expect(cookie, "session cookie should be set").toBeTruthy();

    const chat = await fetch(`${BASE}/api/agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookie as string },
      body: JSON.stringify({ message: "What is my car worth?" }),
    });
    expect(chat.status).toBe(200);

    const body = (await chat.json()) as { reply: string };

    // The seller must not see the number, and must see the deflection.
    expect(body.reply).not.toContain("28,500");
    expect(body.reply).not.toContain("£");
    expect(body.reply).toMatch(/I'm not the one who sets the number/);

    // The original must be on record, with the rule that caught it.
    const db = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    );

    const { data: blocks } = await db
      .from("agent_blocks")
      .select("rule, matched, original, replacement")
      .order("at", { ascending: false })
      .limit(1);

    const block = blocks?.[0];
    expect(block, "a block should have been logged").toBeTruthy();
    expect(block?.rule).toBe("price");
    expect(block?.original).toBe(PRICE);
    expect(block?.replacement).toBe(body.reply);
    expect(block?.original).toContain("28,500");

    // And the transcript holds what the seller saw, never the original.
    const { data: conversations } = await db
      .from("conversations")
      .select("transcript")
      .order("started_at", { ascending: false })
      .limit(1);

    const transcript = JSON.stringify(conversations?.[0]?.transcript ?? []);
    expect(transcript).not.toContain("28,500");
    expect(transcript).toContain("I'm not the one who sets the number");
  });
});
