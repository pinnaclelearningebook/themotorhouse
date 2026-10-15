import { Resend } from "resend";
import { SITE, PROMISES } from "@/config/site";
import type { ContactMethod } from "@/lib/validation";
/**
 * Only what the two emails actually print. Typing these to a form step
 * coupled the mailer to one version of the form; both the two-step and
 * four-step paths now satisfy the same shape.
 */
export interface AlertPayload {
  id: string;
  reg: string;
  phone: string;
  /**
   * How the seller asked to be reached. The first line of the alert,
   * because it decides what the operator does next.
   */
  preferredContactMethod?: ContactMethod | null;
  mileage?: number | null;
  postcode?: string | null;
  name?: string | null;
  email?: string | null;
  marketingConsent?: boolean;
}

/**
 * One operator alert, on completion.
 *
 * There was a second, on first persistence, from when a phone number
 * arrived at step 1 and every new row was worth ringing. Contact
 * details all land at step 4 now, so that alert would name a
 * registration nobody can be contacted about — an interruption with
 * no action attached, and three a day is how an operator learns to
 * ignore the ones that matter. Drop-off is counted in /admin instead.
 */
const METHOD_LABEL: Record<ContactMethod, string> = {
  call: "Phone call",
  whatsapp: "WhatsApp",
  sms: "Text message",
  email: "Email",
};

/**
 * Transactional email via Resend. The instant seller auto-reply is a P0
 * feature — it does more for conversion than the visual design.
 *
 * Without RESEND_API_KEY, EMAIL_FROM and OPERATOR_EMAILS, both
 * emails are skipped with a loud server log, and /valuation shows a
 * dev banner while the keys are missing.
 */

/**
 * Who each kind of email comes from.
 *
 * Two senders, because the two audiences have different constraints
 * while the domain is unverified. Resend will not send from an
 * unverified domain at all, so `EMAIL_FROM` — currently a gmail
 * address — is rejected outright, and on 12 October 2026 that meant
 * every operator alert, every scored alert and every seller
 * confirmation silently failed. A seller could submit and nobody was
 * told.
 *
 * The stopgap is Resend's own `onboarding@resend.dev`, which works
 * without a verified domain but will only deliver to the Resend
 * account holder. That is fine for an operator alert, which goes to
 * one inbox we control, and useless for a seller confirmation, which
 * goes wherever the seller says. So the operator mail gets its own
 * sender and starts working today; the seller mail keeps `EMAIL_FROM`
 * and keeps failing loudly until the domain is live.
 *
 * Both collapse to one variable the moment the domain exists: set
 * EMAIL_FROM to the verified sender and delete EMAIL_FROM_OPERATOR.
 * See PENDING-INFO.md.
 */
function operatorSender(): string {
  return (process.env.EMAIL_FROM_OPERATOR ||
    process.env.EMAIL_FROM) as string;
}

function sellerSender(): string {
  return process.env.EMAIL_FROM as string;
}

/**
 * Operator alert recipients. OPERATOR_EMAILS is comma-separated so both
 * operators are alerted from day one (ARCHITECTURE.md section 8).
 */
export function operatorEmails(): string[] {
  return (process.env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.EMAIL_FROM &&
      operatorEmails().length > 0,
  );
}

function logUnsent(which: string, payload: unknown) {
  console.error(
    [
      "",
      "==============================================================",
      `  EMAIL NOT SENT — RESEND CONFIG MISSING (${which})`,
      "  Set RESEND_API_KEY, EMAIL_FROM and OPERATOR_EMAILS.",
      "  See PENDING-INFO.md. The seller heard nothing.",
      "==============================================================",
      JSON.stringify(payload, null, 2),
      "==============================================================",
      "",
    ].join("\n"),
  );
}


/**
 * The Resend SDK resolves with { data, error } rather than throwing when
 * the API rejects a send, so awaiting it without inspecting the result
 * swallows every failure silently — a bad key or an unverified domain
 * would look identical to a delivered email. Throw instead, so the
 * caller's Promise.allSettled handler logs it.
 */
