import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  runGuards,
  sentences,
  firstSentences,
  claimsARecord,
  PRICE_DEFLECTION,
  GENERAL_DEFLECTION,
  type VehicleContext,
} from "@/agent/guards";

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
/** The response time stated bare, while weekends are undecided. */
const UNQUALIFIED = [
  "That's with you within 2 hours.",
  "A person will price it and you'll have the offer within two hours.",
  "Within 2 hours, from a person, not an algorithm.",
  // A changed number is a changed promise.
  "You'll get a firm offer within three hours.",
  // An added qualifier describes a service nobody agreed to provide.
  "A firm offer within two hours on a weekday. If you enquire late in the evening, you will hear from us first thing the next morning.",
  "You'll get a firm offer within two hours during business hours.",
  // Half the promise is not the promise.
  "You'll get a firm offer within two hours.",
];

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
  // The denials are claims too.
  "We haven't bought one of those.",
  "We've bought lots of these.",
  "We've never had a Defender through.",
  "The last one we bought was similar.",
  "We don't get many of those.",
];

/** Response times nobody has published or agreed to keep. */
const SERVICE_TIMES = [
  "You'll hear back same-day, even on a Saturday.",
  "Someone will call you within the hour.",
  "We'll come back to you within 24 hours.",
  "You'll get the offer within 3 working days.",
  "A person will ring you straight away.",
  "We'll be in touch immediately.",
  "You'll have it by the weekend.",
  "First thing Monday, someone will call.",
  "The two hours still applies at weekends.",
  "Enquire on Sunday and you'll still hear within 2 hours.",
  // A disclaimer in one sentence must not excuse a promise in another.
  "I can't say for certain. You'll definitely hear back same-day though.",
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
  "A firm offer within two hours. If you enquire late in the evening, you will hear from us first thing the next morning.",
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

describe("service-time guard", () => {
  it.each(SERVICE_TIMES)("blocks: %s", (text) => {
    const result = runGuards(text, DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("service-time");
  });

  it("allows the two response times that are published", () => {
    // FAQ 1, verbatim. A guard that blocked her own correct answer would
    // be worse than no guard, because it would train us to loosen it.
    const published = [
      "A firm offer within two hours. If you enquire late in the evening, you will hear from us first thing the next morning.",
      "If you enquire late in the evening, you'll hear first thing the next morning.",
      "The offer stands for seven days, provided the mileage hasn't materially increased.",
      "I've noted that you'd prefer to be called at weekends.",
      // The correct answer to the weekend question, which an earlier
      // version of the guard blocked — replacing an honest "I don't know"
      // with a vaguer deflection.
      "I don't know whether the 2 hours holds on a Saturday. A person will confirm that for you.",
      "I can't say whether you'd hear within 2 hours on a Sunday.",
      "I'm not sure the same-day thing applies, so a person will confirm.",
    ];
    for (const text of published) {
      const result = runGuards(text, DEFENDER);
      expect(result.ok, `wrongly blocked: ${text}`).toBe(true);
    }
  });
});

describe("unqualified response time", () => {
  it.each(UNQUALIFIED)("blocks: %s", (text) => {
    const result = runGuards(text, DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("unqualified-promise");
  });

  it("allows it when the qualification travels with it", () => {
    const qualified = [
      // Published, verbatim.
      "A firm offer within two hours. If you enquire late in the evening, you will hear from us first thing the next morning.",
      // The approved spoken form.
      "You'll get a firm offer within two hours, and if you get in touch late in the evening, you'll hear from us first thing the next morning.",
      // Disclaimers are not promises.
      "I don't know whether the 2 hours holds on a Saturday.",
      "I can't say how weekends are handled.",
    ];
    for (const text of qualified) {
      const result = runGuards(text, DEFENDER);
      expect(result.ok, `wrongly blocked: ${text}`).toBe(true);
    }
  });

  it("qualifies the deflection it sends in place of a price", () => {
    // The replacement must not itself break the rule it enforces.
    const result = runGuards("It's worth about £28,000.", DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const spoken = result.replacement.replace(/\{\{OFFER_HOURS\}\}/g, "2");
      expect(runGuards(spoken, DEFENDER).ok).toBe(true);
    }
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

describe("the review log is legible", () => {
  it("records the phrase around the match, not the bare fragment", () => {
    // A row reading `matched "£2"` is accurate and useless. The point of
    // /admin/review is seeing how the model fails.
    const result = runGuards(
      "Honestly, a car like yours is worth about £28,500.",
      DEFENDER,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.matched).toContain("28,500");
      expect(result.matched.length).toBeGreaterThan(10);
      // Still a fragment, not the whole turn.
      expect(result.matched.length).toBeLessThanOrEqual(
        "Honestly, a car like yours is worth about £28,500.".length + 2,
      );
    }
  });
});

describe("sentence splitting for speech", () => {
  it("splits a turn into speakable sentences", () => {
    expect(
      sentences(
        "Put yes, and don't worry about the amount. We buy cars with finance still outstanding. Tell me the figure and I'll note it.",
      ),
    ).toEqual([
      "Put yes, and don't worry about the amount.",
      "We buy cars with finance still outstanding.",
      "Tell me the figure and I'll note it.",
    ]);
  });

  it("does not break on an abbreviation or a decimal", () => {
    // A false split is an audible stumble in speech.
    expect(sentences("The 2.0 engine is the one people mean.")).toHaveLength(1);
    expect(sentences("Mr. Patel is the registered keeper.")).toHaveLength(1);
  });

  it("keeps a single sentence whole", () => {
    expect(sentences("No cut-off, we buy any car.")).toEqual([
      "No cut-off, we buy any car.",
    ]);
  });

  it("reassembles to the original words", () => {
    const turn =
      "I can't give you a number. A person prices it once your details are in. Is there anything I can help you finish?";
    expect(sentences(turn).join(" ")).toBe(turn);
  });
});

describe("the prompt forbids narrating the machinery", () => {
  it("says so explicitly", () => {
    // A live turn opened with "I'll check the form state first so I
    // record this properly. The record says leadExists is false" — spoken
    // aloud, to a seller.
    const prompt = readFileSync(join(process.cwd(), "agent/prompt.md"), "utf8");
    expect(prompt).toMatch(/never describe the machinery/i);
    expect(prompt).toMatch(/never report what a lookup returned/i);
  });
});

describe("figures that are not prices", () => {
  /**
   * Both of these were blocked in a live text conversation, once real
   * vehicle context existed for the first time. Neither is a price.
   */
  it("allows the engine size read off the record, however it is written", () => {
    // Context holds 2996; she wrote "2,996cc". Comparing the rendered
    // string blocked her for correctly reading her own context.
    const result = runGuards(
      "The record shows it as diesel, a 2,996cc 2021 car in Santorini Black, not petrol.",
      { ...DEFENDER, engineCapacity: 2996 },
    );
    expect(result.ok, result.ok ? "" : `blocked on ${result.matched}`).toBe(true);
  });

  it("allows a mileage repeated back to the seller", () => {
    const result = runGuards(
      "The mileage didn't save. You said about twelve thousand, so put the figure from the dashboard in.",
      DEFENDER,
    );
    expect(result.ok, result.ok ? "" : `blocked on ${result.matched}`).toBe(true);
  });

  it("allows a six-figure mileage", () => {
    expect(runGuards("It has 124,000 miles on it.", DEFENDER).ok).toBe(true);
  });

  it("still blocks a price in a sentence that also mentions mileage", () => {
    // Currency beats the mileage exemption.
    const result = runGuards(
      "At 40,000 miles it's worth about £28,000.",
      DEFENDER,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("price");
  });

  it("still blocks spelled-out money when the sentence is about money", () => {
    const result = runGuards("It's worth about twenty eight thousand.", DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("price");
  });
});

describe("every published form of the promise is accepted", () => {
  it("accepts the FAQ answer verbatim", () => {
    // config/faq.ts:21. A guard that blocks the site is wrong about the
    // site, not the other way round.
    const faq =
      "Within two hours of your enquiry, from a person, not an algorithm. If you enquire late in the evening, you will hear from us first thing the next morning.";
    const result = runGuards(faq, DEFENDER);
    expect(result.ok, result.ok ? "" : `blocked on ${result.matched}`).toBe(true);
  });

  it("still rejects a form that is close but not published", () => {
    const nearly =
      "Within two hours of your enquiry, from a person. If you enquire in the evening you'll hear tomorrow.";
    expect(runGuards(nearly, DEFENDER).ok).toBe(false);
  });
});

describe("a blend of the approved forms", () => {
  it("accepts the heading joined to the spoken clause", () => {
    // Produced live. Both halves, nothing added, no number changed.
    const blend =
      "A firm offer within two hours, and if you get in touch late in the evening, you'll hear from us first thing the next morning.";
    const result = runGuards(blend, DEFENDER);
    expect(result.ok, result.ok ? "" : `blocked on ${result.matched}`).toBe(true);
  });

  it("still blocks half the promise", () => {
    expect(runGuards("A firm offer within two hours.", DEFENDER).ok).toBe(false);
  });

  it("still blocks an added qualifier inside a blend", () => {
    const bad =
      "A firm offer within two hours on a weekday, and if you get in touch late in the evening, you'll hear from us first thing the next morning.";
    const result = runGuards(bad, DEFENDER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("unqualified-promise");
  });

  it("still blocks a changed number inside a blend", () => {
    const bad =
      "A firm offer within four hours, and if you get in touch late in the evening, you'll hear from us first thing the next morning.";
    expect(runGuards(bad, DEFENDER).ok).toBe(false);
  });
});

describe("claims of having recorded something", () => {
  it("spots the past tense", () => {
    for (const text of [
      "I've put that on the record for the person who calls you.",
      "I have noted your reason for selling.",
      "I've written that down.",
      "That's noted for the person pricing it.",
      "I've added it to your enquiry.",
    ]) {
      expect(claimsARecord(text), `missed: ${text}`).not.toBeNull();
    }
  });

  it("ignores an intention, because the writer runs after the reply", () => {
    for (const text of [
      "I'll put that figure down with who gave it.",
      "I can note that for you if you'd like.",
      "The person pricing it will see it.",
      "What helps most is the service history.",
    ]) {
      expect(claimsARecord(text), `wrongly matched: ${text}`).toBeNull();
    }
  });
});

describe("correcting herself unasked", () => {
  it("blocks the false self-correction from the live run", () => {
    // Appended, unprompted, to an answer about MOT history — and wrong:
    // she had checked the record.
    const text =
      "My last answer was also worded as if I had checked the record when I had not. The details I gave, diesel and 2996cc, are what the record says.";
    const result = runGuards(text, DEFENDER, { sellerMessage: "What was that tyre advisory about?" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rule).toBe("self-correction");
  });

  it("blocks other unprompted revisions", () => {
    for (const text of [
      "Earlier I said the MOT expired in June, but that was wrong.",
      "I was wrong to say the service history was full.",
      "Correction: the engine is 2996cc.",
    ]) {
      const result = runGuards(text, DEFENDER, { sellerMessage: "What's next on the form?" });
      expect(result.ok, `allowed: ${text}`).toBe(false);
    }
  });

  it("allows a correction the seller asked for", () => {
    const result = runGuards(
      "You're right, I was wrong to say that. The record shows diesel.",
      DEFENDER,
      { sellerMessage: "You said petrol earlier, that's not what the logbook says." },
    );
    expect(result.ok, result.ok ? "" : `blocked on ${result.matched}`).toBe(true);
  });

  it("does not mistake a failed save for a self-correction", () => {
    const result = runGuards(
      "That didn't save. Could you type the mileage into the form yourself?",
      DEFENDER,
      { sellerMessage: "It's done 46,980." },
    );
    expect(result.ok, result.ok ? "" : `blocked on ${result.matched}`).toBe(true);
  });
});

describe("narrating the machinery", () => {
  /**
   * prompt.md has forbidden this since Session 5 and she did it anyway,
   * on production, to the person who wrote the rule: "the form shows
   * nothing filled in yet". A seller who hears that learns that
   * something is watching the fields and has nothing useful to say
   * about them.
   */
  const BLOCKED = [
    "The form shows nothing filled in yet, so let's start at the top.",
    "Nothing is filled in yet.",
    "According to the form, you still need the mileage.",
    "I can see your form and the mileage is empty.",
    "Your form says the service history is missing.",
    "The form state has no mileage.",
  ];

  for (const text of BLOCKED) {
    it(`blocks ${JSON.stringify(text.slice(0, 40))}`, () => {
      const verdict = runGuards(text);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.rule).toBe("machinery");
    });
  }

  /**
   * Narrow on purpose. Helping with one field by name is the job, and a
   * rule that swallowed that would have taken the useful half with the
   * useless half.
   */
  const ALLOWED = [
    "The mileage is the one it still needs — the number on the dash will do.",
    "Put the mileage in next. A rough figure off the dash is fine.",
    "Service history means any stamps or invoices you have.",
    "I couldn't get that saved, could you type it in?",
    "Photographs and your service history are what help them most.",
  ];

  for (const text of ALLOWED) {
    it(`allows ${JSON.stringify(text.slice(0, 40))}`, () => {
      expect(runGuards(text).ok).toBe(true);
    });
  }

  it("does not block its own deflections", () => {
    // A replacement that trips a guard would be a turn with no way out.
    for (const deflection of [GENERAL_DEFLECTION, PRICE_DEFLECTION]) {
      expect(runGuards(deflection).ok, deflection).toBe(true);
    }
  });
});

describe("the text sentence cap", () => {
  it("slices the original rather than rejoining the parts", () => {
    // Rejoining trimmed parts lost the spacing at the boundaries once —
    // "within2 hours" reached a seller that way.
    const text =
      "A person prices your car once your details are in. " +
      "I can't put a number on it myself. " +
      "Photographs help them most. " +
      "Service history matters too.";
    const capped = firstSentences(text, 3);
    expect(capped).toBe(
      "A person prices your car once your details are in. " +
        "I can't put a number on it myself. " +
        "Photographs help them most.",
    );
    expect(text.startsWith(capped)).toBe(true);
  });

  it("leaves a shorter turn exactly as it was", () => {
    const text = "Put the mileage in next. A rough figure is fine.";
    expect(firstSentences(text, 3)).toBe(text);
  });

  it("does not cut an abbreviation in half", () => {
    const text = "It is a 2.0 litre, approx. 12,000 miles, one owner.";
    expect(firstSentences(text, 3)).toBe(text);
  });
});
