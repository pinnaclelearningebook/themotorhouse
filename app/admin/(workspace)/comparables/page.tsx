import type { Metadata } from "next";
import { db } from "@/lib/db";
import { money } from "@/lib/admin/pnl";
import { titleCaseVehicle } from "@/lib/format";
import { ComparableForm } from "./ComparableForm";

export const metadata: Metadata = { title: "Comparables" };

/**
 * What cars like this actually fetch, in the two markets we sell into.
 *
 * This is the table that turns the landed-cost model from an assumption
 * into something checkable. Until it has rows, the decision engine's
 * Cyprus side is projecting from settings alone, and PENDING-INFO says so.
 */

interface Row {
  id: string;
  logged_at: string;
  market: string;
  source: string | null;
  url: string | null;
  make: string | null;
  model: string | null;
  derivative: string | null;
  year: number | null;
  mileage: number | null;
  asking: number | null;
  sold: number | null;
  days_listed: number | null;
  notes: string | null;
}

export default async function ComparablesPage() {
  const { data } = await db()
    .from("comparables")
    .select(
      "id, logged_at, market, source, url, make, model, derivative, year, mileage, asking, sold, days_listed, notes",
    )
    .order("logged_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <h1 className="font-display text-display-3">Comparables</h1>
      <p className="mt-3 max-w-2xl text-sm text-structure">
        What cars like ours actually sell for, in the UK and in Cyprus. Log
        what you see. An asking price with no sold price is still worth
        recording — note which it is.
      </p>

      <ComparableForm />

      <h2 className="mt-12 font-display text-2xl">
        Logged
        <span className="data-inline ml-3 font-mono text-caption text-structure">
          {rows.length}
        </span>
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-structure">
          Nothing logged yet. While this is empty, the Cyprus side of every
          projection rests on the settings alone.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-caption tracking-wide text-structure uppercase">
                <th scope="col" className="py-2 pr-4 font-medium">Market</th>
                <th scope="col" className="py-2 pr-4 font-medium">Car</th>
                <th scope="col" className="py-2 pr-4 font-medium">Year</th>
                <th scope="col" className="py-2 pr-4 font-medium">Mileage</th>
                <th scope="col" className="py-2 pr-4 font-medium">Asking</th>
                <th scope="col" className="py-2 pr-4 font-medium">Sold</th>
                <th scope="col" className="py-2 pr-4 font-medium">Days</th>
                <th scope="col" className="py-2 pr-4 font-medium">Source</th>
                <th scope="col" className="py-2 font-medium">Logged</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const car = [row.make, row.model, row.derivative]
                  .filter(Boolean)
                  .map((part) => titleCaseVehicle(part as string))
                  .join(" ");
                return (
                  <tr key={row.id} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      {row.market === "cyprus" ? "Cyprus" : "UK"}
                    </th>
                    <td className="py-2 pr-4">
                      {car || <span className="text-structure">—</span>}
                      {row.notes && (
                        <span className="block text-caption text-structure">
                          {row.notes}
                        </span>
                      )}
                    </td>
                    <td className="data-inline py-2 pr-4 font-mono">
                      {row.year ?? "—"}
                    </td>
                    <td className="data-inline py-2 pr-4 font-mono">
                      {row.mileage !== null
                        ? row.mileage.toLocaleString("en-GB")
                        : "—"}
                    </td>
                    <td className="data-inline py-2 pr-4 font-mono">
                      {row.asking !== null ? money(row.asking) : "—"}
                    </td>
                    <td className="data-inline py-2 pr-4 font-mono">
                      {row.sold !== null ? money(row.sold) : "—"}
                    </td>
                    <td className="data-inline py-2 pr-4 font-mono">
                      {row.days_listed ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-draw text-oxblood"
                        >
                          {row.source ?? "link"}
                        </a>
                      ) : (
                        (row.source ?? <span className="text-structure">—</span>)
                      )}
                    </td>
                    <td className="data-inline py-2 font-mono text-caption text-structure">
                      {row.logged_at.slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
