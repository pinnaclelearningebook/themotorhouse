import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runGuards, PRICE_DEFLECTION, type VehicleContext } from "@/agent/guards";

/**
 * The guards are the only thing standing between a chatty model and a
 * number a seller acts on, so they are tested in both directions:
 * violations that must be caught, and legitimate turns that must survive
 * untouched. The second list is the one that keeps the first honest — it
 * is easy to block everything.
 */

const DEFENDER: VehicleContext = {
  make: "LAND ROVER",
  model: "Defender",
  year: 2023,
  colour: "Santorini Black",
  fuel: "Diesel",
  engineCapacity: 2996,
  mileage: 18400,
};

/** Ways a model talks itself into a number. */
const PRICES = [
  "I'd say it's worth around £28,000.",
  "Cars like yours tend to fetch 25k.",
  "Somewhere in the twenties, probably.",
  "You're looking at about 30 grand.",
  "The figure is usually 24,000 for one of these.",
  "I'd expect mid-thirties.",
  "Ballpark, you'd be fine.",
  "North of £20,000, certainly.",
  "It'd get you twenty thousand.",
  "Between £22,000 and £26,000.",
  "In the region of what you paid.",
  "That puts you in the thirty thousand bracket.",
  "We'd pay you 27500 for it.",
  "Circa what the trade would offer.",
];

/** Ways a model invents a past the business does not have. */
const FREQUENCY = [
  "We buy cars with finance outstanding most weeks.",
  "We see a lot of these.",
  "We've bought hundreds of them.",
  "In our experience that's unusual.",
  "We often take cars in that condition.",
  "We regularly handle settlements.",
  "That's an ordinary thing for us to buy.",
  "We handle finance on most of the cars we buy.",
  "Plenty of these come through.",
  "We've seen that before.",
  "Cars like this come in every day.",
  "We do this all the time.",
];

const URGENCY = [
  "These are selling fast at the moment.",
  "Values are dropping, so I wouldn't wait.",
  "Act now and you'll be fine.",
  "That's a lovely car you've got.",
  "Before you go, one more thing.",
  "You've clearly looked after it.",
];

const INTERNAL = [
  "Your car is export eligible.",
  "This one's eligible for export, which is why the offer is strong.",
  "Our max bid on this is set by the engine.",
  "The projected margin works for us.",
  "You scored 95, which is high.",
  "We'd be exporting it to Cyprus.",
];

const CONTACT = [
  "Give us a ring on 0161 496 0000.",
  "Email us at hello@themotorhouse.uk.",
  "Our registered office is at 1 Example Street, M1 2AB.",
  "You can reach the office on +44 161 496 0000.",
];

/** Turns that are correct, useful and must not be touched. */
const LEGITIMATE = [
  "Put yes, and don't worry about the amount. We buy cars with finance still outstanding.",
  "A person prices your car once your details are in, and that's with you within 2 hours.",
  "The offer stands for seven days, provided the mileage hasn't materially increased.",
  "No deductions. Not at collection, not ever.",
  "Payment reaches you before the transporter leaves with the car.",
  "We buy any car, any age.",
  "You ring your lender and ask for a settlement figure. They have to give it to you.",
  "Once you've paid half the total amount payable you can end the agreement.",
  "The Defender has 18400 on it according to the last MOT.",
  "It's a 2023 Defender in Santorini Black, diesel.",
  "Free collection anywhere in mainland UK.",
  "Marketing is a separate tick box you haven't been opted into.",
  "I've got nothing on screen yet, so I'd only be guessing if I named it.",
  "No cut-off. Age changes what a car is worth, which is the person's job.",
  "There are two fields left and then it's with a person.",
];

describe("price guard", () => {
  it.each(PRICES)("blocks: %s", (text) => {
    const result = runGuards(text, DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rule).toBe("price");
      expect(result.replacement).toBe(PRICE_DEFLECTION);
      expect(result.original).toBe(text);
    }
  });

  it("keeps the original text for the review log, never sends it", () => {
    const result = runGuards("It's worth about £28,000.", DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.original).toContain("28,000");
      expect(result.replacement).not.toContain("28,000");
    }
  });
});

