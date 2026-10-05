import { isStoreConfigured } from "@/lib/submissions";
import { isEmailConfigured } from "@/lib/email";
import { isDvlaConfigured } from "@/lib/adapters/dvla";
import { isDvsaConfigured } from "@/lib/adapters/dvsa";

/**
 * Development-only warning that submissions are going nowhere.
 * Impossible to miss by design — see also the loud server logs in
 * lib/submissions.ts and lib/email.ts.
 */
export function DevConfigBanner() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const missing: string[] = [];
  if (!isStoreConfigured()) {
    missing.push(
      "Supabase not configured — submissions are NOT stored anywhere",
    );
  }
  if (!isEmailConfigured()) {
    missing.push(
      "Resend config missing — no operator alert, no seller auto-reply",
    );
  }
  if (!isDvlaConfigured()) {
    missing.push(
      "DVLA key missing — no vehicle lookup, sellers type everything by hand",
    );
  }
  if (!isDvsaConfigured()) {
    missing.push(
      "DVSA MOT credentials missing — no model and no mileage on the card",
    );
  }

  if (missing.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="border-4 border-dashed border-oxblood bg-oxblood p-6 text-paper"
    >
      <p className="font-mono text-sm font-bold tracking-wide uppercase">
        Dev warning: this form is a dead letter box
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {missing.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        Set the keys in .env.local — see .env.example and PENDING-INFO.md.
        This banner never renders in production.
      </p>
    </div>
  );
}
