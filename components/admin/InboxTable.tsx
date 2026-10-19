"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox, SearchX } from "lucide-react";
import { formatReg } from "@/lib/reg";
import { titleCaseVehicle } from "@/lib/format";
import { StatusBadge, Badge } from "@/components/admin/ui/Badge";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { ConfirmButton } from "@/components/admin/ui/ConfirmButton";
import { useToast } from "@/components/admin/ui/Toast";
import { METHOD_BADGE, contactAction } from "@/lib/admin/contact";
import { bulkSetFollowUp, bulkSetStatus } from "@/app/admin/(workspace)/inbox/actions";
import type { InboxRow, SortKey } from "@/lib/admin/inbox-query";

/**
 * The queue, as a table you can work from.
 *
 * Every filter and the sort live in the URL, so a view is a link: an
 * operator can bookmark "WhatsApp leads over SLA" or paste it to the
 * other one, and the back button does what it looks like it does.
 * That is also why this component never holds filter state itself —
 * the URL is the state, and `router.push` is how it changes.
 *
 * Selection is the exception. It is per-visit and meaningless to
 * anyone else, so it stays in React and is cleared whenever the rows
 * underneath it change.
 */

const COLUMNS: Array<{ key: SortKey; label: string; className?: string; note?: string }> = [
  { key: "score", label: "Score", className: "w-16", note: "Sorted within this page" },
  { key: "reg", label: "Reg", className: "w-32" },
  { key: "car", label: "Car", note: "Sorted within this page" },
  { key: "name", label: "Seller" },
  { key: "method", label: "Contact", className: "w-28" },
  { key: "status", label: "Status", className: "w-28" },
  { key: "received", label: "Received", className: "w-24" },
  { key: "activity", label: "Last activity", className: "w-28" },
];

const STATUSES = [
  "new", "contacted", "offered", "accepted",
  "collected", "listed", "shipped", "sold", "declined", "lost",
];

function hours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function ago(iso: string): string {
  const value = hours(iso);
  if (value < 1) return `${Math.max(1, Math.round(value * 60))}m`;
  if (value < 48) return `${Math.round(value)}h`;
  return `${Math.round(value / 24)}d`;
}

/**
 * The three things a row needs that are not columns of it. Shared so
 * the card and the table cannot drift — an SLA marker that appears on
 * one and not the other is worse than neither.
 */
function derive(row: InboxRow, slaHours: number | null) {
  return {
    breached:
      slaHours !== null &&
      row.status === "new" &&
      hours(row.createdAt) > slaHours,
    car: [
      row.make ? titleCaseVehicle(row.make) : null,
      row.model ? titleCaseVehicle(row.model) : null,
      row.year,
    ]
      .filter(Boolean)
      .join(" "),
    action: row.method
      ? contactAction(row.method, { phone: row.phone, email: row.email })
      : null,
  };
}

