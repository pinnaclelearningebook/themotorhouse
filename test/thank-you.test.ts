import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * We may only say we have emailed the seller when we have.
 *
 * On 12 October 2026 the thank-you page told every seller "we have
 * emailed you a confirmation" and "reply to that email with a few
 * photos", while Resend was rejecting the seller confirmation on
 * every single submission — the sending domain is not verified. The
 * first thing the site did after taking someone's details was tell
 * them to watch an inbox nothing was coming to.
 *
 * Two things are checked, because either alone would miss it.
 *
 * The first is that no seller-facing surface states the claim
 * unconditionally. That is a text scan, and a text scan cannot tell
 * a claim inside an `if` from one outside it — so the second checks
 * the mechanism: the page reads the recorded outcome, the action
 * records it, and the sender reports whether it actually sent.
 *
 * `agent/` is in scope. Maya says nothing about email today, and this
 * is where that would first go wrong.
 */

const CLAIMS = [
  /\bwe(?:'ve| have)\s+emailed\b/i,
  /\bemailed\s+you\b/i,
  /\bcheck\s+your\s+(?:inbox|email)\b/i,
  /\breply\s+to\s+(?:that|this|the)\s+email\b/i,
];

const DIRS = ["app", "components", "agent", "content"];
const EXT = new Set([".ts", ".tsx", ".md", ".mdx"]);

/** The one file allowed to contain the claim: the page that gates it. */
const GATED = join("app", "(site)", "valuation", "thank-you", "page.tsx");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXT.has(extname(full))) out.push(full);
  }
  return out;
}

function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("telling the seller we emailed them", () => {
  it("is not stated unconditionally anywhere a seller can read", () => {
    const files = DIRS.flatMap(walk).filter((f) => f !== GATED);
    expect(files.length, "no files scanned — the paths are wrong").toBeGreaterThan(40);

    const hits: string[] = [];
    for (const file of files) {
      const text = withoutComments(readFileSync(file, "utf8"));
      for (const rule of CLAIMS) {
        const m = rule.exec(text);
        if (m) {
          hits.push(`${file}: …${text.slice(Math.max(0, m.index - 50), m.index + 70).replace(/\s+/g, " ")}…`);
          break;
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("is gated on the recorded outcome where it does appear", () => {
    const page = readFileSync(GATED, "utf8");
    // The claim is there — it is correct copy when an email exists.
    expect(page, "the email wording should still exist, behind the gate").toMatch(
      /reply to that email/i,
    );
    // And it is chosen, not stated.
    expect(page).toMatch(/readThankYouState/);
    expect(page).toMatch(/confirmation === "sent"/);
    // The fallback must not mention an email at all.
    const fallback = page.slice(
      page.indexOf("const NO_EMAIL_CARDS"),
      page.indexOf("export default"),
    );
    expect(fallback.length).toBeGreaterThan(100);
    expect(fallback, "the no-email branch must not mention email").not.toMatch(/\bemail\b/i);
  });

  it("is recorded only when Resend actually accepted the message", () => {
    const email = readFileSync("lib/email.ts", "utf8");
    const action = readFileSync("app/actions/valuation.ts", "utf8");
    // Resolving is not sending: no address and no config both resolve.
    expect(email).toMatch(/sendSellerConfirmation\([\s\S]{0,80}Promise<boolean>/);
    expect(email).toMatch(/if \(!submission\.email\) return false;/);
    // So the action requires the value, not just the status.
    expect(action).toMatch(/seller\.status === "fulfilled" && seller\.value === true/);
    expect(action).toMatch(/recordThankYouState/);
  });

  it("treats an unknown outcome as no email", () => {
    const lib = readFileSync("lib/thank-you-state.ts", "utf8");
    // Anything that is not an explicit "sent" or "failed" is unknown…
    expect(lib).toMatch(/confirmation === "sent" \|\| confirmation === "failed"/);
    // …and the page's only positive branch is an explicit "sent".
    const page = readFileSync(GATED, "utf8");
    expect(page).not.toMatch(/confirmation !== "failed"/);
  });

  it("names the channel the seller chose, and still promises the call", () => {
    const page = readFileSync(GATED, "utf8");
    // One opening card per method, so nobody is told the wrong channel.
    for (const method of ["call", "whatsapp", "sms", "email"]) {
      expect(page, `no opening card for ${method}`).toMatch(
        new RegExp(`^\\s*${method}: \\{`, "m"),
      );
    }
    // Choosing email changes the channel, not the promise: the offer
    // still comes from a person on the phone (CLAUDE.md section 9).
    const emailCard = page.slice(page.indexOf("  email: {"), page.indexOf("};", page.indexOf("  email: {")));
    expect(emailCard, "the email branch must still promise the call").toMatch(
      /a person will also call you on the number you gave/i,
    );
    // And an unknown method claims no channel at all.
    expect(page).toMatch(/UNKNOWN_FIRST_CARD/);
  });

  it("catches the wording it was written for", () => {
    const caught = [
      "We've emailed you a confirmation.",
      "We have emailed you a copy.",
      "Check your inbox for a confirmation.",
      "Reply to that email with a few photos.",
    ];
    for (const sample of caught) {
      expect(CLAIMS.some((r) => r.test(sample)), `should be caught: ${sample}`).toBe(true);
    }
    const allowed = [
      "A person calls you within 2 hours with a firm number.",
      "Email",
      "So we can plan collection.",
      "Photos help, when we call.",
    ];
    for (const sample of allowed) {
      expect(CLAIMS.some((r) => r.test(sample)), `should be allowed: ${sample}`).toBe(false);
    }
  });
});
