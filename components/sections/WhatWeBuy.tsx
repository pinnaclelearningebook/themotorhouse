import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Reveal";
import { MODELS } from "@/config/models";

/**
 * The "any car" card leads and carries the most visual weight. The
 * seven are where export demand lifts the number, not a list of what we
 * accept — a Golf owner reading this has to see themselves in it, and
 * they read the first card.
 *
 * Model cards are typographic. There is no photograph of a Velar that
 * is ours, and a licensed one under the word "Velar" is a claim about
 * whose car it is; the drawing belongs to the lead card, where it
 * illustrates the category rather than a model.
 */
export function WhatWeBuy() {
  return (
    <Section ground="paper-warm" labelledBy="buy-heading">
      <SectionHeader
        eyebrow="What we buy"
        id="buy-heading"
        heading="Any make, any age, any condition."
        intro="Most of what we buy isn't on the list below. Same firm offer, same free collection, same payment before the transporter leaves."
      />

      <Reveal className="mt-10">
        <Card tone="paper" className="overflow-hidden">
          <div>
            <div>
              <h3 className="font-display text-2xl">
                Start with the registration
              </h3>
              <p className="mt-3 max-w-prose text-ink/75">
                One field. We pull the car up from the DVLA record, and a
                person prices it from there.
              </p>
              <p className="mt-6">
                <Link
                  href="/valuation"
                  className="inline-flex items-center gap-2 font-medium text-oxblood"
                >
                  <span className="link-draw">Get my offer</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mt-16 text-caption font-semibold tracking-[0.16em] text-oxblood uppercase">
          Where we pay more
        </p>
        <p className="mt-3 max-w-prose text-ink/75">
          On these, export demand sits on top of the UK market, so our number
          is usually stronger than a general buyer&apos;s.
        </p>
      </Reveal>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODELS.map((model, index) => (
          <Reveal as="li" key={model.slug} delay={Math.min(index, 4) * 0.05}>
            <Link
              href={`/${model.slug}` as never}
              className="group flex h-full flex-col justify-between gap-8 rounded border border-line bg-paper p-6 transition-[transform,border-color] duration-200 ease-(--ease-standard) hover:-translate-y-0.5 hover:border-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="font-display text-xl">{model.name}</span>
              <span className="flex items-center gap-2 text-caption font-medium tracking-wide text-oxblood uppercase">
                Get my offer
                <ArrowRight
                  aria-hidden="true"
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
