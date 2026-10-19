"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/ui/Toast";
import { titleCaseVehicle } from "@/lib/format";
import { money } from "@/lib/format";
import type { PipelineCard } from "@/lib/admin/pipeline";
import type { MovableStatus } from "@/lib/admin/pipeline";
import {
  LOSS_REASONS,
  allowedTargets,
  canMove,
  demandFor,
  edgeKind,
  refusalFor,
  type MoveDemand,
} from "@/lib/admin/transitions";

/**
 * The board.
 *
 * It moves cards two ways, and that is deliberate rather than
 * indecisive. Drag-and-drop was asked for and is the faster gesture
 * on a desktop. Select-and-submit was the original decision (5
 * October) for three reasons that are all still true: it is keyboard
 * operable, it works on a phone, and it cannot drop a car into the
 * wrong column on a bad swipe. So both are here, the select is the
 * only control below `lg`, and every move goes through the same
 * server action either way.
 *
 * A drag is optimistic — the card moves before the server answers,
 * because a board that pauses on every drop feels broken. If the
 * server refuses, the card goes back and the toast says why. The
 * refusal itself is server-side (lib/admin/transitions.ts); this
 * component consults the same map only so it can refuse a drop
 * before animating it.
 */

export interface Column {
  key: string;
  label: string;
  cards: PipelineCard[];
}

/** What a stage's cards may become, for the select. */
function targetsFor(status: string): MovableStatus[] {
  return allowedTargets(status);
}

