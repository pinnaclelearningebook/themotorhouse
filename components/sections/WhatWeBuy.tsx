import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { MODELS } from "@/config/models";

export function WhatWeBuy() {
  return (
    <Section ground="paper" labelledBy="buy-heading">
      <h2 id="buy-heading" className="font-display text-display-3">
        What we buy
      </h2>
      <p className="mt-4 max-w-prose text-structure">
        These are the cars our Cyprus buyers ask for by name.
      </p>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <li>
          <Link
            href="/valuation"
            className="block h-full rounded border border-line bg-paper-warm p-6 transition-colors duration-200 hover:border-oxblood"
          >
            <span className="font-display text-2xl">And everything else</span>
            <span className="mt-3 block text-sm text-ink/70">
              We buy any car, not just these. Start with your registration.
            </span>
          </Link>
        </li>
      </ul>
    </Section>
  );
}
