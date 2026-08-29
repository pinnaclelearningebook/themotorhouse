import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { RECENTLY_PURCHASED } from "@/config/recently-purchased";

/**
 * Honest social proof: real cars only, wired to the array in
 * config/recently-purchased.ts. Renders nothing while it is empty.
 */
export function RecentlyPurchased() {
  if (RECENTLY_PURCHASED.length === 0) {
    return null;
  }

  return (
    <Section ground="paper" labelledBy="purchased-heading">
      <h2 id="purchased-heading" className="font-display text-display-3">
        Recently purchased
      </h2>
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <h3 className="font-medium">{car.model}</h3>
              <p className="mt-1 font-mono text-sm text-structure">
                {car.year} · {car.mileage.toLocaleString("en-GB")} miles
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