function days(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function vehicleName(card: PipelineCard): string {
  return (
    [card.year, card.make, card.model]
      .filter(Boolean)
      .map((part) => (typeof part === "string" ? titleCaseVehicle(part) : part))
      .join(" ") || "vehicle not identified"
  );
}

/** First name only: the board is a glance, not a contact list. */
function firstName(name: string | null): string | null {
  return name?.trim().split(/\s+/)[0] ?? null;
}

interface Pending {
  card: PipelineCard;
  to: MovableStatus;
  demand: Exclude<MoveDemand, "none">;
}

export function PipelineBoard({
  columns: initial,
  move,
  recordOffer,
}: {
  columns: Column[];
  move: (input: {
    leadId: string;
    status: string;
    reason?: string;
    note?: string;
  }) => Promise<{ ok: boolean; status: string | null; message: string }>;
  recordOffer: (input: {
    leadId: string;
    amount: number;
    note?: string;
  }) => Promise<{ ok: boolean; message: string }>;
}) {
  const { show } = useToast();
  /** Card id → the status the board is currently showing it at. */
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<PipelineCard | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** Which column the phone is showing. */
  const [stage, setStage] = useState(initial[0]?.key ?? "");
  const liveRegion = useRef<HTMLParagraphElement>(null);

  const all = initial.flatMap((column) => column.cards);
  const statusOf = (card: PipelineCard) => overrides[card.id] ?? card.status;

  const columns = initial.map((column) => ({
    ...column,
    cards: all.filter((card) =>
      column.key === "listed"
        ? ["listed", "shipped"].includes(statusOf(card))
        : statusOf(card) === column.key,
    ),
  }));

  const announce = (text: string) => {
    if (liveRegion.current) liveRegion.current.textContent = text;
  };

  async function commit(
    card: PipelineCard,
    to: MovableStatus,
    extra: { reason?: string; note?: string } = {},
  ) {
    const from = statusOf(card);
    setBusy(card.id);
    // Optimistic: the card moves now, and comes back if the server says no.
    setOverrides((current) => ({ ...current, [card.id]: to }));
    const result = await move({ leadId: card.id, status: to, ...extra });
    setBusy(null);
    if (result.ok) {
      announce(`${card.reg} moved to ${to}`);
      show(`${card.reg} moved to ${to}`);
      return;
    }
    setOverrides((current) => ({ ...current, [card.id]: result.status ?? from }));
    announce(`${card.reg} was not moved. ${result.message}`);
    show(result.message, "error");
  }

  /** Shared by drag, select and keyboard: check, then collect, then commit. */
  function request(card: PipelineCard, to: MovableStatus) {
    const from = statusOf(card);
    if (from === to) return;
    if (!canMove(from, to)) {
      const why = refusalFor(from, to) ?? `A car cannot go from ${from} to ${to}.`;
      announce(`${card.reg} was not moved. ${why}`);
      show(why, "error");
      return;
    }
    const demand = demandFor(to);
    if (demand === "none") {
      void commit(card, to);
      return;
    }
    setPending({ card, to, demand });
  }

  return (
    <>
      <p ref={liveRegion} aria-live="polite" className="sr-only" />

      {/* ─── the phone: one column at a time ─────────────────── */}
      <div className="mt-6 lg:hidden">
        {/*
          * A stage switcher, not a sideways-scrolling board. Seven
          * columns at 375px is a gesture that loses the column header
          * off the left edge, and the header is the only thing that
          * says what the cards underneath mean.
          */}
        <label htmlFor="stage-switch" className="sr-only">
          Which stage to show
        </label>
        <select
          id="stage-switch"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          className="min-h-11 w-full rounded border border-line bg-paper px-3 text-sm"
        >
          {columns.map((column) => (
            <option key={column.key} value={column.key}>
              {column.label} ({column.cards.length})
            </option>
          ))}
        </select>

        {columns
          .filter((column) => column.key === stage)
          .map((column) => (
            <ul key={column.key} className="mt-4 flex flex-col gap-3">
              {column.cards.length === 0 && (
                <li className="text-caption text-structure">
                  Nothing in {column.label.toLowerCase()}.
                </li>
              )}
              {column.cards.map((card) => (
                <li key={card.id}>
                  <CardBody
                    card={card}
                    status={statusOf(card)}
                    busy={busy === card.id}
                    onRequest={request}
                    draggable={false}
                  />
                </li>
              ))}
            </ul>
          ))}
      </div>

      {/* ─── desktop: the board ──────────────────────────────── */}
      <div className="mt-8 hidden gap-4 lg:grid lg:grid-cols-4 xl:grid-cols-7">
        {columns.map((column) => {
          const droppable =
            dragging !== null &&
            canMove(statusOf(dragging), column.key as MovableStatus);
          const rejecting = dragging !== null && over === column.key && !droppable;
          return (
            <section
              key={column.key}
              aria-labelledby={`col-${column.key}`}
              onDragOver={(event) => {
                if (!dragging) return;
                setOver(column.key);
                // Only a legal column accepts the drop; the browser
                // shows "no entry" on the rest without us doing anything.
                if (droppable) event.preventDefault();
              }}
              onDragLeave={() => setOver((c) => (c === column.key ? null : c))}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                if (dragging) request(dragging, column.key as MovableStatus);
                setDragging(null);
              }}
              className={`rounded p-1 transition-colors duration-150 ${
                over === column.key && droppable
                  ? "bg-paper-warm ring-1 ring-oxblood"
                  : rejecting
                    ? "bg-paper-warm opacity-50"
                    : ""
              }`}
            >
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
                    <li
                      key={card.id}
                      draggable
                      onDragStart={() => setDragging(card)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      className={dragging?.id === card.id ? "opacity-40" : ""}
                    >
                      <CardBody
                        card={card}
                        status={statusOf(card)}
                        busy={busy === card.id}
                        onRequest={request}
                        draggable
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {pending && (
        <MoveDialog
          pending={pending}
          onCancel={() => setPending(null)}
          onConfirm={async (extra, offer) => {
            const { card, to } = pending;
            setPending(null);
            if (offer) {
              setBusy(card.id);
              const result = await recordOffer({ leadId: card.id, ...offer });
              setBusy(null);
              if (!result.ok) {
                show(result.message, "error");
                return;
              }
              // recordOffer sets the status itself; reflect it here.
              setOverrides((current) => ({ ...current, [card.id]: "offered" }));
              announce(`${card.reg} moved to offered`);
              show(`Offer recorded for ${card.reg}`);
              return;
            }
            await commit(card, to, extra);
          }}
        />
      )}
    </>
  );
}

function CardBody({
  card,
  status,
  busy,
  onRequest,
  draggable,
}: {
  card: PipelineCard;
  status: string;
  busy: boolean;
  onRequest: (card: PipelineCard, to: MovableStatus) => void;
  draggable: boolean;
}) {
  const targets = targetsFor(status);
  const inStage = days(card.stageSince);

  return (
    <div
      className={`rounded border border-line bg-paper p-3 ${
        busy ? "opacity-60" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/admin/leads/${card.id}` as never}
          className="link-draw data-inline font-mono text-sm font-medium"
        >
          {card.reg}
        </Link>
        <span className="data-inline shrink-0 text-caption text-structure">
          {inStage}d
        </span>
      </div>
      <p className="mt-1 text-caption text-structure">{vehicleName(card)}</p>
      {firstName(card.name) && (
        <p className="text-caption">{firstName(card.name)}</p>
      )}
      {card.nextContactDate && (
        <p className="data-inline mt-1 text-caption text-oxblood">
          follow up {card.nextContactDate}
        </p>
      )}

      <Pnl card={card} />

      {/*
        * Select-and-submit, kept. It is the only control on a phone,
        * the only one reachable by keyboard, and the only one that
        * survives a dragged card being dropped two pixels outside the
        * column. It offers exactly the legal targets, so the list is
        * also the documentation.
        */}
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor={`move-${card.id}`}>
          Move {card.reg} to
        </label>
        <select
          id={`move-${card.id}`}
          value=""
          disabled={busy || targets.length === 0}
          onChange={(event) => {
            const to = event.target.value as MovableStatus;
            event.currentTarget.value = "";
            if (to) onRequest(card, to);
          }}
          className="min-h-9 min-w-0 flex-1 rounded border border-line bg-paper px-2 text-caption disabled:opacity-50"
        >
          <option value="">
            {targets.length === 0 ? "Stays here" : "Move to…"}
          </option>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target}
              {edgeKind(status, target) === "correction" ? " (back)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Pnl({ card }: { card: PipelineCard }) {
  const { pnl } = card;
  return (
    <dl className="mt-3 space-y-1 text-caption">
      <Row label="Paid" empty="no accepted offer" value={pnl.purchase} />
      <div className="flex justify-between gap-2">
        <dt className="text-structure">Costs</dt>
        <dd className={pnl.costsRecorded ? "font-mono" : "text-structure"}>
          {pnl.costsRecorded
            ? `${money(pnl.costs)} · ${pnl.costLines.length}`
            : "none logged"}
        </dd>
      </div>
      <Row label="Sold" empty="not sold" value={pnl.proceeds} />
      <div className="mt-1 flex justify-between gap-2 border-t border-line pt-1">
        <dt className="font-medium">Margin</dt>
        <dd>
          {pnl.margin === null ? (
            <span className="text-structure">not calculated</span>
          ) : (
            <span
              className={`font-mono font-medium ${pnl.margin < 0 ? "text-oxblood" : ""}`}
            >
              {money(pnl.margin)}
              {pnl.marginProvisional && (
                <span className="ml-1 font-sans text-structure">before costs</span>
              )}
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function Row({
  label,
  empty,
  value,
}: {
  label: string;
  empty: string;
  value: number | null;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-structure">{label}</dt>
      <dd className={value === null ? "text-structure" : "font-mono"}>
        {value === null ? empty : money(value)}
      </dd>
    </div>
  );
}

/**
 * What a move costs before it is written.
 *
 * Three shapes behind one dialog, because they are the same moment:
 * the board has moved a card and is waiting to be told it may keep
 * it. Cancelling writes nothing and puts the card back — the card is
 * only optimistically moved after this returns, not before.
 */
function MoveDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: Pending;
  onCancel: () => void;
  onConfirm: (
    extra: { reason?: string; note?: string },
    offer?: { amount: number; note?: string },
  ) => void;
}) {
  const { card, to, demand } = pending;
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const name = `${card.reg} · ${vehicleName(card)}`;

  const title =
    demand === "offer"
      ? "Record an offer"
      : demand === "reason"
        ? `Why is ${card.reg} leaving the pipeline?`
        : `Mark ${card.reg} as ${to}?`;

  const valid =
    demand === "offer"
      ? Number(amount) > 0
      : demand === "reason"
        ? reason !== ""
        : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded border border-line bg-paper p-5">
        <h2 className="font-display text-xl">{title}</h2>
        <p className="data-inline mt-1 text-caption text-structure">{name}</p>

        {demand === "offer" && (
          <>
            <p className="mt-3 text-caption text-structure">
              A person types this number. Nothing in this dashboard
              calculates it, and nothing sends it.
            </p>
            <label className="mt-4 block text-caption text-structure" htmlFor="amount">
              Amount, pounds
            </label>
            <input
              id="amount"
              type="number"
              min={1}
              value={amount}
              autoFocus
              onChange={(event) => setAmount(event.target.value)}
              className="data-inline mt-1 min-h-11 w-full rounded border border-line bg-paper px-3 font-mono"
            />
          </>
        )}

        {demand === "reason" && (
          <fieldset className="mt-4">
            <legend className="sr-only">Reason</legend>
            {LOSS_REASONS.map((option, index) => (
              <label
                key={option.value}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="radio"
                  name="reason"
                  value={option.value}
                  autoFocus={index === 0}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="size-4 accent-oxblood"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        )}

        {demand === "confirm" && (
          <p className="mt-3 text-sm">
            This is the last stage. The realised margin is computed from
            sold cars, so a car does not move back out of it.
          </p>
        )}

        <label className="mt-4 block text-caption text-structure" htmlFor="move-note">
          Note{demand === "confirm" ? "" : " (optional)"}
        </label>
        <textarea
          id="move-note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-1 w-full rounded border border-line bg-paper px-3 py-2 text-sm"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded border border-line px-4 text-sm hover:border-oxblood"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() =>
              demand === "offer"
                ? onConfirm({}, { amount: Number(amount), note: note || undefined })
                : onConfirm({ reason: reason || undefined, note: note || undefined })
            }
            className="min-h-11 rounded bg-oxblood px-4 text-sm font-medium text-paper hover:bg-oxblood-lt disabled:opacity-40"
          >
            {demand === "offer"
              ? "Record offer"
              : demand === "reason"
                ? "Move it"
                : `Mark ${to}`}
          </button>
        </div>
      </div>
    </div>
  );
}
