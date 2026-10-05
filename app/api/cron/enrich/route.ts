import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { runEnrichment } from "@/lib/decision/enrich";

/**
 * Catch-up sweep for leads whose inline enrichment never ran or failed.
 *
 * The common case is handled directly by the step-4 server action, so by
 * the time this runs there is usually nothing to do. It exists because a
 * lead silently sitting unscored is exactly the kind of quiet failure
 * this project keeps finding.
 *
 * Vercel sets x-vercel-cron on scheduled invocations. Anything else must
 * present CRON_SECRET, so the route is not an open trigger.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 10;

function authorised(request: Request): boolean {
  if (request.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "No database." }, { status: 503 });
  }

  const { data: pending } = await db()
    .from("leads")
    .select("id")
    .eq("pending_enrichment", true)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  const results: Array<{ id: string; ok: boolean }> = [];
  for (const row of pending ?? []) {
    try {
      await runEnrichment(row.id as string);
      results.push({ id: row.id as string, ok: true });
    } catch (error) {
      console.error("cron enrichment failed", row.id, error);
      results.push({ id: row.id as string, ok: false });
    }
  }

  return NextResponse.json({ swept: results.length, results });
}
