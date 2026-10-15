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
import {
  InternalOnly,
  LeadTabNav,
  isLeadTab,
  type LeadTab,
} from "@/components/admin/LeadTabs";
import { StatusBadge } from "@/components/admin/ui/Badge";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { leadActivity } from "@/lib/admin/activity";
import { carPnl } from "@/lib/admin/pnl";
import { todayIso, offerValidUntilIso } from "@/lib/admin/dates";
import { provenanceUnavailableReason } from "@/lib/adapters/provenance";
import { valuationUnavailableReason } from "@/lib/adapters/valuation";
import { titleCaseVehicle } from "@/lib/format";
import { formatReg } from "@/lib/reg";
import { METHOD_LABEL, contactActions } from "@/lib/admin/contact";
import type { ContactMethod } from "@/lib/validation";
import { addLeadNote } from "./actions";

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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line bg-paper p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * One lead, in five tabs.
 *
 * The tab is in the URL, so only the panel being looked at is
 * rendered and queried — the MOT timeline, the photos and the audit
 * log are three queries and there is no reason to run all of them to
 * show one. It also makes a tab a link you can send.
 *
 * Everything internal — the score, the channel, the eligibility, the
 * decision engine's projections — is inside `InternalOnly` and says
 * so on the page. test/internal-only.test.ts proves none of it
 * reaches a seller-facing route.
 */
