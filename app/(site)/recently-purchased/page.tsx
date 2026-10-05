import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { PlateForm } from "@/components/ui/PlateForm";
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
      <Section ground="paper" labelledBy="purchased-page-heading">
        <h1 id="purchased-page-heading" className="font-display text-display-2">
          Recently purchased
        </h1>
        <p className="mt-4 max-w-prose text-lg text-structure">
          Every car here is one we actually bought, photographed as it was
          collected.
        </p>
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      <Section ground="ink" labelledBy="purchased-cta-heading">
        <h2 id="purchased-cta-heading" className="font-display text-display-3">
          Yours could be next.
        </h2>
        <div className="mt-8">
          <PlateForm id="purchased-reg" />
        </div>
      </Section>
    </main>
  );
}
