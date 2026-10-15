import "server-only";
import { cookies } from "next/headers";
import { CONTACT_METHODS, type ContactMethod } from "@/lib/validation";

/**
 * What the thank-you page is allowed to say, carried from the action
 * that knows it.
 *
 * Two facts, both only knowable inside completeLeadAction, both needed
 * by a different route that the browser reaches by a client push.
 *
 * The first is **which channel the seller chose**, so the page can say
 * "we will WhatsApp you" rather than guessing.
 *
 * The second is **whether the confirmation email actually sent**. On
 * 12 October 2026 the page said "we have emailed you a confirmation"
 * and "reply to that email with a few photos" to everyone, while
 * Resend was rejecting every one of them: the sending domain is not
 * verified. A seller was being told to watch an inbox nothing was
 * coming to.
 *
 * A cookie is how the one tells the other. `httpOnly` because nothing
 * in the browser needs it and a claim the client can forge is not a
 * fact. Fifteen minutes because it exists to survive one redirect, and
 * a stale answer on a later visit is worse than no answer — which is
 * why an absent or unreadable value reads as "unknown" and the page
 * then claims nothing.
 */
const COOKIE = "tmh-thank-you";
const FIFTEEN_MINUTES = 60 * 15;

export type SellerConfirmation = "sent" | "failed" | "unknown";

export interface ThankYouState {
  /** Null when we never asked, or when the cookie is gone. */
  method: ContactMethod | null;
  confirmation: SellerConfirmation;
}

export async function recordThankYouState(state: {
  method: ContactMethod;
  confirmation: "sent" | "failed";
}): Promise<void> {
  try {
    const store = await cookies();
    store.set(COOKIE, `${state.method}.${state.confirmation}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FIFTEEN_MINUTES,
    });
  } catch {
    // Cookies cannot be set from every context. The page falls back to
    // claiming nothing, so this is allowed to fail.
  }
}

export async function readThankYouState(): Promise<ThankYouState> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value ?? "";
    const [method, confirmation] = raw.split(".");
    return {
      method: (CONTACT_METHODS as readonly string[]).includes(method)
        ? (method as ContactMethod)
        : null,
      confirmation:
        confirmation === "sent" || confirmation === "failed"
          ? confirmation
          : "unknown",
    };
  } catch {
    return { method: null, confirmation: "unknown" };
  }
}
