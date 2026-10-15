import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contactSchema, startLeadSchema, CONTACT_METHODS } from "@/lib/validation";
import { contactPatch } from "@/lib/submissions";
import { contactAction, contactActions, waNumber } from "@/lib/admin/contact";
import { funnelFrom, type InboxRow } from "@/lib/admin/inbox";

/**
 * Step 4 takes every contact detail, and the rules about which of them
 * are required (owner's decision, 15 October 2026).
 *
 * The two that matter commercially:
 *
 * The **phone number is required whichever method they pick**, because
 * the published promise is that a person rings with the offer. A lead
 * without a number is a lead we cannot keep that promise on, and the
 * easiest way to lose it is to make the field conditional on the
 * preference — which looks obliging and quietly breaks the promise.
 *
 * The **email is required only when they ask to be emailed**. The
 * opposite mistake: withholding an offer over an address we only
 * wanted for a copy of the enquiry.
 */

const VALID = {
  name: "Helen Marsh",
  preferredContactMethod: "call" as const,
  phone: "07700 900123",
  email: "helen@example.com",
  postcode: "SW1A 1AA",
  contactWindow: "Mornings",
  marketingConsent: false,
};

describe("step 1 asks for the registration and nothing else", () => {
  it("creates a lead from a registration alone", () => {
    const parsed = startLeadSchema.safeParse({ reg: "AB12 CDE" });
    expect(parsed.success).toBe(true);
  });

  it("has no phone field left to send", () => {
    const parsed = startLeadSchema.parse({ reg: "AB12CDE" });
    expect(Object.keys(parsed)).not.toContain("phone");
  });
});

describe("step 4 — how to reach you", () => {
  it("accepts a complete answer", () => {
    expect(contactSchema.safeParse(VALID).success).toBe(true);
  });

  it("requires a contact method", () => {
    const rest: Record<string, unknown> = { ...VALID };
    delete rest.preferredContactMethod;
    const parsed = contactSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(Object.keys(parsed.error.flatten().fieldErrors)).toContain(
        "preferredContactMethod",
      );
    }
  });

  it("offers exactly the four methods the form shows", () => {
    expect([...CONTACT_METHODS]).toEqual(["call", "whatsapp", "sms", "email"]);
    const step = readFileSync("components/forms/StepYou.tsx", "utf8");
    for (const method of CONTACT_METHODS) {
      expect(step, `the form is missing ${method}`).toMatch(
        new RegExp(`value: "${method}"`),
      );
    }
  });

  /* ─── the phone rule ─────────────────────────────────────────────── */

  it("requires a phone number for every method, not just the call", () => {
    for (const method of CONTACT_METHODS) {
      const parsed = contactSchema.safeParse({
        ...VALID,
        preferredContactMethod: method,
        phone: "",
      });
      expect(parsed.success, `${method} was allowed through with no phone`).toBe(
        false,
      );
      if (!parsed.success) {
        expect(
          Object.keys(parsed.error.flatten().fieldErrors),
          `${method} failed on something other than the phone`,
        ).toContain("phone");
      }
    }
  });

  it("says why the number is needed, where it is asked for", () => {
    // A seller who picks WhatsApp and is then asked for a phone number
    // is owed the reason on the field, not in a policy somewhere.
    const step = readFileSync("components/forms/StepYou.tsx", "utf8");
    expect(step).toMatch(/So we can reach you with your firm offer/);
  });

  /* ─── the email rule ─────────────────────────────────────────────── */

  it("requires an email only when email is the chosen method", () => {
    const withoutEmail = { ...VALID, email: "" };

    for (const method of ["call", "whatsapp", "sms"] as const) {
      const parsed = contactSchema.safeParse({
        ...withoutEmail,
        preferredContactMethod: method,
      });
      expect(parsed.success, `${method} should not need an email`).toBe(true);
      if (parsed.success) expect(parsed.data.email).toBeNull();
    }

    const parsed = contactSchema.safeParse({
      ...withoutEmail,
      preferredContactMethod: "email",
    });
    expect(parsed.success, "email as the method must require an address").toBe(
      false,
    );
    if (!parsed.success) {
      expect(Object.keys(parsed.error.flatten().fieldErrors)).toContain("email");
    }
  });

  it("still checks the format of an optional email that was given", () => {
    const parsed = contactSchema.safeParse({
      ...VALID,
      preferredContactMethod: "call",
      email: "not-an-address",
    });
    expect(parsed.success).toBe(false);
  });

  it("writes the method and the completion time to the lead", () => {
    const patch = contactPatch(contactSchema.parse(VALID));
    expect(patch.preferred_contact_method).toBe("call");
    expect(patch.phone).toBe("07700 900123");
    expect(patch.completed_at).toBeTruthy();
  });
});

/* ─── what the operator does with it ───────────────────────────────── */

