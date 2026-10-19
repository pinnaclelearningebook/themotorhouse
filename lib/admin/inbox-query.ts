import "server-only";
import { db } from "@/lib/db";
import { excludeTestLeads } from "@/lib/admin/exclusions";
import { normaliseReg } from "@/lib/reg";
import type { ContactMethod } from "@/lib/validation";

/**
 * The inbox query: filtered, sorted and paginated in Postgres.
 *
 * The old one fetched two hundred rows and did all three in
 * JavaScript, which is fine at two hundred and wrong at a thousand —
 * it caps silently rather than slowing down, so the failure is a
 * missing lead rather than a slow page, and nobody notices.
 *
 * So everything that can be a database concern is one. The page
 * fetches its own fifty rows and an exact count; the only work left
 * here is stitching on the vehicle, the latest enrichment and whether
 * an offer exists, each one query over the ids on this page.
 */

export const PAGE_SIZE = 50;

export const SORTABLE = [
  "reg",
  "car",
  "name",
  "method",
  "status",
  "received",
  "activity",
  "score",
] as const;
export type SortKey = (typeof SORTABLE)[number];

/** Which lead column each sort key maps to, where one exists. */
const SORT_COLUMN: Partial<Record<SortKey, string>> = {
  reg: "reg",
  name: "name",
  method: "preferred_contact_method",
  status: "status",
  received: "created_at",
  activity: "updated_at",
};

export interface InboxFilters {
  status: string | null;
  make: string | null;
  model: string | null;
  method: ContactMethod | null;
  from: string | null;
  to: string | null;
  /** "yes" | "no" | null */
  offer: string | null;
  /** Show rows with no contact details, which are drop-off not work. */
  incomplete: boolean;
  /** Only leads past the SLA. */
  overSla: boolean;
  search: string | null;
  sort: SortKey;
  direction: "asc" | "desc";
  page: number;
}

export const DEFAULT_FILTERS: InboxFilters = {
  status: null,
  make: null,
  model: null,
  method: null,
  from: null,
  to: null,
  offer: null,
  incomplete: false,
  overSla: false,
  search: null,
  sort: "score",
  direction: "desc",
  page: 1,
};

/** Parse the query string. Anything unrecognised falls back silently. */
export function filtersFromParams(
  params: Record<string, string | string[] | undefined>,
): InboxFilters {
  const one = (key: string): string | null => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first && first.length > 0 ? first : null;
  };
  const sort = one("sort");
  const direction = one("dir");
  const page = Number(one("page") ?? 1);
  return {
    status: one("status"),
    make: one("make"),
    model: one("model"),
    method: (one("method") as ContactMethod) ?? null,
    from: one("from"),
    to: one("to"),
    offer: one("offer"),
    incomplete: one("incomplete") === "1",
    overSla: one("sla") === "over",
    search: one("q"),
    sort: (SORTABLE as readonly string[]).includes(sort ?? "")
      ? (sort as SortKey)
      : "score",
    direction: direction === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

/** Back to a query string, so a filtered view is a URL you can send. */
export function paramsFromFilters(filters: InboxFilters): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | null | undefined) => {
    if (value) params.set(key, value);
  };
  set("status", filters.status);
  set("make", filters.make);
  set("model", filters.model);
  set("method", filters.method);
  set("from", filters.from);
  set("to", filters.to);
  set("offer", filters.offer);
  if (filters.incomplete) params.set("incomplete", "1");
  if (filters.overSla) params.set("sla", "over");
  set("q", filters.search);
  if (filters.sort !== "score") params.set("sort", filters.sort);
  if (filters.direction !== "desc") params.set("dir", filters.direction);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveFilters(filters: InboxFilters): boolean {
  return Boolean(
    filters.status ||
      filters.make ||
      filters.model ||
      filters.method ||
      filters.from ||
      filters.to ||
      filters.offer ||
      filters.incomplete ||
      filters.overSla ||
      filters.search,
  );
}

export interface InboxRow {
  id: string;
  reg: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  method: ContactMethod | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  incomplete: boolean;
  make: string | null;
  model: string | null;
  year: number | null;
  score: number | null;
  recommendedChannel: string | null;
  flagCount: number;
  pending: boolean;
  hasOffer: boolean;
  offerAmount: number | null;
}

export interface InboxPage {
  rows: InboxRow[];
  total: number;
  page: number;
  pages: number;
  slaHours: number | null;
  /** Every make present in the data, for the filter's options. */
  makes: string[];
}

