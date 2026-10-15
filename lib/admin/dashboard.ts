import "server-only";
import { db } from "@/lib/db";
import { excludeTestLeads } from "@/lib/admin/exclusions";
import type { ContactMethod } from "@/lib/validation";

/**
 * Everything the dashboard shows, counted from rows we hold.
 *
 * Nothing here is projected, modelled or estimated. There is no
 * "expected revenue", no conversion forecast and no margin until a
 * car has actually sold — the decision engine's projections live on
 * the lead where a person is looking at the inputs, not on a landing
 * page where they read as fact (CLAUDE.md section 11).
 *
 * Every series can legitimately be empty. The page renders an empty
 * state rather than a zeroed chart, because a chart of nothing still
 * looks like a measurement.
 */

export interface DashboardData {
  newToday: number;
  newThisWeek: number;
  awaitingFirstContact: number;
  overSla: number;
  offersOut: number;
  accepted: number;
  collectedThisMonth: number;
  slaHours: number | null;
  leadsPerWeek: Array<{ week: string; count: number }>;
  funnel: { confirmedCar: number; reachedSale: number; reachedContact: number; completed: number };
  byMethod: Array<{ method: ContactMethod | "not asked"; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  needsYou: {
    overSla: NeedsYouRow[];
    dueToday: NeedsYouRow[];
    offersExpiring: NeedsYouRow[];
  };
}

export interface NeedsYouRow {
  id: string;
  reg: string;
  name: string | null;
  detail: string;
}

interface LeadRow {
  id: string;
  reg: string;
  name: string | null;
  status: string;
  source: string | null;
  created_at: string;
  completed_at: string | null;
  furthest_step: number;
  preferred_contact_method: ContactMethod | null;
  next_contact_date: string | null;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  // Monday, because an operator's week does.
  const day = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - day);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export async function dashboardData(): Promise<DashboardData> {
  const { data: slaRow } = await db()
    .from("settings")
    .select("value")
    .eq("key", "sla_hours")
    .maybeSingle();
  const slaHours =
    typeof slaRow?.value === "number" ? (slaRow.value as number) : null;

  const { data } = await excludeTestLeads(
    db()
      .from("leads")
      .select(
        "id, reg, name, status, source, created_at, completed_at, furthest_step, preferred_contact_method, next_contact_date",
      ),
  )
    .order("created_at", { ascending: false })
    .limit(1000);

  const leads = (data ?? []) as unknown as LeadRow[];
  // A row with no contact details is drop-off data, not a lead anyone
  // can act on, so it counts in the funnel and nowhere else.
  const real = leads.filter((lead) => lead.completed_at !== null);

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const hoursSince = (iso: string) =>
    (now.getTime() - new Date(iso).getTime()) / 3_600_000;

  const overSlaLeads =
    slaHours === null
      ? []
      : real.filter(
          (lead) => lead.status === "new" && hoursSince(lead.created_at) > slaHours,
        );

  const dueToday = real.filter(
    (lead) =>
      lead.next_contact_date !== null && lead.next_contact_date <= todayIso,
  );

  /* ─── offers expiring ─────────────────────────────────────────── */
  const { data: offerRows } = await db()
    .from("offers")
    .select("id, lead_id, amount, valid_until, status")
    .eq("status", "sent")
    .order("valid_until", { ascending: true })
    .limit(100);

  const byId = new Map(real.map((lead) => [lead.id, lead]));
  const inTwoDays = new Date(now.getTime() + 48 * 3_600_000)
    .toISOString()
    .slice(0, 10);
  const expiring = (offerRows ?? [])
    .filter((offer) => {
      const lead = byId.get(offer.lead_id as string);
      const until = offer.valid_until as string | null;
      return Boolean(lead) && until !== null && until <= inTwoDays;
    })
    .map((offer) => {
      const lead = byId.get(offer.lead_id as string) as LeadRow;
      return {
        id: lead.id,
        reg: lead.reg,
        name: lead.name,
        detail: `Offer expires ${offer.valid_until}`,
      };
    });

  /* ─── series ──────────────────────────────────────────────────── */
  const weeks = new Map<string, number>();
  for (let index = 7; index >= 0; index -= 1) {
    const start = new Date(weekStart);
    start.setUTCDate(start.getUTCDate() - index * 7);
    weeks.set(start.toISOString().slice(0, 10), 0);
  }
  for (const lead of real) {
    const key = startOfWeek(new Date(lead.created_at)).toISOString().slice(0, 10);
    if (weeks.has(key)) weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }

  const methodCounts = new Map<ContactMethod | "not asked", number>();
  for (const lead of real) {
    const key = lead.preferred_contact_method ?? "not asked";
    methodCounts.set(key, (methodCounts.get(key) ?? 0) + 1);
  }

  const sourceCounts = new Map<string, number>();
  for (const lead of real) {
    const key = lead.source ?? "Direct";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }

  return {
    newToday: real.filter((lead) => lead.created_at.slice(0, 10) === todayIso).length,
    newThisWeek: real.filter((lead) => new Date(lead.created_at) >= weekStart).length,
    awaitingFirstContact: real.filter((lead) => lead.status === "new").length,
    overSla: overSlaLeads.length,
    offersOut: real.filter((lead) => lead.status === "offered").length,
    accepted: real.filter((lead) => lead.status === "accepted").length,
    collectedThisMonth: real.filter(
      (lead) => lead.status === "collected" && new Date(lead.created_at) >= monthStart,
    ).length,
    slaHours,
    leadsPerWeek: [...weeks].map(([week, count]) => ({ week, count })),
    funnel: {
      confirmedCar: leads.length,
      reachedSale: leads.filter((lead) => lead.furthest_step >= 3).length,
      reachedContact: leads.filter((lead) => lead.furthest_step >= 4).length,
      completed: real.length,
    },
    byMethod: [...methodCounts]
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count),
    bySource: [...sourceCounts]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    needsYou: {
      overSla: overSlaLeads.map((lead) => ({
        id: lead.id,
        reg: lead.reg,
        name: lead.name,
        detail: `${Math.round(hoursSince(lead.created_at))}h waiting`,
      })),
      dueToday: dueToday.map((lead) => ({
        id: lead.id,
        reg: lead.reg,
        name: lead.name,
        detail:
          lead.next_contact_date === todayIso
            ? "Due today"
            : `Overdue since ${lead.next_contact_date}`,
      })),
      offersExpiring: expiring,
    },
  };
}