async function send(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0],
  label: string,
): Promise<string> {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`${label} rejected by Resend: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(`${label} returned no id from Resend`);
  }
  return data.id;
}

export async function sendOperatorAlert(
  submission: AlertPayload,
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("operator alert", submission);
    return;
  }

  const method = submission.preferredContactMethod
    ? METHOD_LABEL[submission.preferredContactMethod]
    : "Not asked";

  const lines = [
    `Enquiry completed on ${SITE.name}.`,
    "",
    `They asked to be contacted by: ${method.toUpperCase()}`,
    `Phone: ${submission.phone}`,
    submission.email ? `Email: ${submission.email}` : null,
    "",
    `Registration: ${submission.reg}`,
    submission.mileage
      ? `Mileage: ${submission.mileage.toLocaleString("en-GB")}`
      : null,
    submission.postcode ? `Postcode: ${submission.postcode}` : null,
    submission.name ? `Name: ${submission.name}` : null,
    "",
    `Record: ${submission.id}`,
    `The seller has been told to expect contact within ${PROMISES.offerWithinHours} hours.`,
  ].filter((line): line is string => line !== null);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const id = await send(
    resend,
    {
      from: operatorSender(),
      to: operatorEmails(),
      subject: `New enquiry: ${submission.reg} — ${method}`,
      text: lines.join("\n"),
    },
    "operator alert",
  );
  /*
   * Logged on success, not only on failure. The send-only API key
   * cannot list what Resend has accepted, so without this the only
   * evidence an alert went out is the absence of an error — which is
   * also what a silently skipped send looks like. The id is the thing
   * to quote to Resend support when an operator says nothing arrived.
   */
  console.log(
    `operator alert accepted by Resend (${id}) for lead ${submission.id} ` +
      `[${submission.preferredContactMethod ?? "method not asked"}] → ` +
      `${operatorEmails().length} recipient(s)`,
  );
}

/**
 * Returns true only when Resend accepted the message.
 *
 * It resolves rather than throws in two cases that are not a send —
 * no email address, and no Resend configuration at all — and the
 * thank-you page keys its wording off this, so "the promise resolved"
 * must not be allowed to read as "the seller has an email". Anything
 * other than an accepted send is false, and a rejection still throws
 * so the caller can log the cause.
 */
export async function sendSellerConfirmation(
  submission: AlertPayload,
): Promise<boolean> {
  if (!isEmailConfigured()) {
    logUnsent("seller confirmation", submission);
    return false;
  }
  if (!submission.email) return false;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await send(resend, {
    from: sellerSender(),
    to: submission.email as string,
    subject: `Offer request received — ${submission.reg}`,
    text: [
      `Got it. You'll hear from a person within ${PROMISES.offerWithinHours} hours.`,
      "",
      `We have your ${submission.reg} down${submission.mileage ? ` at ${submission.mileage.toLocaleString("en-GB")} miles` : ""}. When we call, we'll confirm a firm offer — the number we give is the number we pay.`,
      "",
      "One thing that helps: reply to this email with a few photos of the car. The outside from each corner, the interior, and anything you'd want us to know about. It means the offer we make is one we can stand behind.",
      "",
      SITE.name,
    ].join("\n"),
  }, "seller confirmation");
  return true;
}


export interface EnrichmentAlert {
  leadId: string;
  reg: string;
  phone: string | null;
  name: string | null;
  score: number;
  confidence: string;
  recommendedChannel: string | null;
  reasoning: string[];
  flags: string[];
  link: string;
}

/**
 * The scored alert, sent to operators once enrichment completes.
 *
 * Internal only. None of this — score, channel, eligibility — is ever
 * shown to a seller or included in a seller email (CLAUDE.md section 11).
 */
export async function sendEnrichmentAlert(
  alert: EnrichmentAlert,
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("enrichment alert", alert);
    return;
  }

  const lines = [
    `${alert.reg}${alert.name ? ` — ${alert.name}` : ""}`,
    alert.phone ? `Phone: ${alert.phone}` : null,
    "",
    `Priority score: ${alert.score} of 100 (triage order, not money)`,
    `Confidence: ${alert.confidence}`,
    `Recommended channel: ${alert.recommendedChannel ?? "none — see below"}`,
    "",
    "Why:",
    ...alert.reasoning.map((line) => `  - ${line}`),
    alert.flags.length ? "" : null,
    alert.flags.length ? "Needs attention:" : null,
    ...alert.flags.map((line) => `  - ${line}`),
    "",
    `Open the lead: ${alert.link}`,
    "",
    "No offer has been made or suggested. A person decides the number.",
  ].filter((line): line is string => line !== null);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const id = await send(
    resend,
    {
      from: operatorSender(),
      to: operatorEmails(),
      subject: `Scored: ${alert.reg} — ${alert.score}/100`,
      text: lines.join("\n"),
    },
    "enrichment alert",
  );
  console.log(
    `enrichment alert accepted by Resend (${id}) for lead ${alert.leadId}`,
  );
}