export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const requested = (await searchParams).tab;
  const tab: LeadTab = isLeadTab(requested) ? requested : "overview";

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

  const { data: enrichments } = await db()
    .from("enrichments")
    .select("*")
    .eq("lead_id", id)
    .order("version", { ascending: false })
    .limit(1);
  const enrichment = (enrichments?.[0] ?? null) as DecisionEnrichment | null;
  // Only used to pre-select the channel dropdown; never an amount.
  const enrichmentChannel = enrichment?.recommended_channel ?? null;

  const { data: offerRows } = await db()
    .from("offers")
    .select("id, amount, status, channel, made_by, made_at, valid_until, notes")
    .eq("lead_id", id)
    .order("made_at", { ascending: false });
  const offers = (offerRows ?? []) as unknown as OfferRow[];

  const actions = contactActions(
    (lead.preferred_contact_method as ContactMethod) ?? null,
    { phone: (lead.phone as string) ?? null, email: (lead.email as string) ?? null },
  );

  const car = [
    vehicle?.make ? titleCaseVehicle(vehicle.make) : null,
    vehicle?.model ? titleCaseVehicle(vehicle.model) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="data-inline text-lg">{formatReg(lead.reg)}</p>
          <h1 className="mt-1 font-display text-display-3">
            {car || "Vehicle not identified"}
          </h1>
          <p className="mt-1 text-sm text-structure">
            {lead.name ?? "No name yet"}
            {vehicle?.year_of_manufacture ? ` · ${vehicle.year_of_manufacture}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={lead.status as string} />
          {actions.map((action, index) => (
            <a
              key={action.href}
              href={action.href}
              className={`inline-flex min-h-11 items-center rounded px-4 text-sm font-medium transition-colors duration-200 ${
                index === 0
                  ? "bg-oxblood text-paper hover:bg-oxblood-lt"
                  : "border border-line hover:border-oxblood"
              }`}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <LeadTabNav id={id} current={tab} counts={{ offers: offers.length }} />
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab lead={lead} enrichment={enrichment} />}
        {tab === "vehicle" && <VehicleTab leadId={id} vehicle={vehicle} />}
        {tab === "offers" && (
          <OffersTab
            leadId={id}
            lead={lead}
            offers={offers}
            enrichmentChannel={enrichmentChannel}
            defaultValidUntil={defaultValidUntil}
            today={today}
          />
        )}
        {tab === "activity" && <ActivityTab leadId={id} />}
        {tab === "contact" && <ContactTab lead={lead} actions={actions} />}
      </div>
    </div>
  );
}

function OverviewTab({
  lead,
  enrichment,
}: {
  lead: Record<string, unknown>;
  enrichment: DecisionEnrichment | null;
}) {
  const condition = (lead.condition ?? {}) as Record<
    string,
    { grade: string; note?: string }
  >;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <div className="flex flex-col gap-5">
        <Panel title="The sale">
          <dl>
            <Row
              label="Timeline"
              value={lead.timeline ? TIMELINE_LABELS[lead.timeline as string] : null}
            />
            <Row label="Why selling" value={lead.reason_for_sale as string} />
            <Row label="Other offers" value={lead.others_approached as string} />
            <Row
              label="Price in mind"
              value={
                lead.fair_price_in_mind ? (
                  <span className="data-inline">
                    &pound;{Number(lead.fair_price_in_mind).toLocaleString("en-GB")}
                    <span className="ml-2 text-caption text-structure">
                      seller&apos;s figure, never an offer
                    </span>
                  </span>
                ) : null
              }
            />
            <Row label="Finance" value={lead.finance_outstanding as string} />
            <Row
              label="Part-exchange"
              value={
                lead.part_exchange_interest === null
                  ? null
                  : lead.part_exchange_interest
                    ? "interested"
                    : "no"
              }
            />
          </dl>
        </Panel>

        <Panel title="The car, as the seller describes it">
          <dl>
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
            <Row label="Service history" value={lead.service_history as string} />
            <Row label="Previous keepers" value={lead.keepers as number} />
            <Row label="Warning lights" value={lead.warning_lights as string} />
            <Row label="Known faults" value={lead.known_faults as string} />
            <Row label="Modifications" value={lead.modifications as string} />
          </dl>
          {Object.keys(condition).length > 0 && (
            <div className="mt-5">
              <p className="text-caption text-structure">Condition</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {Object.entries(condition).map(([area, detail]) => (
                  <li key={area}>
                    <span className="capitalize">{area}</span>:{" "}
                    <span className={detail.grade === "poor" ? "text-oxblood" : undefined}>
                      {detail.grade}
                    </span>
                    {detail.note ? (
                      <span className="text-structure"> &mdash; {detail.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <InternalOnly title="Decision">
        <DecisionPanel enrichment={enrichment} />
      </InternalOnly>
    </div>
  );
}

async function VehicleTab({
  leadId,
  vehicle,
}: {
  leadId: string;
  vehicle: Record<string, unknown> | null;
}) {
  const { data: mot } = vehicle?.id
    ? await db()
        .from("mot_tests")
        .select("*")
        .eq("vehicle_id", vehicle.id as string)
        .order("test_date", { ascending: false })
    : { data: [] };

  const { data: photos } = await db()
    .from("photos")
    .select("blob_url, shot_type")
    .eq("lead_id", leadId);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="From the DVLA record">
        {vehicle ? (
          <dl>
            <Row label="Make" value={vehicle.make as string} />
            <Row label="Model" value={vehicle.model as string} />
            <Row label="Year" value={vehicle.year_of_manufacture as number} />
            <Row label="Colour" value={vehicle.colour as string} />
            <Row label="Fuel" value={vehicle.fuel as string} />
            <Row
              label="Engine"
              value={
                vehicle.engine_cc ? (
                  <span className="data-inline">{String(vehicle.engine_cc)} cc</span>
                ) : null
              }
            />
            <Row label="MOT expiry" value={vehicle.mot_expiry as string} />
            <Row label="Tax status" value={vehicle.tax_status as string} />
          </dl>
        ) : (
          <EmptyState title="No lookup data">
            DVLA and DVSA are not configured, so this seller entered the car
            by hand. The keys are an open item in PENDING-INFO.
          </EmptyState>
        )}
      </Panel>

      <Panel title="MOT history">
        {(mot ?? []).length === 0 ? (
          <p className="text-sm text-structure">
            No MOT record. Normal for a car under about three years old, and
            the reason model and mileage may be missing.
          </p>
        ) : (
          <ol>
            {(mot ?? []).map((test) => (
              <li
                key={`${test.test_date}-${test.odometer}`}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
              >
                <span className="data-inline text-sm">{test.test_date}</span>
                <span
                  className={`text-sm ${
                    String(test.result).toLowerCase().includes("fail")
                      ? "text-oxblood"
                      : ""
                  }`}
                >
                  {test.result}
                </span>
                <span className="data-inline text-sm">
                  {test.odometer
                    ? `${Number(test.odometer).toLocaleString("en-GB")} mi`
                    : "—"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <div className="lg:col-span-2">
        <Panel title="Photos">
          {(photos ?? []).length === 0 ? (
            <p className="text-sm text-structure">
              None uploaded. Ask on the call &mdash; the outside from each
              corner and the interior.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(photos ?? []).map((photo) => (
                <li key={photo.blob_url as string}>
                  <a href={photo.blob_url as string} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.blob_url as string}
                      alt={(photo.shot_type as string) ?? "Seller photo"}
                      className="aspect-4/3 w-full rounded border border-line object-cover transition-opacity duration-200 hover:opacity-85"
                    />
                  </a>
                  <span className="mt-1 block text-caption text-structure">
                    {(photo.shot_type as string) ?? "Photo"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

async function OffersTab({
  leadId,
  lead,
  offers,
  enrichmentChannel,
  defaultValidUntil,
  today,
}: {
  leadId: string;
  lead: Record<string, unknown>;
  offers: OfferRow[];
  enrichmentChannel: string | null;
  defaultValidUntil: string;
  today: string;
}) {
  const acceptedOffer =
    offers.find((offer) => offer.status === "accepted")?.amount ?? null;

  const { data: costRows } = await db()
    .from("car_costs")
    .select("kind, amount")
    .eq("lead_id", leadId)
    .order("logged_at", { ascending: true });

  const pnl = carPnl({
    acceptedOffer,
    soldPrice: (lead.sold_price as number) ?? null,
    costLines: (costRows ?? []) as { kind: string; amount: number }[],
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <OfferPanel
        leadId={leadId}
        offers={offers}
        recommendedChannel={enrichmentChannel}
        defaultValidUntil={defaultValidUntil}
      />
      <MoneyPanel
        leadId={leadId}
        pnl={pnl}
        soldOn={(lead.sold_on as string) ?? null}
        nextContactDate={(lead.next_contact_date as string) ?? null}
        today={today}
      />
      <div className="lg:col-span-2">
        <Panel title="Paid checks">
          <p className="-mt-2 text-caption text-structure">
            Both cost money per run and are never triggered automatically.
            Nothing on this page calls one; a person presses the button.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  <p className="mt-1.5 text-caption text-oxblood">{control.reason}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

async function ActivityTab({ leadId }: { leadId: string }) {
  const entries = await leadActivity(leadId);

  const { data: conversationRows } = await db()
    .from("conversations")
    .select("id, started_at, mode, admin_test, turn_count, transcript, structured_notes")
    .eq("lead_id", leadId)
    .order("started_at", { ascending: false });
  const conversations = (conversationRows ?? []) as unknown as ConversationRecord[];

  return (
    /*
      * One column until there is a transcript to put beside it. A
      * two-column grid with nothing in the right half reads as a
      * panel that failed to load.
      */
    <div
      className={`grid gap-5 ${conversations.length > 0 ? "lg:grid-cols-2" : "max-w-3xl"}`}
    >
      <div className="flex flex-col gap-5">
        <Panel title="Add a note">
          {/*
            * Notes land in the same timeline as everything else rather
            * than in a list of their own, so "what happened to this
            * car" is one column read top to bottom. There is no edit
            * and no delete: a correction is a second note.
            */}
          <form action={addLeadNote} className="flex flex-col gap-3">
            <input type="hidden" name="leadId" value={leadId} />
            <label htmlFor="note-body" className="sr-only">
              Note
            </label>
            <textarea
              id="note-body"
              name="body"
              rows={3}
              required
              maxLength={2000}
              placeholder="What was said on the call"
              className="w-full rounded border border-line bg-paper px-3 py-2 text-sm focus-visible:border-oxblood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 w-fit items-center rounded bg-oxblood px-4 text-sm font-medium text-paper transition-colors duration-200 hover:bg-oxblood-lt"
            >
              Save note
            </button>
          </form>
        </Panel>

        <Panel title="Activity">
          {entries.length === 0 ? (
            <EmptyState title="Nothing recorded yet">
              Every status change, offer, cost, note and follow-up date writes
              an entry here with who did it and when. An action that did not
              write one does not appear &mdash; the gap is more use than a
              guess.
            </EmptyState>
          ) : (
            <ol>
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p
                      className={
                        entry.action === "lead.note"
                          ? "text-sm whitespace-pre-line"
                          : "text-sm"
                      }
                    >
                      {entry.summary}
                    </p>
                    <time
                      dateTime={entry.at}
                      className="data-inline shrink-0 text-caption text-structure"
                    >
                      {new Date(entry.at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="mt-0.5 text-caption text-structure">
                    {entry.action === "lead.note" ? "Note · " : ""}
                    {entry.actor ?? "system"}
                    {entry.detail ? ` · ${entry.detail}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <TranscriptPanel conversations={conversations} />
    </div>
  );
}

