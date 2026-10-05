import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { MODELS } from "@/config/models";

/**
 * The "any car" card leads and carries the same visual weight as the
 * named models. The seven are where export demand lifts the number, not
 * a list of what we accept — a Golf owner reading this section has to
 * see themselves in it, and they read the first card.
 */
export function WhatWeBuy() {
  return (
    <Section ground="paper" labelledBy="buy-heading">
      <h2 id="buy-heading" className="font-display text-display-3">
        What we buy
      </h2>

      <div className="mt-10 max-w-3xl rounded border border-oxblood bg-paper-warm p-8">
        <h3 className="font-display text-2xl">Any make, any age, any condition</h3>
        <p className="mt-3 max-w-prose">
          Most of what we buy isn&apos;t on this list. Same firm offer, same
          free collection, same payment before the transporter leaves.
        </p>
        <p className="mt-5">
          <Link
            href="/valuation"
            className="link-draw font-medium text-oxblood"
          >
            Get my offer
          </Link>
        </p>
      </div>

      <p className="mt-14 text-sm font-medium tracking-wide text-structure uppercase">
        Where we pay more
      </p>
      <p className="mt-3 max-w-prose text-structure">
        On these, export demand sits on top of the UK market, so our number
        is usually stronger than a general buyer&apos;s.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODELS.map((model) => (
          <li key={model.slug}>
            <Link
              href={`/${model.slug}`}
              className="block h-full rounded border border-line p-6 transition-colors duration-200 hover:border-oxblood"
            >
              <span className="font-display text-2xl">{model.name}</span>
              <span className="mt-3 block text-sm font-medium text-oxblood">
                Get my offer
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
