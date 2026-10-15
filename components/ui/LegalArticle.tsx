import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

/**
 * Shared shell for the legal pages: one measure, consistent heading
 * rhythm, a visible last-updated date in mono per the data-type rule.
 *
 * It opens on an ink banner like every other inner page rather than a
 * heading on paper. There is no photograph behind it — a privacy
 * policy illustrated with a car at dusk is a page trying to be liked,
 * and these three only have to be clear.
 */
export function LegalArticle({
  title,
  updated,
  children,
  labelledBy,
  path,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
  labelledBy: string;
  /** This page's own path, for the breadcrumb trail. */
  path: string;
}) {
  return (
    <main>
      <section
        aria-labelledby={labelledBy}
        className="on-ink bg-ink pt-32 pb-14 text-paper md:pt-40 md:pb-20"
      >
        <Container>
          <div className="max-w-2xl">
            <Breadcrumbs
              className="mb-6"
              trail={[{ name: title, path }]}
            />
            <p className="text-caption font-semibold tracking-[0.16em] text-paper/70 uppercase">
              Legal
            </p>
            <h1
              id={labelledBy}
              className="mt-4 font-display text-display-3 md:text-display-2"
            >
              {title}
            </h1>
            <p className="mt-6 text-sm text-paper/70">
              Last updated <span className="font-mono">{updated}</span>
            </p>
          </div>
        </Container>
      </section>

      <Section ground="paper">
        <article className="legal-prose max-w-2xl">{children}</article>
      </Section>
    </main>
  );
}
