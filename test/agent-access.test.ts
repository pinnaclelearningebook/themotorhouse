import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decideAgentMode } from "@/lib/agent/access";

/**
 * Who Maya runs for.
 *
 * The one row that matters is a visitor who is not an admin while
 * agent_enabled is false: they get nothing, from the page and from every
 * endpoint. That is the promise the admin preview must not cost us —
 * production carries an assistant that is off, and an operator being
 * able to see her has to leave a seller seeing exactly what they saw
 * before.
 *
 * The decision is a pure function so this can be asserted directly
 * rather than through mocked cookies and a mocked Postgres. The second
 * half of the file checks that nothing answers the question on its own
 * instead of asking it.
 */

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("the agent access decision", () => {
  const up = { available: true };

  it("gives a seller nothing while the switch is false", () => {
    expect(decideAgentMode({ ...up, enabled: false, isAdmin: false })).toBe("off");
  });

  it("gives a signed-in admin a preview while the switch is false", () => {
    expect(decideAgentMode({ ...up, enabled: false, isAdmin: true })).toBe("preview");
  });

  it("gives everyone the real thing once the switch is true", () => {
    expect(decideAgentMode({ ...up, enabled: true, isAdmin: false })).toBe("live");
    // Not "preview": an admin on a live site is talking to the same Maya
    // a seller is, and that conversation is not a test.
    expect(decideAgentMode({ ...up, enabled: true, isAdmin: true })).toBe("live");
  });

  it("offers her to nobody when she is not answering", () => {
    /**
     * A key that exists is not a key with credit on it. When the model
     * is failing, the launcher invites a seller in and then apologises
     * — so it is not offered at all, to anyone, including an admin
     * previewing. A preview of a broken assistant previews nothing.
     */
    const down = { available: false };
    expect(decideAgentMode({ ...down, enabled: true, isAdmin: true })).toBe("off");
    expect(decideAgentMode({ ...down, enabled: true, isAdmin: false })).toBe("off");
    expect(decideAgentMode({ ...down, enabled: false, isAdmin: true })).toBe("off");
  });

  it("asks whether she is configured and answering", () => {
    const access = read("lib/agent/access.ts");
    expect(access).toMatch(/available: isAgentConfigured\(\) && isAgentHealthy\(\)/);
  });

  it("marks preview conversations and nothing else", () => {
    const access = read("lib/agent/access.ts");
    expect(access).toMatch(/adminTest: mode === "preview"/);
  });

  it("reaches the dev bypass only through the one guarded definition", () => {
    // The cheap pre-check looks for a Supabase auth cookie, and the
    // bypass sets none, so it has to be asked about separately. It is
    // asked about by calling the predicate in lib/admin/auth, which is
    // behind the NODE_ENV check and therefore dead in any build — not by
    // a second copy of the condition here.
    const access = read("lib/agent/access.ts");
    expect(access).toMatch(/if \(adminDevBypass\(\)\) return true;/);
    expect(access).not.toMatch(/ADMIN_DEV_BYPASS/);
    expect(access).not.toMatch(/NODE_ENV/);
  });

  it("does not ask who the visitor is unless it changes the answer", () => {
    // /valuation is public and on the critical path. currentAdmin() is a
    // Supabase getUser() plus an admin_users lookup, and for an
    // anonymous visitor the answer is no every time. No Supabase auth
    // cookie, no question asked.
    const access = read("lib/agent/access.ts");
    expect(access).toMatch(/mightBeAdmin/);
    expect(access).toMatch(/\^sb-\.\+-auth-token/);
    const cheapAt = access.search(/!\(await mightBeAdmin\(\)\)/);
    const realAt = access.search(/await currentAdmin\(\)/);
    expect(cheapAt).toBeGreaterThan(-1);
    expect(cheapAt).toBeLessThan(realAt);
  });
});

