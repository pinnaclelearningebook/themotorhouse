import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAQ, PUBLISHED_FAQ } from "@/config/faq";

/**
 * A question the site cannot answer yet must not be asked on the page.
 *
 * On 31 October 2026 the live /faq carried three questions with
 * nothing under them. Their `answer` was null pending a decision, and
 * the page's fallback was an `<AwaitingInfo>`, which renders as a
 * dashed chip in development and as nothing in production. The dev
 * server looked fine; the live site asked "Do you buy non-runners?"
 * and then moved straight on to the next question.
 *
 * The fix is one array. `PUBLISHED_FAQ` is `FAQ` minus the null
 * answers, and both the visible list and the FAQPage schema read from
 * it — so they cannot disagree, and switching a question on is giving
 * it an answer, nothing more.
 */

const PENDING = [
  "Do you buy non-runners?",
  "Do you buy Category N or Category S write-offs?",
  "Do you take a car in part-exchange?",
];

describe("the published FAQ", () => {
  it("never carries a question without an answer", () => {
    for (const entry of PUBLISHED_FAQ) {
      expect(entry.answer, entry.question).toBeTruthy();
      expect(entry.answer.trim().length).toBeGreaterThan(20);
    }
  });

  it("keeps the undecided questions, switched off", () => {
    // Still in the source so Alex's answer is a one-line change — and
    // still absent from what a seller or a crawler sees.
    for (const question of PENDING) {
      const kept = FAQ.find((entry) => entry.question === question);
      expect(kept, `${question} removed from FAQ entirely`).toBeDefined();
      expect(kept?.answer).toBeNull();
      expect(
        PUBLISHED_FAQ.some((entry) => entry.question === question),
        `${question} is published without an answer`,
      ).toBe(false);
    }
  });

  it("is the one array both the page and the schema read", () => {
    const page = readFileSync(join("app", "(site)", "faq", "page.tsx"), "utf8");
    expect(page).toMatch(/<FaqJsonLd entries=\{PUBLISHED_FAQ\} \/>/);
    expect(page).toMatch(/PUBLISHED_FAQ\.filter\(/);
    // No second source, and no invisible fallback that reintroduces
    // the empty slot.
    expect(page).not.toMatch(/\bFAQ\.filter\(/);
    expect(page).not.toMatch(/AwaitingInfo/);

    const teaser = readFileSync(
      join("components", "sections", "FaqTeaser.tsx"),
      "utf8",
    );
    expect(teaser).toMatch(/PUBLISHED_FAQ/);
    expect(teaser).not.toMatch(/\bFAQ\.filter\(/);
  });

  it("loses nothing that was already answered", () => {
    const answered = FAQ.filter((entry) => entry.answer !== null);
    expect(PUBLISHED_FAQ.map((e) => e.question)).toEqual(
      answered.map((e) => e.question),
    );
    expect(PUBLISHED_FAQ.length).toBe(FAQ.length - PENDING.length);
  });
});
