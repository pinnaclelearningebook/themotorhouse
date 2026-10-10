import "server-only";
import { db } from "@/lib/db";
import { runEnrichment } from "@/lib/decision/enrich";
import { TEST_SOURCE } from "@/lib/admin/voice-test";

/**
 * The inbox query, plus the catch-up sweep.
 *
 * Hobby plans cap cron at one run a day, so a lead whose inline
 * enrichment failed could sit unscored for hours. Sweeping here means an
 * operator opening the inbox catches it — which is exactly the moment it
 * matters, since an unscored lead only costs anything when someone is
 * looking for work to do (ARCHITECTURE.md section 9).
 */

const SWEEP_LIMIT = 5;

export async function sweepPending(): Promise<number> {
  const { data } = await db()
    .from("leads")
    .select("id")
    .eq("pending_enrichment", true)
    .order("created_at", { ascending: true })
    .limit(SWEEP_LIMIT);

  let swept = 0;
  for (const row of data ?? []) {
    try {
      await runEnrichment(row.id as string);
      swept += 1;
    } catch (error) {
      // A lead that cannot be scored must not stop the inbox loading.
      console.error("inbox sweep failed for", row.id, error);
    }
  }
  return swept;
}

export interface InboxRow {
  id: string;
  reg: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  timeline: string | null;
  status: string;
  make: string | null;
  model: string | null;
  year: number | null;
  score: number | null;
  confidence: string | null;
  recommendedChannel: string | null;
  flagCount: number;
  pending: boolean;
}

export async function inboxRows(): Promise<{
  rows: InboxRow[];
  slaHours: number | null;
}> {
  const { data: slaRow } = await db()
    .from("settings")
    .select("value")
    .eq("key", "sla_hours")
    .maybeSingle();
  const slaHours =
    typeof slaRow?.value === "number" ? (slaRow.value as number) : null;

  const { data: leads } = await db()
    .from("leads")
    .select(
      "id, reg, name, phone, created_at, timeline, status, pending_enrichment, vehicle_id",
    )
    // Cars seeded to test voice are not sellers and must not appear in
    // the queue of people waiting for a call.
    .or(`source.is.null,source.neq.${TEST_SOURCE}`)
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = (leads ?? []).map((lead) => lead.id as string);
  const vehicleIds = (leads ?? [])
    .map((lead) => lead.vehicle_id as string | null)
    .filter((id): id is string => Boolean(id));

  const { data: enrichments } = ids.length
    ? await db()
        .from("enrichments")
        .select("lead_id, version, score, confidence, recommended_channel, flags")
        .in("lead_id", ids)
        .order("version", { ascending: false })
    : { data: [] };

  // Latest version per lead; the query is ordered so the first wins.
  interface EnrichmentRow {
    lead_id: string;
    score: number | null;
    confidence: string | null;
    recommended_channel: string | null;
    flags: string[] | null;
  }
  const latest = new Map<string, EnrichmentRow>();
  for (const row of (enrichments ?? []) as unknown as EnrichmentRow[]) {
    if (!latest.has(row.lead_id)) latest.set(row.lead_id, row);
  }

  const { data: vehicles } = vehicleIds.length
    ? await db()
        .from("vehicles")
        .select("id, make, model, year_of_manufacture")
        .in("id", vehicleIds)
    : { data: [] };
  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id as string, v]));

  const rows: InboxRow[] = (leads ?? []).map((lead) => {
    const e = latest.get(lead.id as string);
    const v = lead.vehicle_id ? vehicleById.get(lead.vehicle_id as string) : null;
    return {
      id: lead.id as string,
      reg: lead.reg as string,
      name: (lead.name as string) ?? null,
      phone: (lead.phone as string) ?? null,
      createdAt: lead.created_at as string,
      timeline: (lead.timeline as string) ?? null,
      status: lead.status as string,
      make: (v?.make as string) ?? null,
      model: (v?.model as string) ?? null,
      year: (v?.year_of_manufacture as number) ?? null,
      score: e ? e.score : null,
      confidence: e ? e.confidence : null,
      recommendedChannel: e ? e.recommended_channel : null,
      flagCount: e ? (e.flags ?? []).length : 0,
      pending: Boolean(lead.pending_enrichment),
    };
  });

  // Score descending, then oldest first — a high-scoring lead that has
  // been waiting should outrank a fresh one of the same score.
  rows.sort((a, b) => {
    const byScore = (b.score ?? -1) - (a.score ?? -1);
    if (byScore !== 0) return byScore;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return { rows, slaHours };
}