describe("nothing decides for itself whether Maya is on", () => {
  /**
   * Every seller-facing door, and the page that offers them. Each one of
   * these used to read settings.enabled on its own, which was fine while
   * there was one way to be allowed. With two, a door that keeps its own
   * copy of the rule is a door the page never offered.
   */
  const DOORS = [
    "app/api/agent/session/route.ts",
    "app/api/agent/chat/route.ts",
    "app/api/agent/notes/route.ts",
    "app/api/agent/voice-session/route.ts",
  ];

  for (const door of DOORS) {
    it(`${door} asks lib/agent/access`, () => {
      const code = read(door);
      expect(code).toMatch(/agentAccess\(\)/);
      expect(code).toMatch(/mode === "off"/);
      // The old gate, which answers a different question now.
      expect(code).not.toMatch(/!settings\.enabled/);
    });
  }

  it("the valuation page offers the widget from the same decision", () => {
    const page = read("app/(site)/valuation/page.tsx");
    expect(page).toMatch(/agentAccess\(\)/);
    expect(page).toMatch(/agentEnabled=\{mode !== "off"\}/);
    expect(page).toMatch(/agentPreview=\{mode === "preview"\}/);
    expect(page).not.toMatch(/agentSettings/);
  });

  it("the refusal comes before anything is spent", () => {
    // Order, not just presence. A gate below the model call stops Maya
    // replying without stopping her costing.
    const chat = read("app/api/agent/chat/route.ts");
    const gateAt = chat.search(/if \(mode === "off"\)/);
    const modelAt = chat.search(/await runTurn\(/);
    expect(gateAt).toBeGreaterThan(-1);
    expect(gateAt).toBeLessThan(modelAt);
  });

  it("the widget is told it is a preview and decides nothing", () => {
    // Display only. A client prop that could grant access would be a
    // prop a seller can set.
    const widget = read("components/agent/AgentWidget.tsx");
    expect(widget).toMatch(/preview\?: boolean/);
    expect(widget).toMatch(/Admin preview — \{AGENT\.name\} is off for the public/);
    expect(widget).not.toMatch(/admin_test|adminTest/);
    // Rendered in both states — the closed launcher and the open panel —
    // so neither can be mistaken for what a seller is being shown.
    const launcherAt = widget.search(/view === "launcher"/);
    const labels = [...widget.matchAll(/\{preview && /g)].map((m) => m.index ?? -1);
    expect(labels.length, "the preview label renders in one place only").toBe(2);
    expect(labels[0]).toBeGreaterThan(launcherAt);
  });

  it("keeps plate yellow off the preview label", () => {
    // CLAUDE.md section 5: the registration input and nowhere else.
    const widget = read("components/agent/AgentWidget.tsx");
    expect(widget).not.toMatch(/plate/);
  });
});

describe("when the model stops answering", () => {
  /**
   * Three failed turns in a row and she is no longer offered, for five
   * minutes. The form is untouched throughout — that is the whole point
   * of her being optional.
   */
  it("trips after three consecutive failures and recovers on a success", async () => {
    const { recordAgentFailure, recordAgentSuccess, isAgentHealthy, resetAgentHealth } =
      await import("@/lib/agent/health");

    resetAgentHealth();
    expect(isAgentHealthy()).toBe(true);

    recordAgentFailure();
    recordAgentFailure();
    expect(isAgentHealthy(), "two failures is not a pattern").toBe(true);

    recordAgentFailure();
    expect(isAgentHealthy(), "three in a row is").toBe(false);

    // A turn that works clears it immediately — no waiting out a
    // cool-off for a service that has come back.
    recordAgentSuccess();
    expect(isAgentHealthy()).toBe(true);

    resetAgentHealth();
  });

  it("counts a failed turn in the chat endpoint, and a good one too", () => {
    const chat = read("app/api/agent/chat/route.ts");
    const failAt = chat.search(/recordAgentFailure\(\)/);
    const okAt = chat.search(/recordAgentSuccess\(\)/);
    expect(failAt, "a failed turn must be counted").toBeGreaterThan(-1);
    expect(okAt, "a good turn must clear the count").toBeGreaterThan(-1);
    // The failure is recorded inside the catch, before the 503.
    const caught = chat.slice(chat.indexOf("} catch (error) {"));
    expect(caught).toMatch(/recordAgentFailure\(\)/);
  });

  it("hides her rather than announcing it", () => {
    /**
     * Hidden, not "chat unavailable". There is no launcher-level copy
     * for a broken assistant, because the launcher is not rendered when
     * she is one — the page asks lib/agent/access and gets "off".
     *
     * The one apology that does exist lives inside the open panel and is
     * for a different case: a seller who is already talking when a turn
     * fails. They have seen her, so saying nothing would be worse.
     */
    const widget = read("components/agent/AgentWidget.tsx");
    expect(widget).not.toMatch(/chat unavailable/i);

    const inPanelApology = /isn&apos;t available right now/;
    expect(inPanelApology.test(widget), "the in-panel apology still exists").toBe(true);
    // And it is reachable only once the panel is open.
    const unavailableAt = widget.search(inPanelApology);
    const panelAt = widget.search(/view === "launcher"/);
    expect(unavailableAt).toBeGreaterThan(panelAt);

    // The launcher itself is gated on the mode, not on a message.
    const page = read("app/(site)/valuation/page.tsx");
    expect(page).toMatch(/agentEnabled=\{mode !== "off"\}/);
  });
});
