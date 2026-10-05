import { money, type CarPnl } from "@/lib/admin/pnl";
import { logCost, recordSale } from "@/app/admin/(workspace)/pipeline/actions";
import { setFollowUpDate } from "@/app/admin/(workspace)/follow-ups/actions";

/**
 * Actual money on one car, and the forms that record it.
 *
 * Kept visually and structurally apart from the decision panel above it.
 * That panel projects; this one reports. Section 17 wants every number to
 * show its source, and the most important source distinction in the whole
 * dashboard is which of those two a figure came from.
 */

export interface MoneyPanelProps {
  leadId: string;
  pnl: CarPnl;
  soldOn: string | null;
  nextContactDate: string | null;
  /** Supplied by the page: reading the clock during render is impure. */
  today: string;
}

function Line({
  label,
  value,
  source,
  missing,
}: {
  label: string;
  value: string;
  source: string;
  missing?: boolean;
}) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span
          className={
            missing
              ? "text-sm text-structure"
              : "data-inline font-mono text-sm font-medium"
          }
        >
          {value}
        </span>
      </div>
      <p className="mt-0.5 text-caption text-structure">{source}</p>
    </div>
  );
}

export function MoneyPanel({
  leadId,
  pnl,
  soldOn,
  nextContactDate,
  today,
}: MoneyPanelProps) {
  return (
    <section className="rounded border border-line p-6">
      <h2 className="font-display text-2xl">Money</h2>
      <p className="mt-2 text-caption text-structure">
        Actual, not projected. The figures above this are the engine&apos;s
        estimates; these are what happened.
      </p>

      <div className="mt-4">
        <Line
          label="Paid for the car"
          value={pnl.purchase === null ? "no accepted offer" : money(pnl.purchase)}
          source="The accepted offer. The offer does not change, so this is not separately editable."
          missing={pnl.purchase === null}
        />
        <Line
          label="Costs"
          value={pnl.costsRecorded ? money(pnl.costs) : "none logged"}
          source={
            pnl.costsRecorded
              ? `${pnl.costLines.length} logged ${
                  pnl.costLines.length === 1 ? "line" : "lines"
                }`
              : "Recon, transport, shipping, clearance — whatever was spent."
          }
          missing={!pnl.costsRecorded}
        />
        <Line
          label="Sold for"
          value={pnl.proceeds === null ? "not sold" : money(pnl.proceeds)}
          source={soldOn ? `Recorded as sold on ${soldOn}.` : "Entered when the car sells."}
          missing={pnl.proceeds === null}
        />
        <Line
          label="Margin"
          value={
            pnl.margin === null
              ? "not calculated"
              : `${money(pnl.margin)}${pnl.marginProvisional ? " before costs" : ""}`
          }
          source={
            pnl.margin === null
              ? `Needs: ${pnl.missing.filter((m) => m !== "no costs logged").join(", ")}.`
              : pnl.marginProvisional
                ? "No costs logged against this car yet, so this is the ceiling, not the margin."
                : "Sold price less what we paid and what we spent."
          }
          missing={pnl.margin === null}
        />
      </div>

      {pnl.costLines.length > 0 && (
        <ul className="mt-4 space-y-1 text-caption">
          {pnl.costLines.map((line, index) => (
            <li key={`${line.kind}-${index}`} className="flex justify-between gap-3">
              <span>{line.kind}</span>
              <span className="data-inline font-mono">{money(line.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={logCost} className="mt-6 border-t border-line pt-4">
        <input type="hidden" name="leadId" value={leadId} />
        <p className="text-caption font-medium">Log a cost</p>
        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor="cost-kind">What for</label>
          <input
            id="cost-kind"
            name="kind"
            required
            placeholder="recon, shipping…"
            className="min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 text-caption"
          />
          <label className="sr-only" htmlFor="cost-amount">Amount in pounds</label>
          <input
            id="cost-amount"
            name="amount"
            type="number"
            required
            inputMode="numeric"
            placeholder="£"
            className="data-inline w-24 rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
          />
          <button
            type="submit"
            className="rounded border border-line px-2 py-1 text-caption hover:border-oxblood hover:text-oxblood"
          >
            Log
          </button>
        </div>
      </form>

      <form action={recordSale} className="mt-4 border-t border-line pt-4">
        <input type="hidden" name="leadId" value={leadId} />
        <p className="text-caption font-medium">Record the sale</p>
        <p className="mt-1 text-caption text-structure">
          Sets the lead to sold.
        </p>
        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor="sold-price">Sold price in pounds</label>
          <input
            id="sold-price"
            name="soldPrice"
            type="number"
            required
            inputMode="numeric"
            placeholder="£"
            defaultValue={pnl.proceeds ?? ""}
            className="data-inline w-24 rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
          />
          <label className="sr-only" htmlFor="sold-on">Date sold</label>
          <input
            id="sold-on"
            name="soldOn"
            type="date"
            required
            defaultValue={soldOn ?? today}
            className="data-inline min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
          />
          <button
            type="submit"
            className="rounded border border-line px-2 py-1 text-caption hover:border-oxblood hover:text-oxblood"
          >
            Save
          </button>
        </div>
      </form>

      <form action={setFollowUpDate} className="mt-4 border-t border-line pt-4">
        <input type="hidden" name="leadId" value={leadId} />
        <p className="text-caption font-medium">Next contact</p>
        <p className="mt-1 text-caption text-structure">
          Puts this lead on the follow-ups list. Clear it to take it off.
        </p>
        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor="next-contact">Next contact date</label>
          <input
            id="next-contact"
            name="nextContactDate"
            type="date"
            defaultValue={nextContactDate ?? ""}
            className="data-inline min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
          />
          <button
            type="submit"
            className="rounded border border-line px-2 py-1 text-caption hover:border-oxblood hover:text-oxblood"
          >
            Save
          </button>
        </div>
      </form>
    </section>
  );
}
