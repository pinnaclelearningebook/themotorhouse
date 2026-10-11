/**
 * The same header block on every section, everywhere on the site.
 *
 * An eyebrow, a serif heading, and at most one line of introduction.
 * The consistency is the point: a reader who has scrolled past three of
 * these knows what the fourth is before they have read it, and the page
 * stops feeling like a document and starts feeling like a thing
 * somebody arranged.
 *
 * The eyebrow is oxblood on light grounds. On ink and oxblood it is a
 * tint of paper instead — oxblood on ink is 1.4:1 and unreadable, and
 * the point of a label nobody can read escapes me.
 */
export function SectionHeader({
  eyebrow,
  heading,
  intro,
  id,
  tone = "light",
  align = "left",
  className = "",
  as: Heading = "h2",
}: {
  eyebrow: string;
  heading: React.ReactNode;
  intro?: React.ReactNode;
  id?: string;
  /** "dark" for ink and oxblood grounds. */
  tone?: "light" | "dark";
  align?: "left" | "centre";
  className?: string;
  as?: "h1" | "h2";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`${align === "centre" ? "mx-auto max-w-2xl text-center" : "max-w-3xl"} ${className}`}
    >
      <p
        className={`text-caption font-semibold tracking-[0.16em] uppercase ${
          dark ? "text-paper/70" : "text-oxblood"
        }`}
      >
        {eyebrow}
      </p>
      <Heading
        id={id}
        className="mt-4 font-display text-display-3 md:text-[2.75rem] md:leading-[1.08]"
      >
        {heading}
      </Heading>
      {intro && (
        <p
          className={`mt-5 max-w-prose text-lg leading-relaxed ${
            dark ? "text-paper/85" : "text-ink/80"
          } ${align === "centre" ? "mx-auto" : ""}`}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
