import { Container } from "@/components/ui/Container";

export type SectionGround = "ink" | "paper" | "paper-warm";

const groundClasses: Record<SectionGround, string> = {
  ink: "bg-ink text-paper on-ink",
  paper: "bg-paper text-ink",
  "paper-warm": "bg-paper-warm text-ink",
};

/**
 * Section wrapper. The paper/ink alternation is the page's primary rhythm
 * device. Sections keep their content as plain children so the Milestone 5
 * motion pass can wrap them in a client reveal component without
 * restructuring anything.
 */
export function Section({
  ground,
  children,
  className = "",
  labelledBy,
}: {
  ground: SectionGround;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`${groundClasses[ground]} py-24 md:py-32 ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}
