import { Resend } from "resend";
import { SITE, PROMISES } from "@/config/site";
import type { StepOneData } from "@/lib/validation";

/**
 * Transactional email via Resend. The instant seller auto-reply is a P0
 * feature — it does more for conversion than the visual design.
 *
 * Without RESEND_API_KEY, EMAIL_FROM and OPERATOR_ALERT_EMAIL, both
 * emails are skipped with a loud server log, and /valuation shows a
 * dev banner while the keys are missing.
 */

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.EMAIL_FROM &&
      process.env.OPERATOR_ALERT_EMAIL,
  );
}

function logUnsent(which: string, payload: unknown) {
  console.error(
    [
      "",
      "==============================================================",
      `  EMAIL NOT SENT — RESEND CONFIG MISSING (${which})`,
      "  Set RESEND_API_KEY, EMAIL_FROM and OPERATOR_ALERT_EMAIL.",
      "  See PENDING-INFO.md. The seller heard nothing.",
      "==============================================================",
      JSON.stringify(payload, null, 2),
      "==============================================================",
      "",
    ].join("\n"),
  );
}

export async function sendOperatorAlert(
  submission: StepOneData & { id: string },
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("operator alert", submission);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to: process.env.OPERATOR_ALERT_EMAIL as string,
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
  });
}

export async function sendSellerConfirmation(
  submission: StepOneData & { id: string },
): Promise<void> {
  if (!isEmailConfigured()) {
    logUnsent("seller confirmation", submission);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
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
  });
}
