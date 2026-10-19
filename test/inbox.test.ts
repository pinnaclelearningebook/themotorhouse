import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  SORTABLE,
  filtersFromParams,
  hasActiveFilters,
  paramsFromFilters,
  type InboxFilters,
} from "@/lib/admin/inbox-query";

/**
 * The inbox table's rules, the ones that are not obvious from looking
 * at it.
 *
 * A filtered view has to be a URL. Not because anyone asked for
 * bookmarks, but because the alternative — filter state in React —
 * means an operator who finds the four cars worth ringing cannot send
 * that list to anyone, cannot reload without losing it, and cannot
 * open one in a new tab and come back. Every assertion about the
 * query string below is really an assertion about that.
 */

function filters(over: Partial<InboxFilters> = {}): InboxFilters {
  return { ...DEFAULT_FILTERS, ...over };
}

describe("inbox filters", () => {
  it("survive a round trip through the URL", () => {
    const original = filters({
      status: "contacted",
      make: "Land Rover",
      model: "Discovery Sport",
      method: "whatsapp",
      from: "2026-10-01",
      to: "2026-10-15",
      offer: "no",
      incomplete: true,
      overSla: true,
      search: "RV23",
      sort: "received",
      direction: "asc",
      page: 3,
    });

    const query = paramsFromFilters(original);
    const params = Object.fromEntries(new URLSearchParams(query.slice(1)));

    expect(filtersFromParams(params)).toEqual(original);
  });

  it("put nothing in the URL when nothing is filtered", () => {
    // A bare /admin/inbox has to stay bare, or every navigation
    // produces a different-looking URL for the same view.
    expect(paramsFromFilters(DEFAULT_FILTERS)).toBe("");
    expect(filtersFromParams({})).toEqual(DEFAULT_FILTERS);
  });

  it("fall back rather than throw on a hand-edited URL", () => {
    const parsed = filtersFromParams({
      sort: "wages",
      dir: "sideways",
      page: "-4",
      status: "",
    });
    expect(parsed.sort).toBe("score");
    expect(parsed.direction).toBe("desc");
    expect(parsed.page).toBe(1);
    expect(parsed.status).toBeNull();
  });

  it("know the difference between no leads and no matches", () => {
    // The two empty states are not cosmetic. "No leads yet" after a
    // quiet morning is correct; the same words on a filtered view is
    // a lie that sends someone looking for a bug in the form.
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ status: "offered" }))).toBe(true);
    expect(hasActiveFilters(filters({ incomplete: true }))).toBe(true);
    expect(hasActiveFilters(filters({ search: "AB12" }))).toBe(true);
    // Sorting and paging are not filtering: page 9 of an unfiltered
    // inbox is still "no leads yet", and offering to clear filters
    // there would clear nothing.
    expect(hasActiveFilters(filters({ sort: "reg", page: 9 }))).toBe(false);
  });

  it("offers both empty states and a way out of the filtered one", () => {
    const table = readFileSync("components/admin/InboxTable.tsx", "utf8");
    expect(table).toMatch(/No leads match/i);
    expect(table).toMatch(/Clear filters/i);
  });
});

describe("inbox paging", () => {
  it("asks Postgres for one page, not for every lead", () => {
    // The table has to stay usable at a thousand leads. Filtering in
    // Node means fetching a thousand rows to show fifty, and a count
    // that disagrees with the rows as soon as a filter is applied.
    const query = readFileSync("lib/admin/inbox-query.ts", "utf8");
    expect(query).toMatch(/\.range\(/);
    expect(query).toMatch(/count:\s*"exact"/);
    expect(PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  it("sorts only by columns it has", () => {
    for (const key of SORTABLE) {
      expect(filtersFromParams({ sort: key }).sort).toBe(key);
    }
  });
});

describe("bulk changes", () => {
  const actions = readFileSync("app/admin/(workspace)/inbox/actions.ts", "utf8");

  it("write one audit row per lead, with the old value", () => {
    // A single row saying "12 leads moved to contacted" cannot answer
    // the only question anyone asks of an audit log a month later,
    // which is what happened to *this* car.
    expect(actions).toMatch(/changing\.map\(/);
    expect(actions).toMatch(/before:\s*\{/);
    expect(actions).toMatch(/after:\s*\{/);
  });

  it("record who made the change", () => {
    expect(actions).toMatch(/currentAdmin\(\)/);
    expect(actions).toMatch(/actor:/);
  });

  it("expose nothing that makes or sends an offer", () => {
    // CLAUDE.md section 1: no auto-offer path anywhere. A bulk action
    // is where one would be most tempting and most damaging — fifty
    // cars priced by a loop is the whole failure mode in one click.
    // Only the exported surface is checked: the file's own comment
    // explains why there is no bulk offer, and should keep saying so.
    const exported = [...actions.matchAll(/export async function (\w+)/g)].map(
      (match) => match[1],
    );
    expect(exported.length).toBeGreaterThan(0);
    for (const name of exported) {
      expect(name, `${name} reads as an offer path`).not.toMatch(/offer|bid|price/i);
    }
  });

  it("are confirmed before they run", () => {
    const table = readFileSync("components/admin/InboxTable.tsx", "utf8");
    expect(table).toMatch(/ConfirmButton/);
  });
});