function ContactTab({
  lead,
  actions,
}: {
  lead: Record<string, unknown>;
  actions: Array<{ label: string; href: string }>;
}) {
  const method = (lead.preferred_contact_method as ContactMethod) ?? null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="How they asked to be reached">
        <p className="font-display text-xl">
          {method
            ? METHOD_LABEL[method]
            : "Not asked — this lead predates the question"}
        </p>
        {actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <a
                key={action.href}
                href={action.href}
                className={`inline-flex min-h-11 items-center rounded px-4 text-sm font-medium transition-colors duration-200 ${
                  index === 0
                    ? "bg-oxblood text-paper hover:bg-oxblood-lt"
                    : "border border-line hover:border-oxblood"
                }`}
              >
                {action.label}
              </a>
            ))}
          </div>
        )}
        <p className="mt-4 text-caption leading-relaxed text-structure">
          A preference is what the seller asked for, not a restriction on us.
          The number they gave is still a number we promised to ring.
        </p>
      </Panel>

      <Panel title="Details">
        <dl>
          <Row label="Name" value={lead.name as string} />
          <Row
            label="Phone"
            value={<span className="data-inline">{lead.phone as string}</span>}
          />
          <Row label="Email" value={lead.email as string} />
          <Row
            label="Postcode"
            value={<span className="data-inline">{lead.postcode as string}</span>}
          />
          <Row label="Best time to contact" value={lead.contact_window as string} />
          <Row label="Marketing consent" value={lead.marketing_consent ? "yes" : "no"} />
          <Row
            label="Next contact date"
            value={
              lead.next_contact_date ? (
                <span className="data-inline">{lead.next_contact_date as string}</span>
              ) : null
            }
          />
        </dl>
      </Panel>
    </div>
  );
}