export async function inboxPage(filters: InboxFilters): Promise<InboxPage> {
  const { data: slaRow } = await db()
    .from("settings")
    .select("value")
    .eq("key", "sla_hours")
    .maybeSingle();
  const slaHours =
    typeof slaRow?.value === "number" ? (slaRow.value as number) : null;

  /*
   * "Has an offer" is a different table, so it becomes a list of ids.
   * Offers are rare next to leads — a handful against a thousand — so
   * pulling every lead_id that has one is a small query, and it keeps
   * the filter in the database rather than trimming a page after the
   * fact, which would leave pages of uneven size.
   */
  const { data: offerRows } = await db()
    .from("offers")
    .select("lead_id, amount, made_at")
    .order("made_at", { ascending: false })
    .limit(2000);
  const latestOffer = new Map<string, number>();
  for (const row of offerRows ?? []) {
    const id = row.lead_id as string;
    if (!latestOffer.has(id)) latestOffer.set(id, row.amount as number);
  }
  const withOffers = [...latestOffer.keys()];

  let query = excludeTestLeads(
    db()
      .from("leads")
      .select(
        "id, reg, name, phone, email, preferred_contact_method, status, created_at, updated_at, completed_at, vehicle_id, pending_enrichment",
        { count: "exact" },
      ),
  );

  if (!filters.incomplete) query = query.not("completed_at", "is", null);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.method) query = query.eq("preferred_contact_method", filters.method);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);
  if (filters.search) {
    const term = filters.search.trim();
    const reg = normaliseReg(term).replace(/\s/g, "");
    query = query.or(
      [
        `reg.ilike.%${reg}%`,
        `name.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `email.ilike.%${term}%`,
      ].join(","),
    );
  }
  if (filters.offer === "yes") {
    query = withOffers.length
      ? query.in("id", withOffers)
      : // No offers exist at all, so nothing can match. An impossible
        // filter is honest here; the alternative is showing every lead
        // under a filter that says the opposite.
        query.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (filters.offer === "no" && withOffers.length) {
    query = query.not("id", "in", `(${withOffers.join(",")})`);
  }
  if (filters.overSla && slaHours !== null) {
    const cutoff = new Date(Date.now() - slaHours * 3_600_000).toISOString();
    query = query.eq("status", "new").lt("created_at", cutoff);
  }

  /*
   * Make and model live on `vehicles`. PostgREST can filter across the
   * relationship, but only with an inner join, which would also drop
   * every lead whose lookup never returned a vehicle — most of them,
   * while DVLA is unconfigured. So the ids are resolved first and the
   * filter becomes an `in`, which keeps those leads visible when the
   * filter is not in use.
   */
  if (filters.make || filters.model) {
    let vehicles = db().from("vehicles").select("id");
    if (filters.make) vehicles = vehicles.ilike("make", filters.make);
    if (filters.model) vehicles = vehicles.ilike("model", `%${filters.model}%`);
    const { data: matched } = await vehicles.limit(2000);
    const ids = (matched ?? []).map((row) => row.id as string);
    query = ids.length
      ? query.in("vehicle_id", ids)
      : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const column = SORT_COLUMN[filters.sort];
  if (column) {
    query = query.order(column, {
      ascending: filters.direction === "asc",
      nullsFirst: false,
    });
  } else {
    // Score and car are not lead columns. Both are stitched on below,
    // so the page is ordered newest-first in the database and sorted
    // within itself afterwards — see the note on the sort there.
    query = query.order("created_at", { ascending: false });
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const leads = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const ids = leads.map((lead) => lead.id as string);
  const vehicleIds = leads
    .map((lead) => lead.vehicle_id as string | null)
    .filter((id): id is string => Boolean(id));

  const [{ data: enrichments }, { data: vehicles }, { data: allMakes }] =
    await Promise.all([
      ids.length
        ? db()
            .from("enrichments")
            .select("lead_id, version, score, recommended_channel, flags")
            .in("lead_id", ids)
            .order("version", { ascending: false })
        : Promise.resolve({ data: [] }),
      vehicleIds.length
        ? db()
            .from("vehicles")
            .select("id, make, model, year_of_manufacture")
            .in("id", vehicleIds)
        : Promise.resolve({ data: [] }),
      db().from("vehicles").select("make").not("make", "is", null).limit(1000),
    ]);

  const latest = new Map<string, Record<string, unknown>>();
  for (const row of enrichments ?? []) {
    const id = row.lead_id as string;
    if (!latest.has(id)) latest.set(id, row as Record<string, unknown>);
  }
  const vehicleById = new Map(
    (vehicles ?? []).map((v) => [v.id as string, v as Record<string, unknown>]),
  );

  const rows: InboxRow[] = leads.map((lead) => {
    const enrichment = latest.get(lead.id as string);
    const vehicle = lead.vehicle_id
      ? vehicleById.get(lead.vehicle_id as string)
      : undefined;
    return {
      id: lead.id as string,
      reg: lead.reg as string,
      name: (lead.name as string) ?? null,
      phone: (lead.phone as string) ?? null,
      email: (lead.email as string) ?? null,
      method: (lead.preferred_contact_method as ContactMethod) ?? null,
      status: lead.status as string,
      createdAt: lead.created_at as string,
      updatedAt: lead.updated_at as string,
      incomplete: !lead.completed_at,
      make: (vehicle?.make as string) ?? null,
      model: (vehicle?.model as string) ?? null,
      year: (vehicle?.year_of_manufacture as number) ?? null,
      score: enrichment ? ((enrichment.score as number) ?? null) : null,
      recommendedChannel: enrichment
        ? ((enrichment.recommended_channel as string) ?? null)
        : null,
      flagCount: enrichment ? ((enrichment.flags as string[]) ?? []).length : 0,
      pending: Boolean(lead.pending_enrichment),
      hasOffer: latestOffer.has(lead.id as string),
      offerAmount: latestOffer.get(lead.id as string) ?? null,
    };
  });

  /*
   * Score and car are sorted within the page, not across the set.
   *
   * Both live on other tables, and ordering a thousand leads by a
   * joined column needs a view or an RPC. Sorting the fifty rows in
   * front of the operator is honest for what it is and is not
   * pretending to be a global ordering — the column header says so.
   */
  if (filters.sort === "score" || filters.sort === "car") {
    const sign = filters.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (filters.sort === "score") {
        return sign * ((a.score ?? -1) - (b.score ?? -1));
      }
      const left = `${a.make ?? ""} ${a.model ?? ""}`.trim();
      const right = `${b.make ?? ""} ${b.model ?? ""}`.trim();
      return sign * left.localeCompare(right);
    });
  }

  const makes = [
    ...new Set(
      (allMakes ?? [])
        .map((row) => (row.make as string) ?? "")
        .filter(Boolean)
        .map((make) => make.toUpperCase()),
    ),
  ].sort();

  const total = count ?? rows.length;
  return {
    rows,
    total,
    page: filters.page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    slaHours,
    makes,
  };
}
