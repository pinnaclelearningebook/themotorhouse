import { JsonLd } from "@/components/seo/JsonLd";

/**
 * FAQPage schema. Entries still awaiting a business decision
 * (answer: null) are excluded — no placeholder text goes to Google.
 *
 * The prop is the two fields the schema uses rather than FaqEntry, so
 * the model pages' own four-question lists go through the same
 * component. FAQPage has no notion of a section, so the /faq page's
 * grouping does not reach it.
 */
export function FaqJsonLd({
  entries,
}: {
  entries: readonly { question: string; answer: string | null }[];
}) {
  const answered = entries.filter(
    (entry): entry is { question: string; answer: string } =>
      entry.answer !== null,
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
