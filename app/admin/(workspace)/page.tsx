import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock, Inbox } from "lucide-react";
import { dashboardData, type NeedsYouRow } from "@/lib/admin/dashboard";
import { sweepPending } from "@/lib/admin/inbox";
import { StatCard } from "@/components/admin/ui/StatCard";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { BarChart, FunnelChart } from "@/components/admin/ui/BarChart";
import { formatReg } from "@/lib/reg";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  call: "Phone call",
  whatsapp: "WhatsApp",
  sms: "Text message",
  email: "Email",
  "not asked": "Not asked",
};

/** Monday the 6th, not 2026-10-06. */
function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default async function DashboardPage() {
  await sweepPending();
  const data = await dashboardData();
  const needs =
    data.needsYou.overSla.length +
    data.needsYou.dueToday.length +
    data.needsYou.offersExpiring.length;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-display-3">Dashboard</h1>

      {/*
        * Counts, not projections. There is no forecast here and no
        * margin until a car has actually sold — the decision engine's
        * estimates live on the lead, beside the inputs they came from,
        * where a person can see what they rest on (CLAUDE.md §11).
        */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="New today" value={data.newToday} href="/admin/inbox" />
        <StatCard label="New this week" value={data.newThisWeek} href="/admin/inbox" />
        <StatCard
          label="Awaiting contact"
          value={data.awaitingFirstContact}
          hint="Nobody has rung them yet"
          href="/admin/inbox"
        />
        <StatCard
          label="Over SLA"
          value={data.overSla}
          tone="urgent"
          hint={
            data.slaHours === null
              ? "No SLA set — Settings"
              : `Older than ${data.slaHours}h`
          }
          href="/admin/inbox?sla=over"
        />
        <StatCard label="Offers out" value={data.offersOut} href="/admin/pipeline" />
        <StatCard label="Accepted" value={data.accepted} href="/admin/pipeline" />
        <StatCard
          label="Collected this month"
          value={data.collectedThisMonth}
          tone="quiet"
          href="/admin/pipeline"
        />
      </div>

      {/* ─── needs you now ─────────────────────────────────────── */}
      <section aria-labelledby="needs-heading" className="mt-10">
        <h2 id="needs-heading" className="font-display text-2xl">
          Needs you now
        </h2>
        {needs === 0 ? (
          <div className="mt-4">
            <EmptyState icon={Clock} title="Nothing is late">
              Leads past the SLA, follow-ups due today and offers expiring
              within 48 hours appear here. Right now none of the three.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <NeedsList
              title="Over SLA"
              icon={AlertTriangle}
              rows={data.needsYou.overSla}
              empty="Nothing past the SLA."
            />
            <NeedsList
              title="Follow-ups due"
              icon={CalendarClock}
              rows={data.needsYou.dueToday}
              empty="Nothing due today."
            />
            <NeedsList
              title="Offers expiring"
              icon={Clock}
              rows={data.needsYou.offersExpiring}
              empty="No offer expires in the next 48 hours."
            />
          </div>
        )}
      </section>

      {/* ─── series ────────────────────────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Panel title="Completed leads per week">
          <BarChart
            emptyIcon={Inbox}
            emptyTitle="No completed leads yet"
            emptyBody="Each bar is a week, counting sellers who finished the form. The last eight weeks show here once there are some."
            data={data.leadsPerWeek.map((row) => ({
              label: weekLabel(row.week),
              value: row.count,
            }))}
          />
        </Panel>

        <Panel title="Form funnel">
          <FunnelChart
            note="Counted from step 1 onward. Someone who typed a registration and left before confirming the car leaves no record and is not here."
            steps={[
              { label: "Confirmed a car", value: data.funnel.confirmedCar },
              { label: "Reached the sale", value: data.funnel.reachedSale },
              { label: "Reached contact", value: data.funnel.reachedContact },
              { label: "Completed", value: data.funnel.completed },
            ]}
          />
        </Panel>

        <Panel title="Preferred contact method">
          <BarChart
            emptyTitle="Nobody has chosen yet"
            emptyBody="Sellers pick a method on the last step of the form. Leads from before that step existed show as “not asked”."
            data={data.byMethod.map((row) => ({
              label: METHOD_LABEL[row.method] ?? row.method,
              value: row.count,
            }))}
          />
        </Panel>

        <Panel title="Where leads come from">
          <BarChart
            emptyTitle="No leads to attribute"
            emptyBody="Leads with no campaign tag count as Direct. Tagged sources appear here once there is traffic carrying one."
            data={data.bySource.map((row) => ({
              label: row.source,
              value: row.count,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-line bg-paper p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NeedsList({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: typeof Clock;
  rows: NeedsYouRow[];
  empty: string;
}) {
  return (
    <section className="rounded border border-line bg-paper p-4">
      <h3 className="flex items-center gap-2 text-caption tracking-wide text-structure uppercase">
        <Icon aria-hidden="true" size={14} />
        {title}
        {rows.length > 0 && (
          <span className="data-inline text-oxblood">{rows.length}</span>
        )}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-structure">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {rows.slice(0, 6).map((row) => (
            <li key={`${row.id}-${row.detail}`} className="border-t border-line first:border-t-0">
              <Link
                href={`/admin/leads/${row.id}` as never}
                className="flex min-h-11 items-center justify-between gap-3 py-2 transition-colors duration-150 hover:text-oxblood"
              >
                <span className="min-w-0">
                  <span className="data-inline text-sm">{formatReg(row.reg)}</span>
                  <span className="ml-2 truncate text-caption text-structure">
                    {row.name ?? "No name yet"}
                  </span>
                </span>
                <span className="data-inline shrink-0 text-caption text-oxblood">
                  {row.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
