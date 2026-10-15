import "server-only";
import { db } from "@/lib/db";
import { excludeTestLeads } from "@/lib/admin/exclusions";

/**
 * The three numbers the sidebar badges.
 *
 * One query each, counted in Postgres rather than fetched and
 * measured here — the sidebar renders on every admin page and must
 * not pull four hundred rows to display a "3".
 *
 * All three are counts of things we hold. Nothing here is projected,
 * and a zero renders as no badge at all rather than a grey nought,
 * because a badge is a call to action and there is no action.
 */
export interface SidebarCounts {
  newLeads: number;
  overdueFollowUps: number;
  agentFlags: number;
}

/**
 * A badge is not worth failing the whole workspace over, so a count
 * that throws renders as nothing rather than a 500 on every page.
 */
async function safe(run: () => PromiseLike<{ count: number | null }>) {
  try {
    const { count } = await run();
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function sidebarCounts(): Promise<SidebarCounts> {
  const today = new Date().toISOString().slice(0, 10);

  const [newLeads, overdueFollowUps, agentFlags] = await Promise.all([
    safe(() =>
      excludeTestLeads(
        db()
          .from("leads")
          .select("id", { count: "exact", head: true })
          // Incomplete rows have nobody to ring, so they are not work.
          .not("completed_at", "is", null)
          .eq("status", "new"),
      ),
    ),
    safe(() =>
      excludeTestLeads(
        db()
          .from("leads")
          .select("id", { count: "exact", head: true })
          .in("status", ["new", "contacted", "offered"])
          .lt("next_contact_date", today),
      ),
    ),
    safe(() =>
      db()
        .from("agent_blocks")
        .select("id", { count: "exact", head: true })
        .is("reviewed_at", null),
    ),
  ]);

  return { newLeads, overdueFollowUps, agentFlags };
}
