import "server-only";
import { db } from "@/lib/db";
import { carPnl, type CarPnl, type CostLine } from "@/lib/admin/pnl";
import { TEST_SOURCE } from "@/lib/admin/voice-test";

/**
 * The pipeline board.
 *
 * Columns follow CLAUDE.md section 12: new → contacted → offered →
 * accepted → collected → listed/shipped → sold. `listed` and `shipped`
 * share a column because they are the same stage down two channels, and
 * the seller's car does not change hands twice.
 *
 * `declined`, `lost` and `researching` are not pipeline stages — they are
 * outcomes and a follow-up state. They are counted, not carded, so the
 * board stays a picture of live work rather than a filing cabinet.
 */

export const STAGES = [
  { key: "new", label: "New", statuses: ["new"] },
  { key: "contacted", label: "Contacted", statuses: ["contacted"] },
  { key: "offered", label: "Offered", statuses: ["offered"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted"] },
  { key: "collected", label: "Collected", statuses: ["collected"] },
  { key: "listed", label: "Listed / shipped", statuses: ["listed", "shipped"] },
  { key: "sold", label: "Sold", statuses: ["sold"] },
] as const;

/** Every status a card may be moved to, in the order the select shows. */
export const MOVABLE_STATUSES = [
  "new",
  "contacted",
  "offered",
  "accepted",
  "collected",
  "listed",
  "shipped",
  "sold",
  "declined",
  "lost",
  "researching",
] as const;

export type MovableStatus = (typeof MOVABLE_STATUSES)[number];

const CLOSED = ["declined", "lost"] as const;

export interface PipelineCard {
  id: string;
  reg: string;
  name: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string;
  channelDecided: string | null;
  channelRecommended: string | null;
  pnl: CarPnl;
}

export interface PipelineBoard {
  columns: { key: string; label: string; cards: PipelineCard[] }[];
  closedCount: number;
  researchingCount: number;
  /** Realised margin across sold cars only. Null when none are sold. */
  realised: { cars: number; margin: number } | null;
}

interface LeadRow {
  id: string;
  reg: string;
  name: string | null;
  status: string;
  sold_price: number | null;
  vehicle_id: string | null;
  channel_decided: string | null;
  channel_recommended: string | null;
}

export async function pipelineBoard(): Promise<PipelineBoard> {
  const boardStatuses = STAGES.flatMap((stage) => [...stage.statuses]);

  const { data: leads } = await db()
    .from("leads")
    .select(
      "id, reg, name, status, sold_price, vehicle_id, channel_decided, channel_recommended",
    )
    .in("status", boardStatuses)
    .or(`source.is.null,source.neq.${TEST_SOURCE}`)
    .order("updated_at", { ascending: false })
    .limit(400);

  const rows = (leads ?? []) as unknown as LeadRow[];
  const ids = rows.map((row) => row.id);

  // Accepted offers are the purchase price. A lead can carry several
  // offers over time; only an accepted one is money that moved.
  const { data: offers } = ids.length
    ? await db()
        .from("offers")
        .select("lead_id, amount, status, made_at")
        .in("lead_id", ids)
        .eq("status", "accepted")
        .order("made_at", { ascending: false })
    : { data: [] };

  const acceptedByLead = new Map<string, number>();
  for (const offer of (offers ?? []) as unknown as {
    lead_id: string;
    amount: number;
  }[]) {
    if (!acceptedByLead.has(offer.lead_id)) {
      acceptedByLead.set(offer.lead_id, offer.amount);
    }
  }

  const { data: costs } = ids.length
    ? await db().from("car_costs").select("lead_id, kind, amount").in("lead_id", ids)
    : { data: [] };

  const costsByLead = new Map<string, CostLine[]>();
  for (const cost of (costs ?? []) as unknown as {
    lead_id: string;
    kind: string;
    amount: number;
  }[]) {
    const lines = costsByLead.get(cost.lead_id) ?? [];
    lines.push({ kind: cost.kind, amount: cost.amount });
    costsByLead.set(cost.lead_id, lines);
  }

  const vehicleIds = rows
    .map((row) => row.vehicle_id)
    .filter((id): id is string => Boolean(id));
  const { data: vehicles } = vehicleIds.length
    ? await db()
        .from("vehicles")
        .select("id, make, model, year_of_manufacture")
        .in("id", vehicleIds)
    : { data: [] };
  const vehicleById = new Map(
    (vehicles ?? []).map((vehicle) => [vehicle.id as string, vehicle]),
  );

  const cards: PipelineCard[] = rows.map((row) => {
    const vehicle = row.vehicle_id ? vehicleById.get(row.vehicle_id) : null;
    return {
      id: row.id,
      reg: row.reg,
      name: row.name,
      make: (vehicle?.make as string) ?? null,
      model: (vehicle?.model as string) ?? null,
      year: (vehicle?.year_of_manufacture as number) ?? null,
      status: row.status,
      channelDecided: row.channel_decided,
      channelRecommended: row.channel_recommended,
      pnl: carPnl({
        acceptedOffer: acceptedByLead.get(row.id) ?? null,
        soldPrice: row.sold_price,
        costLines: costsByLead.get(row.id) ?? [],
      }),
    };
  });

  const columns = STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    cards: cards.filter((card) =>
      (stage.statuses as readonly string[]).includes(card.status),
    ),
  }));

  const sold = cards.filter(
    (card) => card.status === "sold" && card.pnl.margin !== null,
  );
  const realised = sold.length
    ? {
        cars: sold.length,
        margin: sold.reduce((total, card) => total + (card.pnl.margin ?? 0), 0),
      }
    : null;

  const { count: closedCount } = await db()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", [...CLOSED]);

  const { count: researchingCount } = await db()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "researching");

  return {
    columns,
    closedCount: closedCount ?? 0,
    researchingCount: researchingCount ?? 0,
    realised,
  };
}
