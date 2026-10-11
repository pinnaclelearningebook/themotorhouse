import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { ModelCard } from "@/components/sections/ModelCard";
import { MODELS } from "@/config/models";

/**
 * The "any car" card leads and carries the same visual weight as the
 * named models. The seven are where export demand lifts the number, not
 * a list of what we accept — a Golf owner reading this section has to
 * see themselves in it, and they read the first card.
 */
export function WhatWeBuy() {
  return (
    <Section ground="paper-warm" labelledBy="buy-heading">
      <Reveal>
        <p className="text-caption font-medium tracking-[0.14em] text-structure uppercase">
          What we buy
        </p>
        <h2 id="buy-heading" className="mt-4 max-w-3xl font-display text-display-3">
          Any make, any age, any condition.
        </h2>
        <p className="mt-5 max-w-prose text-lg">
          Most of what we buy isn&apos;t on the list below. Same firm offer,
          same free collection, same payment before the transporter leaves.
        </p>
        <p className="mt-6">
          <Link href="/valuation" className="link-draw font-medium text-oxblood">
            Get my offer
          </Link>
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-20 text-caption font-medium tracking-[0.14em] text-structure uppercase">
          Where we pay more
        </p>
        <p className="mt-3 max-w-prose text-structure">
          On these, export demand sits on top of the UK market, so our number
          is usually stronger than a general buyer&apos;s.
        </p>
      </Reveal>

      <ul className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {MODELS.map((model, index) => (
          <Reveal as="li" key={model.slug} delay={Math.min(index, 4) * 0.05}>
            <ModelCard slug={model.slug} name={model.name} />
          </Reveal>
        ))}
        <Reveal as="li" delay={0.25}>
          <ModelCard slug="valuation" name="Any other car" href="/valuation" />
        </Reveal>
      </ul>
    </Section>
  );
}
