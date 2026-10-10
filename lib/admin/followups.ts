import "server-only";
import { db } from "@/lib/db";
import { TEST_SOURCE } from "@/lib/admin/voice-test";

/**
 * Follow-ups, driven by next_contact_date.
 *
 * CLAUDE.md section 9 calls "just researching" a follow-up date rather
 * than a dead lead, so the gap this page exists to close is the lead that
 * is waiting on a date nobody set. Those are listed first and separately:
 * an empty follow-up list means nothing is due, not that nothing is owed.
 *
 * Reminders are for the operator. Nothing here messages a seller.
 */

export interface FollowUpRow {
  id: string;
  reg: string;
  name: string | null;
  phone: string | null;
  status: string;
  timeline: string | null;
  nextContactDate: string | null;
  make: string | null;
  model: string | null;
}

export interface FollowUps {
  overdue: FollowUpRow[];
  today: FollowUpRow[];
  soon: FollowUpRow[];
  later: FollowUpRow[];
  /** Open leads with no date set at all — the ones quietly going cold. */
  undated: FollowUpRow[];
  today_iso: string;
}

/** Statuses that are still worth chasing. */
const OPEN = [
  "new",
  "contacted",
  "offered",
  "researching",
] as const;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function followUps(): Promise<FollowUps> {
  const { data: leads } = await db()
    .from("leads")
    .select(
      "id, reg, name, phone, status, timeline, next_contact_date, vehicle_id, created_at",
    )
    .in("status", [...OPEN])
    .or(`source.is.null,source.neq.${TEST_SOURCE}`)
    .order("next_contact_date", { ascending: true, nullsFirst: false })
    .limit(400);

  interface Row {
    id: string;
    reg: string;
    name: string | null;
    phone: string | null;
    status: string;
    timeline: string | null;
    next_contact_date: string | null;
    vehicle_id: string | null;
    created_at: string;
  }
  const rows = (leads ?? []) as unknown as Row[];

  const vehicleIds = rows
    .map((row) => row.vehicle_id)
    .filter((id): id is string => Boolean(id));
  const { data: vehicles } = vehicleIds.length
    ? await db().from("vehicles").select("id, make, model").in("id", vehicleIds)
    : { data: [] };
  const vehicleById = new Map(
    (vehicles ?? []).map((vehicle) => [vehicle.id as string, vehicle]),
  );

  const mapped: FollowUpRow[] = rows.map((row) => {
    const vehicle = row.vehicle_id ? vehicleById.get(row.vehicle_id) : null;
    return {
      id: row.id,
      reg: row.reg,
      name: row.name,
      phone: row.phone,
      status: row.status,
      timeline: row.timeline,
      nextContactDate: row.next_contact_date,
      make: (vehicle?.make as string) ?? null,
      model: (vehicle?.model as string) ?? null,
    };
  });

  const today = isoDate(new Date());
  const weekAway = isoDate(new Date(Date.now() + 7 * 86_400_000));

  const dated = mapped.filter((row) => row.nextContactDate !== null);

  return {
    overdue: dated.filter((row) => (row.nextContactDate as string) < today),
    today: dated.filter((row) => row.nextContactDate === today),
    soon: dated.filter(
      (row) =>
        (row.nextContactDate as string) > today &&
        (row.nextContactDate as string) <= weekAway,
    ),
    later: dated.filter((row) => (row.nextContactDate as string) > weekAway),
    undated: mapped.filter((row) => row.nextContactDate === null),
    today_iso: today,
  };
}