describe("the one-tap action per method", () => {
  const lead = { phone: "07700 900123", email: "helen@example.com" };

  it("builds the right link for each method", () => {
    expect(contactAction("call", lead)?.href).toBe("tel:07700900123");
    expect(contactAction("sms", lead)?.href).toBe("sms:07700900123");
    expect(contactAction("email", lead)?.href).toBe("mailto:helen@example.com");
    expect(contactAction("whatsapp", lead)?.href).toBe(
      "https://wa.me/447700900123",
    );
  });

  it("converts a UK number to what wa.me expects", () => {
    // wa.me takes E.164 without the plus. A leading 0 is a UK trunk
    // prefix, not part of the number, and sending it opens a chat with
    // nobody.
    expect(waNumber("07700 900123")).toBe("447700900123");
    expect(waNumber("+44 7700 900123")).toBe("447700900123");
    expect(waNumber("0044 7700 900123")).toBe("447700900123");
    expect(waNumber("(07700) 900-123")).toBe("447700900123");
  });

  it("offers nothing it cannot deliver", () => {
    expect(contactAction("email", { phone: "07700 900123", email: null })).toBeNull();
    expect(contactAction("call", { phone: null, email: "a@b.com" })).toBeNull();
  });

  it("puts the preferred method first but keeps the others", () => {
    const actions = contactActions("whatsapp", lead);
    expect(actions[0].label).toBe("WhatsApp");
    // A preference is what the seller asked for, not a restriction on
    // us — the number they gave is still a number we promised to ring.
    expect(actions.map((a) => a.label)).toContain("Call");
  });
});

/* ─── the inbox ────────────────────────────────────────────────────── */

function row(over: Partial<InboxRow>): InboxRow {
  return {
    id: "x", reg: "AB12CDE", name: null, phone: null, email: null,
    preferredContactMethod: null, incomplete: true, furthestStep: 2,
    createdAt: "2026-10-15T09:00:00Z", timeline: null, status: "new",
    make: null, model: null, year: null, score: null, confidence: null,
    recommendedChannel: null, flagCount: 0, pending: false, ...over,
  };
}

describe("incomplete leads", () => {
  it("are counted in the funnel but are not the queue", () => {
    const rows = [
      row({ id: "a", furthestStep: 2 }),
      row({ id: "b", furthestStep: 3 }),
      row({ id: "c", furthestStep: 4 }),
      row({ id: "d", furthestStep: 4, incomplete: false, name: "Helen" }),
    ];
    expect(funnelFrom(rows)).toEqual({
      confirmedCar: 4,
      reachedSale: 3,
      reachedContact: 2,
      completed: 1,
    });
    expect(rows.filter((r) => !r.incomplete)).toHaveLength(1);
  });

  it("are hidden from the inbox unless asked for", () => {
    const page = readFileSync("app/admin/(workspace)/page.tsx", "utf8");
    expect(page).toMatch(/showIncomplete \? all : all\.filter/);
    expect(page).toMatch(/incomplete=1/);
    expect(page).toMatch(/Hide incomplete/);
  });

  it("admits the funnel cannot see people who never confirmed a car", () => {
    // The first number is "confirmed a car", not "visitors", and the
    // page has to say so — a funnel whose top is quietly not the top
    // is worse than no funnel.
    const page = readFileSync("app/admin/(workspace)/page.tsx", "utf8");
    expect(page).toMatch(/left before confirming the car leaves no record/);
  });
});

/* ─── the alerts ───────────────────────────────────────────────────── */

describe("operator alerts", () => {
  it("no longer fire when a lead starts", () => {
    const actions = readFileSync("app/actions/valuation.ts", "utf8");
    const startAction = actions.slice(
      actions.indexOf("export async function startLeadAction"),
      actions.indexOf("export async function patchCarAction"),
    );
    expect(startAction.length).toBeGreaterThan(100);
    expect(
      startAction,
      "a lead with no contact details is not worth an alert",
    ).not.toMatch(/sendOperatorAlert/);
  });

  it("still fire on completion, with the chosen method in them", () => {
    const actions = readFileSync("app/actions/valuation.ts", "utf8");
    const complete = actions.slice(
      actions.indexOf("export async function completeLeadAction"),
    );
    expect(complete).toMatch(/sendOperatorAlert/);
    expect(complete).toMatch(/preferredContactMethod: parsed\.data\.preferredContactMethod/);

    const email = readFileSync("lib/email.ts", "utf8");
    expect(email).toMatch(/They asked to be contacted by/);
    // The subject line is what an operator sees first on a phone.
    expect(email).toMatch(/New enquiry: \$\{submission\.reg\} — \$\{method\}/);
  });

  it("and the scored alert is untouched", () => {
    const email = readFileSync("lib/email.ts", "utf8");
    expect(email).toMatch(/export async function sendEnrichmentAlert/);
  });
});

/* ─── Maya ─────────────────────────────────────────────────────────── */

describe("the assistant", () => {
  it("is told never to ask for a contact detail", () => {
    const prompt = readFileSync("agent/prompt.md", "utf8");
    expect(prompt).toMatch(/\*\*Never ask for a contact detail\.\*\*/);
  });

  it("no longer has a seller objecting to a request we do not make", () => {
    // The worked example had a seller say "you're asking for my phone
    // number" at a point in the form where we now ask for nothing.
    const prompt = readFileSync("agent/prompt.md", "utf8");
    expect(prompt).not.toMatch(/You're asking for my phone\s*\n?>?\s*number/);
  });
});
