import Link from "next/link";
import { SETTING_FIELDS } from "@/config/settings-schema";

/**
 * The decision panel.
 *
 * Section 17 requires every number here to show where it came from. In
 * practice that mostly means showing ABSENCE honestly: the engine
 * refuses to calculate a margin without the settings, so this panel's
 * job today is to say which number is missing and what would fix it,
 * rather than printing a confident figure nobody can stand behind.
 *
 * Nothing here is an offer. max_bid is a ceiling for a person.
 */
export interface DecisionEnrichment {
  version: number;
  created_at: string;
  score: number | null;
  confidence: string | null;
  recommended_channel: string | null;
  age_at_landing_years: number | null;
  target_model_match: boolean | null;
  export_blockers: string[] | null;
  projected_margin_export: number | null;
  projected_margin_domestic: number | null;
  max_bid_export: number | null;
  max_bid_domestic: number | null;
  reasoning: string[] | null;
  flags: string[] | null;
}

function Figure({
  label,
  value,
  source,
  missing,
}: {
  label: string;
  value: string | null;
  source: string;
  missing?: boolean;
}) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span className={`data-inline text-sm ${missing ? "text-oxblood" : ""}`}>
          {value ?? "not calculated"}
        </span>
      </div>
      <p className="mt-0.5 text-caption text-structure">{source}</p>
    </div>
  );
}

export function DecisionPanel({
  enrichment,
}: {
  enrichment: DecisionEnrichment | null;
}) {
  if (!enrichment) {
    return (
      <section className="rounded border border-line p-6">
        <h2 className="font-display text-2xl">Decision</h2>
        <p className="mt-3 text-sm text-structure">
          Not scored yet. The inbox scores anything outstanding when it
          loads, so this usually fills in within a moment of the lead
          arriving.
        </p>
      </section>
    );
  }

  const money = (n: number | null) =>
    n === null ? null : `£${n.toLocaleString("en-GB")}`;

  const blockingSettings = SETTING_FIELDS.filter(
    (field) =>
      field.absenceCost &&
      (enrichment.flags ?? []).some((flag) =>
        flag.toLowerCase().includes(field.label.toLowerCase()),
      ),
  );

  return (
    <section className="rounded border border-line p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl">Decision</h2>
        <span className="data-inline text-caption text-structure">
          v{enrichment.version} ·{" "}
          {enrichment.created_at.slice(0, 16).replace("T", " ")}
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-8">
        <div>
          <span className="data-inline text-display-3">
            {enrichment.score ?? "—"}
          </span>
          <span className="ml-1 text-caption text-structure">/100</span>
          <p className="text-caption text-structure">
            triage priority, not money
          </p>
        </div>
        <div>
          <span className="text-sm">
            {enrichment.recommended_channel ?? "No channel recommended"}
          </span>
          <p className="text-caption text-structure">
            confidence: {enrichment.confidence ?? "unknown"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Figure
          label="Age at landing"
          value={
            enrichment.age_at_landing_years === null
              ? null
              : `${enrichment.age_at_landing_years} years`
          }
          source="First registration from the DVLA record, plus five weeks to landing"
          missing={enrichment.age_at_landing_years === null}
        />
        <Figure
          label="Target model"
          value={enrichment.target_model_match ? "yes" : "no"}
          source="Matched against the target model list in Settings"
        />
        <Figure
          label="Projected export margin"
          value={money(enrichment.projected_margin_export)}
          source="Needs a valuation and the landed-cost settings"
          missing={enrichment.projected_margin_export === null}
        />
        <Figure
          label="Projected domestic margin"
          value={money(enrichment.projected_margin_domestic)}
          source="Needs a valuation, reconditioning and the CRA contingency"
          missing={enrichment.projected_margin_domestic === null}
        />
        <Figure
          label="Maximum bid, export"
          value={money(enrichment.max_bid_export)}
          source="Derived from the export margin. A ceiling for a person, never an offer."
          missing={enrichment.max_bid_export === null}
        />
        <Figure
          label="Maximum bid, domestic"
          value={money(enrichment.max_bid_domestic)}
          source="Derived from the domestic margin. A ceiling for a person, never an offer."
          missing={enrichment.max_bid_domestic === null}
        />
      </div>

      {(enrichment.export_blockers ?? []).length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium">Export blocked by</p>
          <ul className="mt-2 space-y-1 text-sm text-structure">
            {(enrichment.export_blockers ?? []).map((blocker) => (
              <li key={blocker}>· {blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {(enrichment.reasoning ?? []).length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium">Why</p>
          <ul className="mt-2 space-y-1.5 text-sm text-structure">
            {(enrichment.reasoning ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {(enrichment.flags ?? []).length > 0 && (
        <div className="mt-6 rounded border border-oxblood bg-paper-warm p-4">
          <p className="text-sm font-medium">Needs attention</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(enrichment.flags ?? []).map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
          {blockingSettings.length > 0 && (
            <p className="mt-3 text-caption">
              <Link href="/admin/settings" className="link-draw text-oxblood">
                Fill these in on Settings
              </Link>{" "}
              and the next scoring run calculates the margins.
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-caption text-structure">
        No offer has been made or suggested. A person types the number.
      </p>
    </section>
  );
}
