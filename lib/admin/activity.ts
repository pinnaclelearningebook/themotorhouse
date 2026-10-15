import "server-only";
import { db } from "@/lib/db";

/**
 * What has happened to this lead, newest first.
 *
 * Straight out of `audit_log`, which every write already populates —
 * status changes, offers, costs, follow-up dates, settings that
 * touched this lead. Nothing is reconstructed or inferred: if an
 * action did not write a row, it does not appear, and that absence is
 * more useful than a plausible guess at what probably happened.
 *
 * The phrasing is per action rather than a generic "lead.updated by
 * x", because the log's whole purpose is being readable a month later
 * by someone asking why a car was priced the way it was.
 */
export interface ActivityEntry {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  summary: string;
  detail: string | null;
}

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function value(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as Record<string, unknown>)[key];
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

/** One line a person can read, from the action and its payload. */
function describe(
  action: string,
  before: unknown,
  after: unknown,
): { summary: string; detail: string | null } {
  switch (action) {
    case "lead.status.bulk":
    case "lead.status": {
      const from = value(before, "status");
      const to = value(after, "status");
      return {
        summary: `Status changed to ${to ?? "—"}`,
        detail: from ? `Was ${from}` : null,
      };
    }
    case "lead.follow_up.bulk":
    case "lead.follow_up": {
      const to = value(after, "next_contact_date");
      return {
        summary: to ? `Follow-up set for ${to}` : "Follow-up date cleared",
        detail: value(before, "next_contact_date")
          ? `Was ${value(before, "next_contact_date")}`
          : null,
      };
    }
    case "lead.note": {
      // The note is the line itself, not a sentence about one.
      return { summary: value(after, "body") ?? "Note added", detail: null };
    }
    case "offer.recorded": {
      const amount = value(after, "amount");
      return {
        summary: amount
          ? `Offer recorded at ${MONEY.format(Number(amount))}`
          : "Offer recorded",
        detail: value(after, "valid_until")
          ? `Valid until ${value(after, "valid_until")}`
          : null,
      };
    }
    case "offer.outcome": {
      return {
        summary: `Offer marked ${value(after, "status") ?? "updated"}`,
        detail: null,
      };
    }
    case "cost.logged": {
      const amount = value(after, "amount");
      return {
        summary: amount
          ? `Cost logged: ${MONEY.format(Number(amount))}`
          : "Cost logged",
        detail: value(after, "label"),
      };
    }
    case "lead.sold": {
      const amount = value(after, "sold_price");
      return {
        summary: amount ? `Sold for ${MONEY.format(Number(amount))}` : "Marked sold",
        detail: value(after, "sold_at"),
      };
    }
    default: {
      // An action nobody has written a sentence for still shows,
      // because a missing entry is worse than an ugly one.
      return { summary: action, detail: null };
    }
  }
}

export async function leadActivity(leadId: string): Promise<ActivityEntry[]> {
  const { data } = await db()
    .from("audit_log")
    .select("id, at, actor, action, before, after")
    .eq("lead_id", leadId)
    .order("at", { ascending: false })
    .limit(200);

  return (data ?? []).map((row) => {
    const { summary, detail } = describe(
      row.action as string,
      row.before,
      row.after,
    );
    return {
      id: row.id as string,
      at: row.at as string,
      actor: (row.actor as string) ?? null,
      action: row.action as string,
      summary,
      detail,
    };
  });
}
