import "server-only";
import { db, isDatabaseConfigured } from "@/lib/db";
import { score, type ScoreInput } from "./score";
import type { Settings } from "./settings";
import { sendEnrichmentAlert } from "@/lib/email";
import { absoluteUrl } from "@/config/site";

/**
 * The enrichment pipeline (ARCHITECTURE.md section 5).
 *
 * Steps run in order and each is a plain function call. There is no job
 * runner: Vercel cron and the step-4 server action both call runEnrichment
 * directly. The steps are kept separable so they can be lifted into
 * Inngest if Phase D ever needs step-level durability.
 *
 * NOTHING HERE CALLS A PAID API. Provenance and valuation are separate,
 * human-triggered jobs. See lib/adapters/provenance.ts and valuation.ts.
 */

export async function loadSettings(): Promise<Settings> {
  if (!isDatabaseConfigured()) return {};
  const { data } = await db().from("settings").select("key, value");
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key as string] = row.value;
  }
  return settings as Settings;
}

export interface EnrichmentResult {
  leadId: string;
  version: number;
  score: number;
  alerted: boolean;
}

export async function runEnrichment(
  leadId: string,
): Promise<EnrichmentResult | null> {
  if (!isDatabaseConfigured()) return null;

  // 1. Load the lead and everything hanging off it.
  const { data: lead } = await db()
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;

  const { data: vehicle } = lead.vehicle_id
    ? await db().from("vehicles").select("*").eq("id", lead.vehicle_id).maybeSingle()
    : { data: null };

  const { data: motRows } = lead.vehicle_id
    ? await db()
        .from("mot_tests")
        .select("test_date, odometer")
        .eq("vehicle_id", lead.vehicle_id)
        .order("test_date", { ascending: false })
    : { data: [] };

  const { data: photoRows } = await db()
    .from("photos")
    .select("id")
    .eq("lead_id", leadId);

  // 2. Settings, read fresh so an edit in /admin takes effect immediately.
  const settings = await loadSettings();

  // 3. Score. Pure function — all IO is above this line.
  const input: ScoreInput = {
    lead: {
      timeline: lead.timeline ?? null,
      mileageReported: lead.mileage_reported ?? null,
      serviceHistory: lead.service_history ?? null,
      condition: lead.condition ?? null,
      financeOutstanding: lead.finance_outstanding ?? null,
      photoCount: photoRows?.length ?? 0,
    },
    vehicle: vehicle
      ? {
          make: vehicle.make ?? null,
          model: vehicle.model ?? null,
          firstRegistered: vehicle.first_registered ?? null,
          yearOfManufacture: vehicle.year_of_manufacture ?? null,
        }
      : null,
    mot: (motRows ?? []).map((row) => ({
      testDate: row.test_date ?? null,
      odometer: row.odometer ?? null,
    })),
    settings,
    now: new Date(),
  };
  const result = score(input);

  // 4. Persist as a new version rather than updating, so the dashboard
  //    can say which version a number came from.
  const { data: previous } = await db()
    .from("enrichments")
    .select("version")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1);
  const version = ((previous?.[0]?.version as number | undefined) ?? 0) + 1;

  const { error } = await db().from("enrichments").insert({
    lead_id: leadId,
    version,
    age_at_landing_years: result.ageAtLandingYears,
    target_model_match: result.targetModelMatch,
    export_eligible: result.exportEligible,
    export_blockers: result.exportBlockers,
    projected_margin_export: result.projectedMarginExport,
    projected_margin_domestic: result.projectedMarginDomestic,
    max_bid_export: result.maxBidExport,
    max_bid_domestic: result.maxBidDomestic,
    days_to_sell_estimate: result.daysToSellEstimate,
    score: result.score,
    confidence: result.confidence,
    recommended_channel: result.recommendedChannel,
    reasoning: result.reasoning,
    flags: result.flags,
  });
  if (error) throw new Error(`enrichment insert failed: ${error.message}`);

  await db()
    .from("leads")
    .update({
      channel_recommended: result.recommendedChannel,
      pending_enrichment: false,
    })
    .eq("id", leadId);

  // 5. Alert. Internal only — none of this is ever shown to a seller.
  let alerted = false;
  try {
    await sendEnrichmentAlert({
      leadId,
      reg: lead.reg,
      phone: lead.phone ?? null,
      name: lead.name ?? null,
      score: result.score,
      confidence: result.confidence,
      recommendedChannel: result.recommendedChannel,
      reasoning: result.reasoning,
      flags: result.flags,
      link: absoluteUrl(`/admin/leads/${leadId}`),
    });
    alerted = true;
  } catch (error) {
    console.error("enrichment alert failed", error);
  }

  return { leadId, version, score: result.score, alerted };
}
