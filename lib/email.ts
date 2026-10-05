import { Resend } from "resend";
import { SITE, PROMISES } from "@/config/site";
import type { StepOneData } from "@/lib/validation";

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
  submission: StepOneData & { id: string },
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("operator alert", submission);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await send(resend, {
    from: process.env.EMAIL_FROM as string,
    to: operatorEmails(),
    subject: `New enquiry: ${submission.reg} — ${submission.mileage.toLocaleString("en-GB")} miles`,
    text: [
      `New offer request via ${SITE.name}.`,
      "",
      `Registration: ${submission.reg}`,
      `Mileage: ${submission.mileage.toLocaleString("en-GB")}`,
      `Postcode: ${submission.postcode}`,
      `Name: ${submission.name}`,
      `Phone: ${submission.phone}`,
      `Email: ${submission.email}`,
      "",
      `Record: ${submission.id}`,
      `The seller has been told to expect contact within ${PROMISES.offerWithinHours} hours.`,
    ].join("\n"),
  }, "operator alert");
}

export async function sendSellerConfirmation(
  submission: StepOneData & { id: string },
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("seller confirmation", submission);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await send(resend, {
    from: process.env.EMAIL_FROM as string,
    to: submission.email,
    subject: `Offer request received — ${submission.reg}`,
    text: [
      `Got it. You'll hear from a person within ${PROMISES.offerWithinHours} hours.`,
      "",
      `We have your ${submission.reg} down at ${submission.mileage.toLocaleString("en-GB")} miles. When we call, we'll confirm a firm offer — the number we give is the number we pay.`,
      "",
      "One thing that helps: reply to this email with a few photos of the car. The outside from each corner, the interior, and anything you'd want us to know about. It means the offer we make is one we can stand behind.",
      "",
      SITE.name,
    ].join("\n"),
  }, "seller confirmation");
}
