import { Section } from "@/components/ui/Section";

/**
 * Shared shell for the legal pages: one measure, consistent heading
 * rhythm, a visible last-updated date in mono per the data-type rule.
 */
export function LegalArticle({
  title,
  updated,
  children,
  labelledBy,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
  labelledBy: string;
}) {
  return (
    <main>
      <Section ground="paper" labelledBy={labelledBy}>
        <article className="max-w-2xl">
          <h1 id={labelledBy} className="font-display text-display-2">
            {title}
          </h1>
          <p className="mt-3 text-sm text-structure">
            Last updated <span className="font-mono">{updated}</span>
          </p>
          <div className="legal-prose mt-10">{children}</div>
        </article>
      </Section>
    </main>
  );
}