describe("frequency and track-record guard", () => {
  it.each(FREQUENCY)("blocks: %s", (text) => {
    const result = runGuards(text, DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("frequency");
  });
});

describe("urgency and flattery guard", () => {
  it.each(URGENCY)("blocks: %s", (text) => {
    expect(runGuards(text, DEFENDER).ok).toBe(false);
  });
});

describe("internal routing guard", () => {
  it.each(INTERNAL)("blocks: %s", (text) => {
    expect(runGuards(text, DEFENDER).ok).toBe(false);
  });
});

describe("contact detail guard", () => {
  it.each(CONTACT)("blocks: %s", (text) => {
    expect(runGuards(text, DEFENDER).ok).toBe(false);
  });
});

describe("car facts", () => {
  it("allows a make that is in the lookup context", () => {
    expect(runGuards("The Land Rover is diesel.", DEFENDER).ok).toBe(true);
  });

  it("blocks a make that is not", () => {
    const result = runGuards("Sounds like the Audi then.", DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("unsupported-car-fact");
  });

  it("blocks naming any car when the context is empty", () => {
    expect(runGuards("A 2014 Ford is fine by us.", {}).ok).toBe(false);
  });

  it("blocks a spec figure the lookup never supplied", () => {
    const result = runGuards("That's the 300bhp version.", DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("unsupported-car-fact");
  });
});

describe("legitimate turns", () => {
  it.each(LEGITIMATE)("passes untouched: %s", (text) => {
    const result = runGuards(text, DEFENDER);
    expect(result.ok, `wrongly blocked: ${text}`).toBe(true);
    if (result.ok) expect(result.text).toBe(text);
  });
});

describe("the prompt and the guards agree", () => {
  /**
   * Every line agent/prompt.md puts in Maya's mouth is run through the
   * guards. If an exemplar would be blocked, one of the two is wrong:
   * either she is being taught something she must not say, or a guard is
   * over-reaching. Both are worth failing a build over, and neither shows
   * up in the two hand-written lists above.
   */
  function mayasLines(): string[] {
    const src = readFileSync(join(process.cwd(), "agent/prompt.md"), "utf8");
    const lines: string[] = [];
    let current: string | null = null;

    for (const raw of src.split("\n")) {
      const line = raw.replace(/^>\s?/, "");
      if (/^\*\*\{\{AGENT_NAME\}\}:\*\*/.test(line)) {
        if (current) lines.push(current);
        current = line.replace(/^\*\*\{\{AGENT_NAME\}\}:\*\*\s*/, "");
      } else if (current !== null) {
        const ended =
          /^\*\*Seller:\*\*/.test(line) || line.trim() === "" || raw.startsWith("#");
        if (ended) {
          lines.push(current);
          current = null;
        } else {
          current += " " + line;
        }
      }
    }
    if (current) lines.push(current);
    return lines.map((l) => l.replace(/\{\{OFFER_HOURS\}\}/g, "2").trim());
  }

  // The Astra exemplar declares its own vehicle context; the rest have none,
  // which is the stricter case.
  const ASTRA: VehicleContext = { make: "VAUXHALL", model: "Astra", year: 2014 };

  it("finds the exemplars", () => {
    expect(mayasLines().length).toBeGreaterThanOrEqual(12);
  });

  it("passes every line the prompt teaches her to say", () => {
    const blocked = mayasLines()
      .filter(Boolean)
      .map((text) => ({
        text,
        result: runGuards(text, /Astra/i.test(text) ? ASTRA : {}),
      }))
      .filter(({ result }) => !result.ok)
      .map(({ text, result }) =>
        result.ok ? "" : `[${result.rule}] "${result.matched}" in: ${text}`,
      );

    expect(blocked).toEqual([]);
  });
});
