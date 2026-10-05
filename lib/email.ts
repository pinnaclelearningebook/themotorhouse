import { Resend } from "resend";
import { SITE, PROMISES } from "@/config/site";
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
   * "started" fires the moment a car is confirmed and a phone number
   * lands — a registration and a number, nothing else, because that is
   * already enough to ring someone and it is the alert that catches a
   * seller who never finishes the form.
   *
   * "completed" fires when the rest arrives.
   */
  stage: "started" | "completed";
  mileage?: number | null;
  postcode?: string | null;
  name?: string | null;
  email?: string | null;
  marketingConsent?: boolean;
}

/**
 * Transactional email via Resend. The instant seller auto-reply is a P0
 * feature — it does more for conversion than the visual design.
 *
 * Without RESEND_API_KEY, EMAIL_FROM and OPERATOR_EMAILS, both
 * emails are skipped with a loud server log, and /valuation shows a
 * dev banner while the keys are missing.
 */

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

  const started = submission.stage === "started";
  const lines = started
    ? [
        `A seller started an enquiry on ${SITE.name} and gave a number.`,
        "",
        `Registration: ${submission.reg}`,
        `Phone: ${submission.phone}`,
        "",
        "They have not finished the form yet. If nothing follows this",
        "email, the number above is still worth a call.",
        "",
        `Record: ${submission.id}`,
      ]
    : [
        `Enquiry completed on ${SITE.name}.`,
        "",
        `Registration: ${submission.reg}`,
        submission.mileage
          ? `Mileage: ${submission.mileage.toLocaleString("en-GB")}`
          : null,
        submission.postcode ? `Postcode: ${submission.postcode}` : null,
        submission.name ? `Name: ${submission.name}` : null,
        `Phone: ${submission.phone}`,
        submission.email ? `Email: ${submission.email}` : null,
        "",
        `Record: ${submission.id}`,
        `The seller has been told to expect contact within ${PROMISES.offerWithinHours} hours.`,
      ].filter((line): line is string => line !== null);

  const resend = new Resend(process.env.RESEND_API_KEY);
  await send(
    resend,
    {
      from: process.env.EMAIL_FROM as string,
      to: operatorEmails(),
      subject: started
        ? `Lead started: ${submission.reg}`
        : `New enquiry: ${submission.reg}`,
      text: lines.join("\n"),
    },
    "operator alert",
  );
}

export async function sendSellerConfirmation(
  submission: AlertPayload,
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("seller confirmation", submission);
    return;
  }
  if (!submission.email) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await send(resend, {
    from: process.env.EMAIL_FROM as string,
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
}
