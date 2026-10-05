import type { Metadata } from "next";
import Link from "next/link";
import { pipelineBoard, MOVABLE_STATUSES } from "@/lib/admin/pipeline";
import type { PipelineCard } from "@/lib/admin/pipeline";
import { money } from "@/lib/admin/pnl";
import { titleCaseVehicle } from "@/lib/format";
import { moveLead } from "./actions";

export const metadata: Metadata = { title: "Pipeline" };

/**
 * The board. Cards move by select-and-submit rather than drag, which is
 * keyboard operable, works on a phone, needs no client JavaScript and
 * cannot drop a car into the wrong column on a bad swipe.
 *
 * Every money figure here is actual money. The decision engine's
 * projections live on the lead detail page and are labelled as
 * projections there — see lib/admin/pnl.ts for why they are kept apart.
 */

function Pnl({ card }: { card: PipelineCard }) {
  const { pnl } = card;

  return (
    <dl className="mt-3 space-y-1 text-caption">
      <div className="flex justify-between gap-2">
        <dt className="text-structure">Paid</dt>
        <dd className={pnl.purchase === null ? "text-structure" : "font-mono"}>
          {pnl.purchase === null ? "no accepted offer" : money(pnl.purchase)}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-structure">Costs</dt>
        <dd className={pnl.costsRecorded ? "font-mono" : "text-structure"}>
          {pnl.costsRecorded
            ? `${money(pnl.costs)} · ${pnl.costLines.length}`
            : "none logged"}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-structure">Sold</dt>
        <dd className={pnl.proceeds === null ? "text-structure" : "font-mono"}>
          {pnl.proceeds === null ? "not sold" : money(pnl.proceeds)}
        </dd>
      </div>
      <div className="mt-1 flex justify-between gap-2 border-t border-line pt-1">
        <dt className="font-medium">Margin</dt>
        <dd>
          {pnl.margin === null ? (
            <span className="text-structure">not calculated</span>
          ) : (
            <span
              className={`font-mono font-medium ${
                pnl.margin < 0 ? "text-oxblood" : ""
              }`}
            >
              {money(pnl.margin)}
              {pnl.marginProvisional && (
                <span className="ml-1 font-sans text-structure">
                  before costs
                </span>
              )}
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function Card({ card }: { card: PipelineCard }) {
  const vehicle = [card.year, card.make, card.model]
    .filter(Boolean)
    .map((part) => (typeof part === "string" ? titleCaseVehicle(part) : part))
    .join(" ");

  return (
    <li className="rounded border border-line bg-paper p-3">
      <Link
        href={`/admin/leads/${card.id}`}
        className="link-draw data-inline font-mono text-sm font-medium"
      >
        {card.reg}
      </Link>
      <p className="mt-1 text-caption text-structure">
        {vehicle || "vehicle not identified"}
      </p>
      {card.name && <p className="text-caption">{card.name}</p>}
      {(card.channelDecided ?? card.channelRecommended) && (
        <p className="mt-2 text-caption text-structure">
          {card.channelDecided
            ? `${card.channelDecided} · decided`
            : `${card.channelRecommended} · recommended`}
        </p>
      )}

      <Pnl card={card} />

      <form action={moveLead} className="mt-3 flex gap-2">
        <input type="hidden" name="leadId" value={card.id} />
        <label className="sr-only" htmlFor={`status-${card.id}`}>
          Move {card.reg} to
        </label>
        <select
          id={`status-${card.id}`}
          name="status"
          defaultValue={card.status}
          className="min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 text-caption"
        >
          {MOVABLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-line px-2 py-1 text-caption hover:border-oxblood hover:text-oxblood"
        >
          Move
        </button>
      </form>
    </li>
  );
}

export default async function PipelinePage() {
  const board = await pipelineBoard();
  const live = board.columns.reduce(
    (total, column) => total + column.cards.length,
    0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-display-3">Pipeline</h1>
        <p className="text-caption text-structure">
          <span className="data-inline font-mono">{live}</span> live ·{" "}
          <span className="data-inline font-mono">{board.closedCount}</span>{" "}
          declined or lost ·{" "}
          <span className="data-inline font-mono">
            {board.researchingCount}
          </span>{" "}
          researching
        </p>
      </div>

      {board.realised ? (
        <p className="mt-4 text-sm">
          Realised margin on{" "}
          <span className="data-inline font-mono">{board.realised.cars}</span>{" "}
          sold {board.realised.cars === 1 ? "car" : "cars"}:{" "}
          <span className="data-inline font-mono font-medium">
            {money(board.realised.margin)}
          </span>
          <span className="text-structure">
            {" "}
            — actual money, from accepted offers, logged costs and sale
            prices. Cars with no costs logged are included at their
            before-costs margin.
          </span>
        </p>
      ) : (
        <p className="mt-4 text-sm text-structure">
          No car has been sold yet, so there is no realised margin to show.
          Nothing here is projected.
        </p>
      )}

      {live === 0 ? (
        <p className="mt-10 text-sm text-structure">
          Nothing in the pipeline. Leads arrive in the{" "}
          <Link href="/admin" className="link-draw text-oxblood">
            inbox
          </Link>{" "}
          and appear here once they are moved on from new.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {board.columns.map((column) => (
            <section key={column.key} aria-labelledby={`col-${column.key}`}>
              <h2
                id={`col-${column.key}`}
                className="flex items-baseline justify-between border-b border-line pb-2 text-caption font-medium tracking-wide uppercase"
              >
                {column.label}
                <span className="data-inline font-mono text-structure">
                  {column.cards.length}
                </span>
              </h2>
              {column.cards.length === 0 ? (
                <p className="mt-3 text-caption text-structure">—</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {column.cards.map((card) => (
                    <Card key={card.id} card={card} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
