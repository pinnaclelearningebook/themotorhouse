import type { ContactMethod } from "@/lib/validation";

/*
 * Deliberately not `server-only`. Everything here is a pure function
 * over a lead's own phone and email — a label, a tel: link, a wa.me
 * number. The inbox table is a client component and needs the same
 * labels and links the lead page uses; marking this server-only
 * forced a second copy, which is how two versions of "what WhatsApp
 * link do we build" would end up in the codebase.
 */

/**
 * How to act on a seller's stated preference, in one place.
 *
 * The operator opens the lead and does the thing the seller asked for.
 * Making them read the preference, then find the number, then pick the
 * right app is three decisions where there should be none — so each
 * method carries its own label and its own link.
 *
 * Everything here is derived from the lead's own phone and email. No
 * business number is involved, so none of this waits on the contact
 * details still outstanding in PENDING-INFO.md.
 */
export const METHOD_LABEL: Record<ContactMethod, string> = {
  call: "Phone call",
  whatsapp: "WhatsApp",
  sms: "Text message",
  email: "Email",
};

/** Short enough for an inbox row. */
export const METHOD_BADGE: Record<ContactMethod, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  sms: "Text",
  email: "Email",
};

/**
 * E.164 without the plus, which is what wa.me wants. A UK number
 * typed as 07700 900123 is 447700900123; anything already in
 * international form keeps its country code.
 */
export function waNumber(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1) || null;
  if (digits.startsWith("00")) return digits.slice(2) || null;
  if (digits.startsWith("0")) return `44${digits.slice(1)}`;
  return digits || null;
}

export interface ContactAction {
  label: string;
  href: string;
}

/**
 * The one-tap action for a method, or null when the detail it needs is
 * missing — an email preference with no address, say, which the form
 * prevents but historic rows can still carry.
 */
export function contactAction(
  method: ContactMethod,
  lead: { phone: string | null; email: string | null },
): ContactAction | null {
  if (method === "email") {
    return lead.email ? { label: "Email", href: `mailto:${lead.email}` } : null;
  }
  if (!lead.phone) return null;
  const tel = lead.phone.replace(/[^\d+]/g, "");
  if (method === "call") return { label: "Call", href: `tel:${tel}` };
  if (method === "sms") return { label: "Text", href: `sms:${tel}` };
  const wa = waNumber(lead.phone);
  return wa ? { label: "WhatsApp", href: `https://wa.me/${wa}` } : null;
}

/**
 * Every way of reaching this seller, preferred one first.
 *
 * The preference is what they asked for, not a restriction on us: a
 * seller who picks WhatsApp and does not reply still has a number we
 * promised to ring. The order says which to try first.
 */
export function contactActions(
  method: ContactMethod | null,
  lead: { phone: string | null; email: string | null },
): ContactAction[] {
  const order: ContactMethod[] = ["call", "whatsapp", "sms", "email"];
  const sorted = method
    ? [method, ...order.filter((m) => m !== method)]
    : order;
  return sorted
    .map((m) => contactAction(m, lead))
    .filter((a): a is ContactAction => a !== null);
}
