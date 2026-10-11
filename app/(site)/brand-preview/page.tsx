import { notFound } from "next/navigation";
import { Arch } from "@/components/ui/Arch";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Development-only sheet for judging the mark before it ships.
 * 404s in production and is excluded from the sitemap and robots.
 */
export const metadata = { robots: { index: false, follow: false } };

function Cell({
  label,
  ink = false,
  children,
}: {
  label: string;
  ink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-36 flex-col items-center justify-center gap-5 p-8 ${
        ink ? "bg-ink text-paper" : "bg-paper text-ink"
      }`}
    >
      {children}
      <span
        className={`font-mono text-caption ${ink ? "text-paper/45" : "text-structure"}`}
      >
        {label}
      </span>
    </div>
  );
}

export default function BrandPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="mb-8 inline-block rounded border border-dashed border-structure px-4 py-2 font-mono text-caption text-structure">
        Development preview — not part of the live site
      </p>
      <h1 className="font-display text-display-3">The lockup</h1>
      <p className="mt-3 max-w-prose text-sm text-structure">
        The arch and the ruled wordmark on one baseline. Live text in
        Newsreader, so it scales with the reader&apos;s type size.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
        <Cell label="header · 1440">
          <Wordmark />
        </Cell>
        <Cell label="header · 1440" ink>
          <Wordmark />
        </Cell>
        <Cell label="header · 375 (compact)">
          <Wordmark compact />
        </Cell>
        <Cell label="header · 375 (compact)" ink>
          <Wordmark compact />
        </Cell>
      </div>

      <h2 className="mt-14 font-display text-2xl">The mark alone</h2>
      <p className="mt-2 max-w-prose text-sm text-structure">
        Favicon, app icon and the corner of every OG image. The two inner
        strokes drop below 24px, where they would close up.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        <Cell label="48">
          <Arch size={48} />
        </Cell>
        <Cell label="32">
          <Arch size={32} />
        </Cell>
        <Cell label="16">
          <Arch size={16} />
        </Cell>
        <Cell label="16 on ink" ink>
          <Arch size={16} />
        </Cell>
        <Cell label="48 on ink" ink>
          <Arch size={48} />
        </Cell>
        <Cell label="32 on ink" ink>
          <Arch size={32} />
        </Cell>
        <Cell label="app icon">
          <span className="flex h-14 w-14 items-center justify-center rounded bg-oxblood text-paper">
            <Arch size={32} threshold="var(--color-paper)" />
          </span>
        </Cell>
        <Cell label="app icon" ink>
          <span className="flex h-14 w-14 items-center justify-center rounded bg-paper text-ink">
            <Arch size={32} />
          </span>
        </Cell>
      </div>

      <h2 className="mt-14 font-display text-2xl">In a header bar</h2>
      <div className="mt-6 border border-line">
        <div className="flex h-16 items-center justify-between border-b border-line bg-paper px-6">
          <Wordmark />
          <span className="rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper">
            Get my offer
          </span>
        </div>
        <div className="flex h-14 items-center justify-between bg-ink px-4 text-paper">
          <Wordmark compact />
          <span className="rounded bg-oxblood px-4 py-2 text-sm font-medium text-paper">
            Get my offer
          </span>
        </div>
      </div>
    </main>
  );
}
