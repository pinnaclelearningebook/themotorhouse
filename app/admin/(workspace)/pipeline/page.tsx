import type { Metadata } from "next";
import Link from "next/link";
import { pipelineBoard } from "@/lib/admin/pipeline";
import { money } from "@/lib/admin/pnl";
import { PipelineBoard } from "@/components/admin/PipelineBoard";
import { moveLead, recordOfferOnBoard } from "./actions";

export const metadata: Metadata = { title: "Pipeline" };

/**
 * The board.
 *
 * Cards move by drag-and-drop on a desktop and by select-and-submit
 * everywhere, including on a desktop. The select was the original
 * decision (5 October) and the three reasons for it are all still
 * true — keyboard operable, works on a phone, cannot drop a car into
 * the wrong column on a bad swipe — so the drag was added beside it
 * rather than over it. Both go through the same server action, and
 * the transition map that decides which moves are legal is enforced
 * there, not here (lib/admin/transitions.ts).
 *
 * Every money figure is actual money. The decision engine's
 * projections live on the lead detail page and are labelled as
 * projections there — see lib/admin/pnl.ts for why they are kept apart.
 */

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
          <Link href="/admin/inbox" className="link-draw text-oxblood">
            inbox
          </Link>{" "}
          and appear here once they are moved on from new.
        </p>
      ) : (
        <PipelineBoard
          columns={board.columns}
          move={moveLead}
          recordOffer={recordOfferOnBoard}
        />
      )}
    </div>
  );
}
