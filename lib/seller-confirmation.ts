import "server-only";
import { cookies } from "next/headers";

/**
 * Did the seller's confirmation email actually go?
 *
 * The thank-you page used to say "we have emailed you a confirmation"
 * and "reply to that email with a few photos" unconditionally. On
 * 12 October 2026 neither was true: Resend will not send from the
 * unverified domain in EMAIL_FROM, so every seller confirmation was
 * rejected while the page carried on claiming otherwise. A seller was
 * being told to watch an inbox nothing was coming to, and to reply to
 * an email that did not exist.
 *
 * The fact is only known inside the server action that tried to send
 * it, and the thank-you page is a different route reached by a client
 * push. A cookie is how the one tells the other: set on the way out of
 * the action, read once on the page.
 *
 * `httpOnly` because nothing in the browser needs it and a claim the
 * client can forge is not a fact. Fifteen minutes because it exists to
 * survive one redirect, and a stale answer on a later visit is worse
 * than no answer — which is why the absent case reads as "unknown" and
 * the page then says nothing about email at all.
 */
const COOKIE = "tmh-seller-email";
const FIFTEEN_MINUTES = 60 * 15;

export type SellerConfirmation = "sent" | "failed" | "unknown";

export async function recordSellerConfirmation(
  outcome: "sent" | "failed",
): Promise<void> {
  try {
    const store = await cookies();
    store.set(COOKIE, outcome, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FIFTEEN_MINUTES,
    });
  } catch {
    // Cookies cannot be set from every context. The page falls back to
    // "unknown", which claims nothing, so this is allowed to fail.
  }
}

export async function readSellerConfirmation(): Promise<SellerConfirmation> {
  try {
    const value = (await cookies()).get(COOKIE)?.value;
    return value === "sent" || value === "failed" ? value : "unknown";
  } catch {
    return "unknown";
  }
}
