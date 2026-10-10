import { FAQ } from "@/config/faq";
import { PROMISES, EXPORT_MARKET, SITE } from "@/config/site";

/**
 * The grounded knowledge base.
 *
 * Built from the site's own content rather than written alongside it.
 * SESSION-PROMPTS.md says "grounded pages only, each sourced from existing
 * site copy or SOURCES.md. Nothing new that isn't already verified" — and
 * the surest way to honour that is to leave no second copy to drift.
 *
 * The FAQ pages below ARE config/faq.ts. Change an answer on the site and
 * Maya's answer changes with it, in the same deploy, with no chance of the
 * two disagreeing. Entries awaiting a business decision (answer: null) are
 * excluded here exactly as they are excluded from the page's JSON-LD: an
 * unanswered question should produce "I don't know, a person will
 * confirm", not a placeholder delivered confidently.
 *
 * These pages hold facts only. What Maya may do with a fact — including
 * that she never tells a seller which route their own car took — is
 * behaviour, and lives in agent/prompt.md. Keeping instructions out of the
 * knowledge means every page here can be read aloud to a seller as it
 * stands, which is what the guard test below actually checks.
 *
 * The handful of pages that cannot be derived quote published copy
 * verbatim. test/knowledge.test.ts
 * asserts those quotes still appear in the pages they came from, so
 * editing the site breaks the build rather than silently leaving Maya
 * saying last month's policy.
 */

export interface KnowledgePage {
  id: string;
  title: string;
  body: string;
  /** Where this came from, shown in the review log. */
  source: string;
}

function faqPages(): KnowledgePage[] {
  return FAQ.filter((entry) => entry.answer !== null).map((entry, index) => ({
    id: `faq-${index + 1}`,
    title: entry.question,
    body: entry.answer as string,
    source: "config/faq.ts — published at /faq",
  }));
}

function promisePage(): KnowledgePage {
  return {
    id: "promises",
    title: "What we promise, in full",
    body: [
      `A firm offer within ${PROMISES.offerWithinHours} hours on a weekday, from a person. If the enquiry comes in late in the evening, the answer comes first thing the next morning. How weekends are handled is not settled, and is not something to state either way.`,
      `${PROMISES.collection}.`,
      `${PROMISES.payment}.`,
      "No deductions. Not at collection, not ever.",
      "The offer stands for seven days, provided the mileage has not materially increased and the condition is as described.",
      "",
      "This list is complete. Anything not on it is not promised, however reasonable it sounds.",
    ].join("\n"),
    source: "config/site.ts PROMISES + /how-it-works",
  };
}

function scopePage(): KnowledgePage {
  return {
    id: "what-we-buy",
    title: "What we buy",
    body: [
      `${SITE.name} buys any car, of any age, anywhere in mainland UK.`,
      "There is no cut-off on age, mileage or condition. Age and condition change what a car is worth, which is a person's judgement, not whether we are interested.",
      "",
      `Some cars are in demand in ${EXPORT_MARKET}, which drives on the left like the UK. That demand is why offers on certain young premium SUVs can beat a general buyer's.`,
    ].join("\n"),
    source: "/export and the header disclosure — published copy",
  };
}

export function knowledgeBase(): KnowledgePage[] {
  return [promisePage(), scopePage(), ...faqPages()];
}

/** The knowledge base as it is injected into the system prompt. */
export function knowledgeAsText(): string {
  return knowledgeBase()
    .map((page) => `## ${page.title}\n\n${page.body}`)
    .join("\n\n");
}
