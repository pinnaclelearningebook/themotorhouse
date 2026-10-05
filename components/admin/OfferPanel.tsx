import { money } from "@/lib/admin/pnl";
import {
  recordOffer,
  setOfferOutcome,
} from "@/app/admin/(workspace)/leads/[id]/actions";

/**
 * Where a person types the number.
 *
 * There is no suggested value, no pre-filled amount, and no button that
 * fills this in from the decision engine's max bid. The max bid is a
 * ceiling shown above; this is a decision. Keeping them unlinked is the
 * whole point of CLAUDE.md section 1's last line.
 */

export interface OfferRow {
  id: string;
  amount: number;
  status: string;
  channel: string | null;
  made_by: string;
  made_at: string;
  valid_until: string | null;
  notes: string | null;
}

const OUTCOMES = ["accepted", "declined", "expired"] as const;

export function OfferPanel({
  leadId,
  offers,
  recommendedChannel,
  defaultValidUntil,
}: {
  leadId: string;
  offers: OfferRow[];
  recommendedChannel: string | null;
  /** Supplied by the page: reading the clock during render is impure. */
  defaultValidUntil: string;
}) {
  const open = offers.find((offer) => offer.status === "sent");

  return (
    <section className="rounded border border-line p-6">
      <h2 className="font-display text-2xl">Offer</h2>

      {offers.length > 0 && (
        <ul className="mt-4 space-y-3">
          {offers.map((offer) => (
            <li key={offer.id} className="border-b border-line pb-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="data-inline font-mono text-sm font-medium">
                  {money(offer.amount)}
                </span>
                <span className="text-caption text-structure">
                  {offer.status}
                </span>
              </div>
              <p className="mt-1 text-caption text-structure">
                {offer.channel ? `${offer.channel} · ` : ""}
                {offer.made_by} ·{" "}
                <span className="data-inline font-mono">
                  {offer.made_at.slice(0, 10)}
                </span>
                {offer.valid_until && (
                  <>
                    {" · valid to "}
                    <span className="data-inline font-mono">
                      {offer.valid_until}
                    </span>
                  </>
                )}
              </p>
              {offer.notes && (
                <p className="mt-1 text-caption">{offer.notes}</p>
              )}

              {offer.status === "sent" && (
                <div className="mt-2 flex gap-2">
                  {OUTCOMES.map((outcome) => (
                    <form key={outcome} action={setOfferOutcome}>
                      <input type="hidden" name="leadId" value={leadId} />
                      <input type="hidden" name="offerId" value={offer.id} />
                      <input type="hidden" name="status" value={outcome} />
                      <button
                        type="submit"
                        className="rounded border border-line px-2 py-1 text-caption hover:border-oxblood hover:text-oxblood"
                      >
                        {outcome}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={recordOffer} className="mt-4 border-t border-line pt-4">
        <input type="hidden" name="leadId" value={leadId} />
        <p className="text-caption font-medium">
          {open ? "Record a further offer" : "Record an offer"}
        </p>
        <p className="mt-1 text-caption text-structure">
          Type the number you have decided on. Nothing here suggests one.
        </p>

        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor="offer-amount">
            Offer amount in pounds
          </label>
          <input
            id="offer-amount"
            name="amount"
            type="number"
            required
            inputMode="numeric"
            placeholder="£"
            className="data-inline w-28 rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
          />
          <label className="sr-only" htmlFor="offer-channel">Channel</label>
          <select
            id="offer-channel"
            name="channel"
            defaultValue={
              recommendedChannel === "export" ? "export" : "domestic"
            }
            className="min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 text-caption"
          >
            <option value="domestic">domestic</option>
            <option value="export">export</option>
          </select>
        </div>

        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor="offer-valid">Valid until</label>
          <input
            id="offer-valid"
            name="validUntil"
            type="date"
            defaultValue={defaultValidUntil}
            className="data-inline min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
          />
          <button
            type="submit"
            className="rounded bg-oxblood px-3 py-1 text-caption text-paper transition-colors hover:bg-oxblood-lt"
          >
            Record
          </button>
        </div>
      </form>
    </section>
  );
}
