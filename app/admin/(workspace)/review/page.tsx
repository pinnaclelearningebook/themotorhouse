import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { AGENT } from "@/config/site";
import { agentSettings } from "@/lib/agent/settings";

export const metadata: Metadata = { title: "Review" };
export const dynamic = "force-dynamic";

/**
 * Every turn a guard stopped.
 *
 * This page is the reason agent_blocks keeps the original text. A list of
 * rule names would say the guards fire; reading what the model actually
 * tried to say is what shows how it fails, and that is what changes
 * agent/prompt.md. A week with no blocks is good news; a week with the
 * same block twenty times is a prompt problem, not a guard problem.
 */

interface BlockRow {
  id: string;
  at: string;
  rule: string;
  matched: string | null;
  original: string;
  replacement: string;
  lead_id: string | null;
}

const RULE_MEANING: Record<string, string> = {
  price: "Tried to give a number. The one failure this brand cannot afford.",
  frequency: "Claimed a track record. No car has been bought yet.",
  urgency: "Pressure, flattery or a deadline.",
  internal: "Leaked how the car is routed internally.",
  "contact-details": "Invented a phone number, address or company detail.",
  "unsupported-car-fact": "Stated something about the car the lookup never said.",
};

export default async function ReviewPage() {
  const settings = await agentSettings();

  const { data } = await db()
    .from("agent_blocks")
    .select("id, at, rule, matched, original, replacement, lead_id")
    .order("at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as BlockRow[];
  const byRule = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.rule] = (acc[row.rule] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-display-3">Review</h1>
        <p className="text-caption text-structure">
          {AGENT.name} is{" "}
          <span
            className={settings.storedEnabled ? "" : "font-medium text-oxblood"}
          >
            {settings.storedEnabled ? "on" : "off"}
          </span>{" "}
          · model <span className="data-inline font-mono">{settings.model}</span>{" "}
          · <span className="data-inline font-mono">{settings.maxTurns}</span>{" "}
          turns per conversation
        </p>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-structure">
        Turns a guard stopped before they reached a seller. The text below is
        what the model wrote, not what anyone was shown.
      </p>

      {settings.enabled && !settings.storedEnabled && (
        <p className="mt-6 rounded border border-oxblood p-4 text-sm">
          This session is running {AGENT.name} through a local development
          override. The stored setting is off, which is what production
          acts on. Anything appearing below came from a local conversation.
        </p>
      )}

      {!settings.enabled && (
        <p className="mt-6 rounded border border-line bg-paper-warm p-4 text-sm">
          {AGENT.name} is switched off, so nothing new will appear here. The
          switch is <span className="data-inline font-mono">agent_enabled</span>{" "}
          in{" "}
          <Link href="/admin/settings" className="link-draw text-oxblood">
            settings
          </Link>
          .
        </p>
      )}

      {Object.keys(byRule).length > 0 && (
        <dl className="mt-8 flex flex-wrap gap-6">
          {Object.entries(byRule)
            .sort((a, b) => b[1] - a[1])
            .map(([rule, count]) => (
              <div key={rule}>
                <dt className="text-caption tracking-wide text-structure uppercase">
                  {rule}
                </dt>
                <dd className="data-inline font-mono text-2xl">{count}</dd>
              </div>
            ))}
        </dl>
      )}

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-structure">
          Nothing blocked. Either {AGENT.name} has said nothing she
          shouldn&apos;t, or she has not spoken yet.
        </p>
      ) : (
        <ul className="mt-10 space-y-6">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-line pb-6 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="rounded border border-oxblood px-2 py-0.5 text-caption text-oxblood">
                  {row.rule}
                </span>
                <span className="data-inline font-mono text-caption text-structure">
                  {row.at.slice(0, 16).replace("T", " ")}
                </span>
                {row.matched && (
                  <span className="text-caption text-structure">
                    matched <span className="font-mono">{row.matched}</span>
                  </span>
                )}
                {row.lead_id && (
                  <Link
                    href={`/admin/leads/${row.lead_id}`}
                    className="link-draw text-caption text-oxblood"
                  >
                    the lead
                  </Link>
                )}
              </div>

              <p className="mt-1 text-caption text-structure">
                {RULE_MEANING[row.rule] ?? "Blocked."}
              </p>

              <p className="mt-3 text-sm">
                <span className="text-caption text-structure">She wrote</span>
                <br />
                {row.original}
              </p>
              <p className="mt-2 text-sm text-structure">
                <span className="text-caption">They saw</span>
                <br />
                {row.replacement}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
