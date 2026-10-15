import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { RECENTLY_PURCHASED } from "@/config/recently-purchased";

export const metadata: Metadata = {
  title: "Recently purchased",
  description:
    "Real cars we bought recently — model, year and mileage, photographed as they were collected.",
  alternates: { canonical: "/recently-purchased" },
};

/**
 * Real cars only, from config/recently-purchased.ts. While the array is
 * empty this page 404s and nothing links to it — same honesty rule as
 * the home section.
 */
export default function RecentlyPurchasedPage() {
  if (RECENTLY_PURCHASED.length === 0) {
    notFound();
  }

  return (
    <main>
      <PageHero
        eyebrow="Recently purchased"
        heading="Cars we actually bought"
        intro="Every car here is one we bought, photographed as it was collected. No stock photography and no examples we did not pay for."
        id="purchased-page-heading"
        crumbs={[{ name: "Recently purchased", path: "/recently-purchased" }]}
      />

      <Section ground="paper" labelledBy="purchased-list-heading">
        <h2 id="purchased-list-heading" className="sr-only">
          Recent purchases
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RECENTLY_PURCHASED.map((car) => (
            <li
              key={`${car.model}-${car.year}-${car.mileage}`}
              className="rounded border border-line"
            >
              <Image
                src={car.image}
                alt={`${car.year} ${car.model} we purchased`}
                width={640}
                height={420}
                className="w-full rounded-t object-cover"
              />
              <div className="p-5">
                <h2 className="text-lg font-medium">{car.model}</h2>
                <p className="mt-1 font-mono text-sm text-structure">
                  {car.year} · {car.mileage.toLocaleString("en-GB")} miles
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand id="purchased-cta-heading" heading="Yours could be next." />

    </main>
  );
}
