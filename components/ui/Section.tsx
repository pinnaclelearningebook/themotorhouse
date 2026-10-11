import { Container } from "@/components/ui/Container";

export type SectionGround = "ink" | "paper" | "paper-warm" | "oxblood";

/**
 * The four grounds, and the rule that governs them.
 *
 * Two adjacent sections never share one. Paper is the default, paper-
 * warm is the quiet alternate, ink is for the moments that want weight,
 * and oxblood is reserved — one band a page, at most, for the single
 * statement that matters. Used twice it stops meaning anything.
 */
const GROUNDS: Record<SectionGround, string> = {
  ink: "bg-ink text-paper on-ink",
  paper: "bg-paper text-ink",
  "paper-warm": "bg-paper-warm text-ink",
  oxblood: "bg-oxblood text-paper on-ink",
};

/**
 * One spacing scale, everywhere: 64px on a phone, 96px from md.
 *
 * It used to be py-24/py-32 with sections opting out by hand, which is
 * how the page ended up with gaps larger than some of its sections.
 * A section that needs more room gets it from its content, not from a
 * different padding.
 */
export function Section({
  ground,
  children,
  className = "",
  labelledBy,
  id,
}: {
  ground: SectionGround;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`${GROUNDS[ground]} py-16 md:py-24 ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}
