import "server-only";
import { db } from "@/lib/db";
import { runEnrichment } from "@/lib/decision/enrich";
import { excludeTestLeads } from "@/lib/admin/exclusions";

/**
 * The catch-up sweep.
 *
 * Hobby plans cap cron at one run a day, so a lead whose inline
 * enrichment failed could sit unscored for hours. Sweeping here means an
 * operator opening the inbox catches it — which is exactly the moment it
 * matters, since an unscored lead only costs anything when someone is
 * looking for work to do (ARCHITECTURE.md section 9).
 *
 * The inbox query itself moved to lib/admin/inbox-query.ts when the
 * table gained filters, sorting and pagination: this file had fetched
 * two hundred rows and sorted them in Node, which is the wrong shape
 * once a filter can match a row on page nine.
 */

const SWEEP_LIMIT = 5;

export async function sweepPending(): Promise<number> {
  // Our own test submissions go through the same filter as every
  // listing. They do not need scoring, and five of them at the front
  // of the queue would starve the sweep of real leads.
  const { data } = await excludeTestLeads(
    db().from("leads").select("id").eq("pending_enrichment", true),
  )
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
