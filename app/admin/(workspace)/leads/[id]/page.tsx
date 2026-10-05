import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DecisionPanel, type DecisionEnrichment } from "@/components/admin/DecisionPanel";
import { MoneyPanel } from "@/components/admin/MoneyPanel";
import { OfferPanel, type OfferRow } from "@/components/admin/OfferPanel";
import {
  TranscriptPanel,
  type ConversationRecord,
} from "@/components/admin/TranscriptPanel";
import { carPnl } from "@/lib/admin/pnl";
import { todayIso, offerValidUntilIso } from "@/lib/admin/dates";
import { provenanceUnavailableReason } from "@/lib/adapters/provenance";
import { valuationUnavailableReason } from "@/lib/adapters/valuation";
import { titleCaseVehicle } from "@/lib/format";
import { formatReg } from "@/lib/reg";

export const metadata: Metadata = {
  title: "Lead",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TIMELINE_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  this_month: "This month",
  few_months: "Next few months",
  researching: "Just researching",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-caption text-structure">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const today = todayIso();
  const defaultValidUntil = offerValidUntilIso();

  const { data: lead } = await db()
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: vehicle } = lead.vehicle_id
    ? await db().from("vehicles").select("*").eq("id", lead.vehicle_id).maybeSingle()
    : { data: null };

  const { data: mot } = lead.vehicle_id
    ? await db()
        .from("mot_tests")
        .select("*")
        .eq("vehicle_id", lead.vehicle_id)
        .order("test_date", { ascending: false })
    : { data: [] };

  const { data: photos } = await db()
    .from("photos")
    .select("blob_url, shot_type")
    .eq("lead_id", id);

  // Actual money: the accepted offer is the purchase price, cost lines
  // and sold_price are the rest. See lib/admin/pnl.ts.
  const { data: offerRows } = await db()
    .from("offers")
    .select("id, amount, status, channel, made_by, made_at, valid_until, notes")
    .eq("lead_id", id)
    .order("made_at", { ascending: false });
  const offers = (offerRows ?? []) as unknown as OfferRow[];
  const acceptedOffer =
    offers.find((offer) => offer.status === "accepted")?.amount ?? null;

  const { data: costRows } = await db()
    .from("car_costs")
    .select("kind, amount")
    .eq("lead_id", id)
    .order("logged_at", { ascending: true });

  const pnl = carPnl({
    acceptedOffer,
    soldPrice: (lead.sold_price as number) ?? null,
    costLines: (costRows ?? []) as { kind: string; amount: number }[],
  });

  const { data: conversationRows } = await db()
    .from("conversations")
    .select("id, started_at, mode, turn_count, transcript, structured_notes")
    .eq("lead_id", id)
    .order("started_at", { ascending: false });
  const conversations = (conversationRows ?? []) as unknown as ConversationRecord[];

  const { data: enrichments } = await db()
    .from("enrichments")
    .select("*")
    .eq("lead_id", id)
    .order("version", { ascending: false })
    .limit(1);
  const enrichment = (enrichments?.[0] ?? null) as DecisionEnrichment | null;
  // Only used to pre-select the channel dropdown; never an amount.
  const enrichmentChannel = enrichment?.recommended_channel ?? null;

  const car = [
    vehicle?.make ? titleCaseVehicle(vehicle.make) : null,
    vehicle?.model ? titleCaseVehicle(vehicle.model) : null,
  ]
    .filter(Boolean)
    .join(" ");

  const condition = (lead.condition ?? {}) as Record<
    string,
    { grade: string; note?: string }
  >;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-display-3">
            {car || "Vehicle not identified"}
          </h1>
          <p className="data-inline mt-1 text-sm text-structure">
            {formatReg(lead.reg)}
            {vehicle?.year_of_manufacture ? ` · ${vehicle.year_of_manufacture}` : ""}
          </p>
        </div>
        <span className="rounded border border-line px-3 py-1 text-caption">
          {lead.status}
        </span>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          <section className="rounded border border-line p-6">
            <h2 className="font-display text-2xl">The seller</h2>
            <dl className="mt-4">
              <Row label="Name" value={lead.name} />
              <Row
                label="Phone"
                value={<span className="data-inline">{lead.phone}</span>}
              />
              <Row label="Email" value={lead.email} />
              <Row
                label="Postcode"
                value={<span className="data-inline">{lead.postcode}</span>}
              />
              <Row label="Best time to call" value={lead.contact_window} />
              <Row
                label="Timeline"
                value={lead.timeline ? TIMELINE_LABELS[lead.timeline] : null}
              />
              <Row label="Why selling" value={lead.reason_for_sale} />
              <Row
                label="Other offers"
                value={lead.others_approached}
              />
              <Row
                label="Price in mind"
                value={
                  lead.fair_price_in_mind ? (
                    <span className="data-inline">
                      £{Number(lead.fair_price_in_mind).toLocaleString("en-GB")}
                      <span className="ml-2 text-caption text-structure">
                        never quoted back
                      </span>
                    </span>
                  ) : null
                }
              />
              <Row
                label="Marketing consent"
                value={lead.marketing_consent ? "yes" : "no"}
              />
            </dl>
          </section>

          <section className="rounded border border-line p-6">
            <h2 className="font-display text-2xl">The car</h2>
            <dl className="mt-4">
              <Row
                label="Mileage reported"
                value={
                  lead.mileage_reported ? (
                    <span className="data-inline">
                      {Number(lead.mileage_reported).toLocaleString("en-GB")}
                    </span>
                  ) : null
                }
              />
              <Row label="Service history" value={lead.service_history} />
              <Row label="Previous keepers" value={lead.keepers} />
              <Row label="Finance" value={lead.finance_outstanding} />
              <Row label="Warning lights" value={lead.warning_lights} />
              <Row label="Known faults" value={lead.known_faults} />
              <Row label="Modifications" value={lead.modifications} />
            </dl>

            {Object.keys(condition).length > 0 && (
              <div className="mt-5">
                <p className="text-caption text-structure">Condition</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {Object.entries(condition).map(([area, detail]) => (
                    <li key={area}>
                      <span className="capitalize">{area}</span>:{" "}
                      <span
                        className={
                          detail.grade === "poor" ? "text-oxblood" : undefined
                        }
                      >
                        {detail.grade}
                      </span>
                      {detail.note ? (
                        <span className="text-structure"> — {detail.note}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <TranscriptPanel conversations={conversations} />

          <section className="rounded border border-line p-6">
            <h2 className="font-display text-2xl">MOT history</h2>
            {(mot ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-structure">
                No MOT record. Normal for a car under about three years old,
                and the reason model and mileage may be missing.
              </p>
            ) : (
              <ul className="mt-4">
                {(mot ?? []).map((test) => (
                  <li
                    key={`${test.test_date}-${test.odometer}`}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
                  >
                    <span className="data-inline text-sm">{test.test_date}</span>
                    <span className="text-sm">{test.result}</span>
                    <span className="data-inline text-sm">
                      {test.odometer
                        ? `${Number(test.odometer).toLocaleString("en-GB")} mi`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border border-line p-6">
            <h2 className="font-display text-2xl">Photos</h2>
            {(photos ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-structure">
                None uploaded. The auto-reply invites them by email.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-3 gap-3">
                {(photos ?? []).map((photo) => (
                  <li key={photo.blob_url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.blob_url as string}
                      alt={(photo.shot_type as string) ?? "Seller photo"}
                      className="w-full rounded border border-line object-cover"
                    />
                    <span className="mt-1 block text-caption text-structure">
                      {photo.shot_type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <DecisionPanel enrichment={enrichment} />

          <OfferPanel
            leadId={id}
            offers={offers}
            recommendedChannel={enrichmentChannel}
            defaultValidUntil={defaultValidUntil}
          />

          <MoneyPanel
            leadId={id}
            pnl={pnl}
            soldOn={(lead.sold_on as string) ?? null}
            nextContactDate={(lead.next_contact_date as string) ?? null}
            today={today}
          />

          <section className="rounded border border-line p-6">
            <h2 className="font-display text-2xl">Paid checks</h2>
            <p className="mt-2 text-caption text-structure">
              Both cost money per run and are never triggered automatically.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {[
                { label: "Run provenance check", reason: provenanceUnavailableReason() },
                { label: "Run valuation", reason: valuationUnavailableReason() },
              ].map((control) => (
                <div key={control.label}>
                  <button
                    type="button"
                    disabled={Boolean(control.reason)}
                    className="w-full rounded border border-line px-4 py-2 text-sm transition-colors duration-200 enabled:hover:border-oxblood disabled:opacity-50"
                  >
                    {control.label}
                  </button>
                  {control.reason && (
                    <p className="mt-1.5 text-caption text-oxblood">
                      {control.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