export function InboxTable({
  rows,
  total,
  page,
  pages,
  slaHours,
  makes,
  filtered,
}: {
  rows: InboxRow[];
  total: number;
  page: number;
  pages: number;
  slaHours: number | null;
  makes: string[];
  filtered: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("contacted");
  const [bulkDate, setBulkDate] = useState("");

  /** Rows change → the selection no longer refers to what is on screen. */
  const rowKey = useMemo(() => rows.map((row) => row.id).join(","), [rows]);
  const [seenKey, setSeenKey] = useState(rowKey);
  if (seenKey !== rowKey) {
    setSeenKey(rowKey);
    if (selected.size > 0) setSelected(new Set());
  }

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any change to what is being shown resets the page; staying on
    // page 4 of a two-page result is an empty screen with no clue why.
    if (!("page" in changes)) next.delete("page");
    router.push(`/admin/inbox?${next.toString()}` as never);
  };

  const sort = (params.get("sort") ?? "score") as SortKey;
  const direction = params.get("dir") === "asc" ? "asc" : "desc";

  const toggleSort = (key: SortKey) => {
    update({
      sort: key,
      dir: sort === key && direction === "desc" ? "asc" : "desc",
    });
  };

  const allOnPage = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggleAll = () => {
    setSelected(allOnPage ? new Set() : new Set(rows.map((row) => row.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = (
    run: () => Promise<{ ok: boolean; message: string }>,
  ) => {
    startTransition(async () => {
      const result = await run();
      toast.show(result.message, result.ok ? "ok" : "error");
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  return (
    <div>
      {/* ─── filters ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2 rounded border border-line bg-paper-warm p-3">
        <Field label="Search">
          <input
            type="search"
            defaultValue={params.get("q") ?? ""}
            onBlur={(event) => update({ q: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") update({ q: event.currentTarget.value });
            }}
            placeholder="Reg, name, phone"
            className="h-9 w-40 rounded border border-line bg-paper px-2 text-sm"
          />
        </Field>
        <Field label="Status">
          <Select
            value={params.get("status") ?? ""}
            onChange={(value) => update({ status: value })}
            options={[["", "Any"], ...STATUSES.map((s) => [s, s] as [string, string])]}
          />
        </Field>
        <Field label="Make">
          <Select
            value={params.get("make") ?? ""}
            onChange={(value) => update({ make: value })}
            options={[["", "Any"], ...makes.map((m) => [m, titleCaseVehicle(m)] as [string, string])]}
          />
        </Field>
        <Field label="Model">
          <input
            type="search"
            defaultValue={params.get("model") ?? ""}
            onBlur={(event) => update({ model: event.target.value })}
            placeholder="Any"
            className="h-9 w-28 rounded border border-line bg-paper px-2 text-sm"
          />
        </Field>
        <Field label="Contact">
          <Select
            value={params.get("method") ?? ""}
            onChange={(value) => update({ method: value })}
            options={[
              ["", "Any"],
              ["call", "Phone call"],
              ["whatsapp", "WhatsApp"],
              ["sms", "Text message"],
              ["email", "Email"],
            ]}
          />
        </Field>
        <Field label="Offer">
          <Select
            value={params.get("offer") ?? ""}
            onChange={(value) => update({ offer: value })}
            options={[["", "Any"], ["yes", "Has offer"], ["no", "No offer"]]}
          />
        </Field>
        <Field label="From">
          <input
            type="date"
            defaultValue={params.get("from") ?? ""}
            onChange={(event) => update({ from: event.target.value })}
            className="h-9 rounded border border-line bg-paper px-2 text-sm"
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            defaultValue={params.get("to") ?? ""}
            onChange={(event) => update({ to: event.target.value })}
            className="h-9 rounded border border-line bg-paper px-2 text-sm"
          />
        </Field>
        <label className="flex min-h-9 items-center gap-2 text-caption text-structure">
          <input
            type="checkbox"
            checked={params.get("sla") === "over"}
            onChange={(event) => update({ sla: event.target.checked ? "over" : null })}
            className="size-4 accent-oxblood"
          />
          Over SLA
        </label>
        <label className="flex min-h-9 items-center gap-2 text-caption text-structure">
          <input
            type="checkbox"
            checked={params.get("incomplete") === "1"}
            onChange={(event) => update({ incomplete: event.target.checked ? "1" : null })}
            className="size-4 accent-oxblood"
          />
          Incomplete
        </label>
        {filtered && (
          <Link
            href="/admin/inbox"
            className="ml-auto inline-flex min-h-9 items-center rounded border border-line bg-paper px-3 text-caption transition-colors duration-200 hover:border-oxblood"
          >
            Clear filters
          </Link>
        )}
      </div>

      {/* ─── bulk bar ────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded border border-oxblood bg-paper p-3">
          <p className="data-inline min-h-9 self-center text-sm">
            {selected.size} selected
          </p>
          <Field label="Set status">
            <Select
              value={bulkStatus}
              onChange={setBulkStatus}
              options={STATUSES.map((s) => [s, s] as [string, string])}
            />
          </Field>
          <ConfirmButton
            pending={pending}
            title={`Change ${selected.size} lead${selected.size === 1 ? "" : "s"}?`}
            body={`Status becomes “${bulkStatus}”. Each lead gets its own audit entry naming you and the previous value. Leads already at that status are left alone.`}
            confirmLabel="Change status"
            onConfirm={() =>
              runBulk(() =>
                bulkSetStatus({ ids: [...selected], status: bulkStatus }),
              )
            }
            className="inline-flex min-h-9 items-center rounded bg-ink px-3 text-sm text-paper transition-colors duration-200 hover:bg-ink-soft disabled:opacity-60"
          >
            Apply
          </ConfirmButton>

          <Field label="Follow-up date">
            <input
              type="date"
              value={bulkDate}
              onChange={(event) => setBulkDate(event.target.value)}
              className="h-9 rounded border border-line bg-paper px-2 text-sm"
            />
          </Field>
          <ConfirmButton
            pending={pending}
            title={`Set a follow-up on ${selected.size} lead${selected.size === 1 ? "" : "s"}?`}
            body={
              bulkDate
                ? `They will appear in Follow-ups on ${bulkDate}. Each lead gets its own audit entry.`
                : "Clearing the date takes them off the Follow-ups list. Each lead gets its own audit entry."
            }
            confirmLabel={bulkDate ? "Set date" : "Clear date"}
            onConfirm={() =>
              runBulk(() =>
                bulkSetFollowUp({ ids: [...selected], date: bulkDate }),
              )
            }
            className="inline-flex min-h-9 items-center rounded border border-line px-3 text-sm transition-colors duration-200 hover:border-oxblood disabled:opacity-60"
          >
            Apply
          </ConfirmButton>
        </div>
      )}

      {/* ─── the table ───────────────────────────────────────── */}
      {rows.length === 0 && (
        <div className="mt-4">
          {filtered ? (
            <EmptyState icon={SearchX} title="No leads match these filters">
              Nothing in the queue fits what you have selected. Clear the
              filters to see everything, or widen one of them.
              <span className="mt-4 block">
                <Link
                  href="/admin/inbox"
                  className="inline-flex min-h-11 items-center rounded bg-oxblood px-4 text-sm font-medium text-paper transition-colors duration-200 hover:bg-oxblood-lt"
                >
                  Clear filters
                </Link>
              </span>
            </EmptyState>
          ) : (
            <EmptyState icon={Inbox} title="No leads yet">
              A lead appears here the moment a seller finishes the form and
              gives their contact details. Rows where someone confirmed a car
              and stopped are kept too — tick “Incomplete” to see them.
            </EmptyState>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/*
            * Cards on a phone, the table from `lg`.
            *
            * The table was previously shown at every width inside an
            * `overflow-x-auto` wrapper, which at 375px meant nine
            * columns in a 341px window: readable only by scrolling
            * sideways, which loses the registration off the left edge
            * — on the one screen whose whole purpose is deciding who
            * to ring next while standing next to a car.
            */}
          <div className="mt-3 flex lg:hidden">
            {/*
              * The table's select-all lives in its header, which is
              * not rendered here, so the cards need their own or
              * bulk actions are one lead at a time on a phone.
              */}
            <button
              type="button"
              onClick={toggleAll}
              className="min-h-11 text-caption text-structure underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
            >
              {allOnPage ? "Clear selection" : "Select all on this page"}
            </button>
          </div>
          <ul className="flex flex-col gap-2 lg:hidden">
            {rows.map((row) => {
              const { breached, car, action } = derive(row, slaHours);
              return (
                <li
                  key={row.id}
                  className="rounded border border-line p-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${formatReg(row.reg)}`}
                      className="mt-1 size-4 shrink-0 accent-oxblood"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/admin/leads/${row.id}` as never}
                          className="data-inline text-base hover:text-oxblood"
                        >
                          {formatReg(row.reg)}
                        </Link>
                        <span className="data-inline shrink-0 text-caption text-structure">
                          {row.score ?? "—"}
                        </span>
                      </div>
                      <p className="truncate text-sm text-structure">
                        {car || "No vehicle data"}
                      </p>
                      <p className="truncate text-sm">
                        {row.name ?? (
                          <span className="text-structure">No name</span>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={row.status} />
                        {row.method && (
                          <Badge tone="quiet">{METHOD_BADGE[row.method]}</Badge>
                        )}
                        {row.incomplete && (
                          <span className="text-caption text-oxblood">
                            incomplete
                          </span>
                        )}
                        <span
                          className={`data-inline text-caption ${
                            breached ? "font-medium text-oxblood" : "text-structure"
                          }`}
                        >
                          {ago(row.createdAt)}
                          {breached ? " · over SLA" : ""}
                        </span>
                      </div>
                      {action && (
                        <a
                          href={action.href}
                          className="mt-3 inline-flex min-h-11 items-center rounded border border-line px-4 text-sm transition-colors duration-200 hover:border-oxblood hover:text-oxblood"
                        >
                          {action.label}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 hidden overflow-x-auto rounded border border-line lg:block">
            <table className="w-full min-w-200 border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-warm text-left">
                  <th scope="col" className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allOnPage}
                      onChange={toggleAll}
                      aria-label="Select every lead on this page"
                      className="size-4 accent-oxblood"
                    />
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`px-3 py-2 font-medium ${column.className ?? ""}`}
                      aria-sort={
                        sort === column.key
                          ? direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        title={column.note}
                        className="flex items-center gap-1 text-caption tracking-wide text-structure uppercase transition-colors duration-150 hover:text-ink"
                      >
                        {column.label}
                        {sort === column.key ? (
                          direction === "asc" ? (
                            <ArrowUp aria-hidden="true" size={12} />
                          ) : (
                            <ArrowDown aria-hidden="true" size={12} />
                          )
                        ) : (
                          <ChevronsUpDown aria-hidden="true" size={12} className="opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="w-36 px-3 py-2 text-right">
                    <span className="sr-only">Contact</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { breached, car, action } = derive(row, slaHours);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line last:border-b-0 hover:bg-paper-warm"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`Select ${formatReg(row.reg)}`}
                          className="size-4 accent-oxblood"
                        />
                      </td>
                      <td className="data-inline px-3 py-2 text-base">
                        {row.score ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/leads/${row.id}` as never}
                          className="data-inline hover:text-oxblood"
                        >
                          {formatReg(row.reg)}
                        </Link>
                        {row.incomplete && (
                          <span className="ml-2 text-caption text-oxblood">
                            incomplete
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-structure">
                        {car || "No vehicle data"}
                      </td>
                      <td className="px-3 py-2">
                        {row.name ?? <span className="text-structure">No name</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.method ? (
                          <Badge tone="quiet">{METHOD_BADGE[row.method]}</Badge>
                        ) : (
                          <span className="text-caption text-structure">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`data-inline text-caption ${
                            breached ? "font-medium text-oxblood" : "text-structure"
                          }`}
                        >
                          {ago(row.createdAt)}
                        </span>
                        {breached && (
                          <span className="block text-caption text-oxblood">
                            over SLA
                          </span>
                        )}
                      </td>
                      <td className="data-inline px-3 py-2 text-caption text-structure">
                        {ago(row.updatedAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {action && (
                          <a
                            href={action.href}
                            className="inline-flex min-h-9 items-center rounded border border-line px-3 text-caption transition-colors duration-200 hover:border-oxblood hover:text-oxblood"
                          >
                            {action.label}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── pagination ────────────────────────────────── */}
          <div className="mt-3 flex items-center justify-between gap-4 text-caption text-structure">
            <p className="data-inline">
              {total} lead{total === 1 ? "" : "s"} · page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <PageLink
                label="Previous"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              />
              <PageLink
                label="Next"
                disabled={page >= pages}
                onClick={() => update({ page: String(page + 1) })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption tracking-wide text-structure uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded border border-line bg-paper px-2 text-sm capitalize"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function PageLink({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-9 items-center rounded border border-line px-3 transition-colors duration-200 hover:border-oxblood disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
