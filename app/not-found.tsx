import Link from "next/link";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { Header } from "@/components/ui/Header";
import { PlateForm } from "@/components/ui/PlateForm";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MODELS } from "@/config/models";

/**
 * The 404.
 *
 * It lives at the app root rather than in the (site) group, because
 * Next only uses a root not-found for an unmatched URL — a segment's
 * own is reached by notFound() inside it. That means the header and
 * footer are imported here rather than inherited.
 *
 * It carries the registration input. A seller who mistypes a model URL
 * is one click from the only thing this site asks anyone to do, and
 * sending them to the home page to start again is a page that has
 * decided its own tidiness matters more.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <section
          aria-labelledby="notfound-heading"
          className="on-ink bg-ink pt-32 pb-16 text-paper md:pt-40 md:pb-24"
        >
          <Container>
            <div className="max-w-2xl">
              <p className="font-mono text-caption tracking-[0.16em] text-paper/60 uppercase">
                404
              </p>
              <h1
                id="notfound-heading"
                className="mt-4 font-display text-display-3 md:text-display-1"
              >
                That page is not here.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-paper/85">
                It may have moved, or the address may have a typo in it.
                Either way, the registration is all we need to get you a
                number.
              </p>
              <div className="mt-10">
                <PlateForm id="notfound-reg" />
              </div>
            </div>
          </Container>
        </section>

        <Section ground="paper" labelledBy="notfound-links-heading">
          <SectionHeader
            id="notfound-links-heading"
            eyebrow="Or try one of these"
            heading="The pages people are usually looking for"
          />
          <ul className="mt-10 grid gap-x-10 gap-y-1 sm:grid-cols-2">
            {[
              { href: "/how-it-works", label: "How it works" },
              { href: "/export", label: "Why we pay more for some cars" },
              { href: "/faq", label: "Frequently asked questions" },
              { href: "/about", label: "About us" },
              { href: "/blog", label: "Guides for people selling a car" },
              ...MODELS.slice(0, 2).map((model) => ({
                href: `/${model.slug}`,
                label: `Sell your ${model.name}`,
              })),
            ].map((link) => (
              <li key={link.href} className="border-t border-line">
                <Link
                  href={link.href as never}
                  className="flex min-h-14 items-center text-lg transition-colors duration-200 hover:text-oxblood"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <Footer />
    </>
  );
}
