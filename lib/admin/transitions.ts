import type { MovableStatus } from "@/lib/admin/pipeline";

/**
 * Which moves a car is allowed to make, and what each one costs the
 * person making it.
 *
 * The board gained drag-and-drop on 19 October 2026, which reopened a
 * decision taken against it on the 5th: a drag is one gesture with no
 * confirmation step, and the failure mode is a car landing in the
 * wrong column on a bad swipe. The answer is not to trust the gesture
 * less but to make the illegal moves impossible and the irreversible
 * ones deliberate.
 *
 * **The map is enforced on the server.** A client that is wrong, old
 * or hostile can ask for anything; `moveLead` consults this file and
 * refuses. The UI reads the same map so a card does not offer a drop
 * it is about to be told off for, but that is a courtesy, not the
 * control.
 *
 * Three kinds of edge:
 *
 *   forward      the car progressing, which is most of them
 *   correction   one step back, because a mis-drop has to be
 *                undoable without a database console. Marked, so the
 *                difference between progress and a fix stays legible
 *   exit         the car leaving the pipeline, which always costs a
 *                reason or a confirmation
 *
 * Notably absent: anything that skips a stage. `new` cannot become
 * `sold`, because a car we have not offered on and not collected
 * cannot have been sold, and a board that accepts the claim is a
 * board whose P&L is fiction.
 */

/** What the person has to supply before a move is written. */
export type MoveDemand =
  | "none"
  /** Dropping into Offered opens offer entry. A person types the number. */
  | "offer"
  /** Leaving the pipeline needs a reason from the list below. */
  | "reason"
  /** Final and irreversible, so it is named and confirmed. */
  | "confirm";

interface Edge {
  to: MovableStatus;
  kind: "forward" | "correction" | "exit";
}

const forward = (...to: MovableStatus[]): Edge[] =>
  to.map((status) => ({ to: status, kind: "forward" as const }));
const correction = (...to: MovableStatus[]): Edge[] =>
  to.map((status) => ({ to: status, kind: "correction" as const }));
const exit = (...to: MovableStatus[]): Edge[] =>
  to.map((status) => ({ to: status, kind: "exit" as const }));

export const TRANSITIONS: Record<MovableStatus, Edge[]> = {
  new: [...forward("contacted"), ...forward("researching"), ...exit("lost")],
  contacted: [
    ...forward("offered"),
    ...forward("researching"),
    ...exit("lost"),
    ...correction("new"),
  ],
  // `declined` is the seller turning an offer down, so it can only be
  // reached from a state where an offer exists.
  offered: [
    ...forward("accepted"),
    ...exit("declined"),
    ...exit("lost"),
    ...correction("contacted"),
  ],
  accepted: [...forward("collected"), ...exit("lost"), ...correction("offered")],
  collected: [
    ...forward("listed"),
    ...forward("shipped"),
    ...correction("accepted"),
  ],
  listed: [...forward("shipped"), ...forward("sold"), ...correction("collected")],
  shipped: [...forward("sold"), ...correction("collected")],
  /*
   * Terminal. Not because the database forbids it, but because
   * `sold` is the row the realised-margin figure is computed from,
   * and a status that can be walked back out of quietly changes a
   * number somebody has already reported.
   */
  sold: [],
  // Both exits can be reopened: a seller who said no in March rings
  // back in June, and that is the same car, not a new lead.
  declined: [...forward("contacted"), ...exit("lost")],
  lost: [...forward("contacted")],
  researching: [...forward("contacted"), ...forward("offered"), ...exit("lost")],
};

/** Statuses that end the car's time on the board. */
export const FINAL_STATUSES: MovableStatus[] = ["sold", "declined", "lost"];

/**
 * Why a car left.
 *
 * Short on purpose. A list long enough to describe every case is a
 * list nobody reads to the bottom of, and the free-text note beside
 * it carries the detail. These are the five that change what we would
 * do differently, which is the only reason to record a reason at all.
 *
 * There is no `withdrawn` status in the `lead_status` enum and this
 * does not invent one: a seller pulling out is `lost` with the reason
 * saying so. Adding a status is a migration and a decision about the
 * business, not a side effect of building a board.
 */
export const LOSS_REASONS = [
  { value: "price", label: "Our offer was too low" },
  { value: "sold_elsewhere", label: "Sold to someone else" },
  { value: "withdrawn", label: "Decided not to sell" },
  { value: "unreachable", label: "Could not reach them" },
  { value: "not_for_us", label: "Not a car we want" },
] as const;

export type LossReason = (typeof LOSS_REASONS)[number]["value"];

export function isLossReason(value: unknown): value is LossReason {
  return LOSS_REASONS.some((reason) => reason.value === value);
}

/** Every status this one may move to. */
export function allowedTargets(from: string): MovableStatus[] {
  return (TRANSITIONS[from as MovableStatus] ?? []).map((edge) => edge.to);
}

export function canMove(from: string, to: string): boolean {
  return allowedTargets(from).includes(to as MovableStatus);
}

export function edgeKind(from: string, to: string): Edge["kind"] | null {
  return (
    (TRANSITIONS[from as MovableStatus] ?? []).find((edge) => edge.to === to)
      ?.kind ?? null
  );
}

/** What the person must supply before this move is written. */
export function demandFor(to: string): MoveDemand {
  if (to === "offered") return "offer";
  if (to === "declined" || to === "lost") return "reason";
  if (to === "sold") return "confirm";
  return "none";
}

/**
 * Why a move was refused, in words a person can act on. Returned
 * rather than thrown so the board can show it in a toast and put the
 * card back where it came from.
 */
export function refusalFor(from: string, to: string): string | null {
  if (from === to) return null;
  if (!TRANSITIONS[from as MovableStatus]) {
    return `"${from}" is not a stage a card can move out of.`;
  }
  if (canMove(from, to)) return null;
  if (from === "sold") {
    return "A sold car stays sold. The realised margin is computed from it.";
  }
  const targets = allowedTargets(from);
  return targets.length === 0
    ? `Nothing can move out of ${from}.`
    : `${from} can only go to ${targets.join(", ")}.`;
}
