import { JsonLd } from "@/components/seo/JsonLd";
import type { FaqEntry } from "@/config/faq";

/**
 * FAQPage schema. Entries still awaiting a business decision
 * (answer: null) are excluded — no placeholder text goes to Google.
 */
export function FaqJsonLd({ entries }: { entries: FaqEntry[] }) {
  const answered = entries.filter(
    (entry): entry is FaqEntry & { answer: string } => entry.answer !== null,
  );
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: answered.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      }}
    />
  );
}
