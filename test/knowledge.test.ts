import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { knowledgeBase, knowledgeAsText } from "@/agent/knowledge";
import { FAQ } from "@/config/faq";
import { runGuards } from "@/agent/guards";

/**
 * The knowledge base may contain only what the site already says.
 *
 * Deriving it from config/faq.ts removes most of the risk, but not all:
 * the two hand-written pages quote published copy, and a quote can rot
 * when the page it came from is edited. These tests fail the build in that
 * case, rather than leaving Maya confidently reciting last month's policy.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("knowledge base", () => {
  it("carries every answered FAQ entry and no unanswered one", () => {
    const answered = FAQ.filter((e) => e.answer !== null);
    const pending = FAQ.filter((e) => e.answer === null);

    const titles = knowledgeBase().map((p) => p.title);
    for (const entry of answered) expect(titles).toContain(entry.question);
    for (const entry of pending) expect(titles).not.toContain(entry.question);
  });

  it("gives every page a source", () => {
    for (const page of knowledgeBase()) {
      expect(page.source, `${page.id} has no source`).toBeTruthy();
      expect(page.body.trim().length).toBeGreaterThan(0);
    }
  });

  it("quotes only promises that are published", () => {
    // The no-deductions line is the largest type on /how-it-works; the
    // seven-day validity carries its proviso there too. If either is
    // reworded on the page, this fails and the knowledge page must follow.
    const howItWorks = read("app/(site)/how-it-works/page.tsx");
    expect(howItWorks).toContain("No deductions");
    expect(howItWorks).toContain("stands for seven days");
  });

  it("says any car of any age, as the site does", () => {
    const header = read("components/ui/Header.tsx");
    expect(header).toContain("Any car, any age");
    expect(knowledgeAsText()).toMatch(/any car, of any age/i);
  });

  it("never promises a provenance report, which is unpublished", () => {
    // The intent is in CLAUDE.md section 4 but reached no page, so it is
    // not ours to offer. See the prompt's published-promises list.
    expect(knowledgeAsText()).not.toMatch(/\b(HPI|provenance)\b/i);
  });

  it("passes its own guards", () => {
    // Anything here can be repeated to a seller verbatim, so it must not
    // contain a price, a frequency claim or an internal routing term.
    for (const page of knowledgeBase()) {
      for (const sentence of page.body.split("\n").filter(Boolean)) {
        const result = runGuards(sentence, {});
        expect(
          result.ok,
          `${page.id} would be blocked: ${result.ok ? "" : result.matched}`,
        ).toBe(true);
      }
    }
  });
});
