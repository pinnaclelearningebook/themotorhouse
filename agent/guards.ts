/**
 * Output guards for the virtual employee.
 *
 * CLAUDE.md section 10: "Hard rules are coded, not prompted." The prompt
 * tells the model what it may say; this decides what the seller actually
 * receives. Every assistant turn passes through here server-side before
 * it is sent, and a blocked turn is stored with its original text for
 * review (ARCHITECTURE.md section 6).
 *
 * The prompt is not a security control and this file is. If the two ever
 * disagree, this wins.
 *
 * On false positives versus false negatives: a missed price is a number a
 * seller may act on and we did not stand behind, which is the failure this
 * whole project is positioned against. A false positive costs one awkward
 * reply. So the patterns lean towards blocking — but not carelessly,
 * because a deflection fired at an unrelated sentence reads as evasive and
 * is its own kind of damage. Hence the second test fixture: a list of
 * legitimate turns that must pass untouched.
 */

/** Used verbatim when a price slips through. Matches agent/prompt.md. */
export const PRICE_DEFLECTION =
  "I'm not the one who sets the number, and I'd rather not guess at it. " +
  "A person prices your car once your details are in, and that's with you " +
  "within {{OFFER_HOURS}} hours. Is there anything I can help you finish?";

/** Used when a turn is blocked for anything other than a price. */
export const GENERAL_DEFLECTION =
  "I'd rather not answer that from guesswork. A person will confirm it " +
  "when they call. Is there anything on the form I can help with?";

export type GuardRule =
  | "price"
  | "service-time"
  | "frequency"
  | "urgency"
  | "internal"
  | "contact-details"
  | "unsupported-car-fact";

export interface GuardPass {
  ok: true;
  text: string;
}

export interface GuardBlock {
  ok: false;
  rule: GuardRule;
  /** The fragment that tripped it, for the review log. */
  matched: string;
  /** What the seller receives instead. */
  replacement: string;
  /** The turn as the model wrote it. Stored, never sent. */
  original: string;
}

export type GuardResult = GuardPass | GuardBlock;

export interface VehicleContext {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  colour?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  engineCapacity?: number | null;
  mileage?: number | null;
}

/* ─── price ──────────────────────────────────────────────────────────── */

/**
 * Anything that looks like money. The year guard matters: "a 2014 car" and
 * "since 2019" are not prices, and a naive \d{4} would block both.
 */
const YEAR = /^(19|20)\d{2}$/;

const MONEY_WORD =
  /\b(worth|valuation|valued?|price[sd]?|pricing|pay(?:ing)? you|offer(?:ing)? you|fetch|get you|give you|expect|bracket|figure)\b/i;

const PRICE_PATTERNS: RegExp[] = [
  // Explicit currency.
  /£\s?\d/,
  /\b\d[\d,]*\s?(?:k\b|grand\b|quid\b|pounds?\b|gbp\b)/i,
  // Spelled-out money.
  /\b(?:ten|eleven|twelve|fifteen|eighteen|twenty|twenty[- ]five|thirty|thirty[- ]five|forty|fifty|sixty|seventy|eighty|ninety|hundred)\s+(?:thousand|grand|k)\b/i,
  // Vague bands, which are prices with deniability.
  /\b(?:mid|high|low)[- ](?:teens|twenties|thirties|forties|fifties)\b/i,
  /\bin the (?:teens|twenties|thirties|forties|fifties)\b/i,
  /\b(?:north|south) of (?:£\s?)?\d/i,
  /\b(?:ballpark|circa|in the region of|thereabouts)\b/i,
];

function looksLikeMoneyNumber(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 0) return false;
  if (YEAR.test(digits)) return false;
  // Mileage and prices overlap numerically, so the money word nearby is
  // what distinguishes them; this only asks whether the magnitude could
  // be a car price at all.
  return Number(digits) >= 1000;
}

function detectPrice(text: string): string | null {
  for (const pattern of PRICE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return withContext(text, match[0], match.index);
  }

  // A bare number near a money word: "it'd get you 24000", "the figure is
  // 24,000". Sentence-scoped so an unrelated number elsewhere is ignored.
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    if (!MONEY_WORD.test(sentence)) continue;
    for (const candidate of sentence.match(/\d[\d,]*/g) ?? []) {
      if (looksLikeMoneyNumber(candidate)) {
        return withContext(text, candidate, text.indexOf(candidate));
      }
    }
  }
  return null;
}

/* ─── frequency, volume, track record ────────────────────────────────── */

/**
 * No car has been bought yet, so any claim about how often we do something
 * is invented. Policy is always sayable; history is not.
 */
const FREQUENCY_PATTERNS: RegExp[] = [
  /\bmost weeks\b/i,
  /\bevery (?:day|week|month)\b/i,
  /\ball the time\b/i,
  /\bwe (?:often|regularly|routinely|usually|frequently|commonly|always)\b/i,
  /\bwe'(?:ve|re) (?:bought|seen|had|been (?:buying|trading|doing))\b/i,
  /\bwe have (?:bought|seen|had|been (?:buying|trading))\b/i,
  /\b(?:hundreds|thousands|dozens|plenty) of (?:cars|them|these|vehicles)\b/i,
  /\bin our experience\b/i,
  /\bwe see (?:a lot|lots|plenty|many|loads)\b/i,
  /\b(?:a lot|lots|plenty) of these\b/i,
  /\byears of (?:experience|trading|buying)\b/i,
  /\bordinary thing for us\b/i,
  /\bday in,? day out\b/i,
  /\bmost of the cars we\b/i,
];

/* ─── service times we have not published ────────────────────────────── */

/**
 * Only two response times are published: a firm offer within the hours
 * named in config/site.ts, and "first thing the next morning" for an
 * enquiry late in the evening (FAQ 1, verbatim). Anything else is a
 * promise nobody has agreed to keep.
 *
 * Weekends matter most here. PENDING-INFO asks whether the two-hour
 * promise is realistic seven days a week and that is still open, so a
 * confident answer about Saturday is exactly the invention this guard
 * exists to stop. Breaking the response promise once undermines the
 * whole positioning, which is the one thing the site is built on.
 */
/**
 * Words that turn a service-time sentence into a disclaimer.
 *
 * "I don't know whether the 2 hours holds on a Saturday" is the correct
 * answer to the weekend question and was being blocked by the pattern
 * below, which replaced an honest "I don't know" with a vaguer
 * deflection. A guard that punishes the right answer teaches us to
 * loosen it, so uncertainty is checked before a claim is called a claim.
 */
const NOT_A_CLAIM =
  /\b(?:don'?t know|do not know|can'?t say|cannot say|couldn'?t say|not sure|unsure|no idea|won'?t guess|not able to say|can'?t promise|cannot promise|wouldn'?t want to guess|rather not (?:say|guess)|a person will confirm|someone will confirm)\b/i;

const SERVICE_TIME_PATTERNS: RegExp[] = [
  /\bsame[- ]day\b/i,
  /\bwithin (?:the hour|an hour|one hour|minutes|a few minutes|24 hours|48 hours|a day)\b/i,
  /\bwithin \d+ (?:working |business )?days?\b/i,
  /\bovernight\b/i,
  /\b(?:straight|right) away\b/i,
  /\bimmediately\b/i,
  /\bby (?:tomorrow|tonight|the weekend|end of (?:the )?(?:day|week))\b/i,
  /\bfirst thing (?:on )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)\b/i,
  // Weekend service claims, in either order. A seller's preferred
  // contact window ("you said weekends") is not a claim and does not
  // match, because none of the service words below appear with it.
  /\b(?:saturdays?|sundays?|weekends?)\b[^.]{0,70}\b(?:two hours|2 hours|same|still hear|still get|offer (?:will|would|comes)|we(?:'ll| will) (?:call|ring|price))\b/i,
  /\b(?:two hours|2 hours)\b[^.]{0,50}\b(?:saturdays?|sundays?|weekends?)\b/i,
];

/**
 * A service-time claim, sentence by sentence.
 *
 * Scoped to the sentence so a disclaimer in one clause does not excuse a
 * promise in another, and so a promise elsewhere in the turn is still
 * caught.
 */
function detectServiceTime(text: string): string | null {
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    if (NOT_A_CLAIM.test(sentence)) continue;
    for (const pattern of SERVICE_TIME_PATTERNS) {
      const match = pattern.exec(sentence);
      if (match) {
        return withContext(text, match[0], text.indexOf(match[0]));
      }
    }
  }
  return null;
}

/* ─── pressure, urgency, flattery ────────────────────────────────────── */

const URGENCY_PATTERNS: RegExp[] = [
  /\b(?:selling|going) fast\b/i,
  /\bwon'?t last\b/i,
  /\bact (?:now|fast|quickly)\b/i,
  /\b(?:hurry|don'?t (?:wait|miss|delay))\b/i,
  /\bbefore (?:you go|it'?s too late|prices)\b/i,
  /\bvalues? (?:are )?(?:dropping|falling|about to)\b/i,
  /\bonly \d+ (?:left|slots?|spaces?)\b/i,
  /\blimited time\b/i,
  /\bright now (?:is|would be) (?:a |the )?(?:great|good|best|perfect)\b/i,
  // Flattery. Warmth is fine; complimenting the car is a sales move.
  /\b(?:lovely|beautiful|gorgeous|stunning|cracking|smashing) (?:car|motor|thing|example)\b/i,
  /\byou'?ve (?:clearly )?looked after (?:it|her|him)\b/i,
];

/* ─── internal routing ───────────────────────────────────────────────── */

/**
 * The seller is never told which route their car took, or that routes
 * exist for their car (CLAUDE.md section 11). The /export page explains
 * the business in general and is public; applying it to this car is not.
 */
const INTERNAL_PATTERNS: RegExp[] = [
  /\bexport[- ]eligible\b/i,
  /\beligible for export\b/i,
  /\byour car (?:is|would be|qualifies)[^.]{0,30}\bexport\b/i,
  /\b(?:we'?d|we will|we'?ll) (?:be )?(?:export|ship)(?:ing)? (?:it|your|this)\b/i,
  /\bdomestic channel\b/i,
  /\brecommended channel\b/i,
  /\bmax(?:imum)? bid\b/i,
  /\b(?:projected |profit )?margin\b/i,
  /\byour (?:score|rating)\b/i,
  /\bscored? \d+\b/i,
  /\blanded cost\b/i,
];

/* ─── contact and company details ────────────────────────────────────── */

/**
 * None of these are published yet (config/site.ts holds AWAITING_RESPONSE
 * markers), so any concrete one the model produces is invented.
 */
const CONTACT_PATTERNS: RegExp[] = [
  // UK phone numbers, spaced or not.
  /\b0\d(?:[\d\s]){8,12}\b/,
  // No leading \b: '+' is not a word character, so there is no boundary
  // before it and the anchored version silently matched nothing.
  /\+44[\d\s]{9,14}/,
  /\bcompany (?:number|registration number)\b[^.]{0,20}\d/i,
  /\bregistered (?:office|address)\b[^.]{0,30}\d/i,
  /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/,
  // UK postcodes, which would only come from inventing an address.
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/,
];

/* ─── car facts not in the lookup ────────────────────────────────────── */

/** Makes common enough in the UK that naming one is an assertion. */
const MAKES = [
  "abarth", "alfa romeo", "aston martin", "audi", "bentley", "bmw", "byd",
  "chevrolet", "chrysler", "citroen", "cupra", "dacia", "ds", "fiat",
  "ford", "genesis", "honda", "hyundai", "infiniti", "isuzu", "jaguar",
  "jeep", "kia", "lamborghini", "land rover", "lexus", "lotus", "maserati",
  "mazda", "mclaren", "mercedes", "mercedes-benz", "mg", "mini",
  "mitsubishi", "nissan", "peugeot", "polestar", "porsche", "renault",
  "rolls-royce", "seat", "skoda", "smart", "ssangyong", "subaru", "suzuki",
  "tesla", "toyota", "vauxhall", "volkswagen", "volvo",
];

/** Spec assertions: a figure with a unit only a data sheet would carry. */
const SPEC_UNIT =
  /\b\d[\d.,]*\s?(?:bhp|hp|ps|kw|nm|lb[- ]ft|litre|liter|cc|mpg|mph|kwh|seconds?|secs?)\b/i;

function contextHas(context: VehicleContext, needle: string): boolean {
  const haystack = [
    context.make,
    context.model,
    context.colour,
    context.fuel,
    context.transmission,
    context.year?.toString(),
    context.engineCapacity?.toString(),
    context.mileage?.toString(),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle.toLowerCase());
}

function detectUnsupportedCarFact(
  text: string,
  context: VehicleContext,
): string | null {
  const lower = text.toLowerCase();

  for (const make of MAKES) {
    // Word-bounded so "mg" does not match inside "imagine".
    const pattern = new RegExp(`\\b${make.replace(/[-]/g, "[- ]")}\\b`, "i");
    if (!pattern.test(lower)) continue;
    if (!contextHas(context, make)) return make;
  }

  const spec = SPEC_UNIT.exec(text);
  if (spec) {
    const figure = (spec[0].match(/\d[\d.,]*/) ?? [""])[0];
    if (!figure || !contextHas(context, figure.replace(/[.,]$/, ""))) {
      return spec[0];
    }
  }

  return null;
}

/* ─── the guard ──────────────────────────────────────────────────────── */

/**
 * The matched fragment plus enough of its sentence to be legible.
 *
 * A review row reading `matched "£2"` is technically accurate and tells
 * an operator nothing. The point of that page is seeing how the model
 * fails, so the log keeps the phrase around the hit.
 */
function withContext(text: string, match: string, index: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + match.length + 30);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${
    end < text.length ? "…" : ""
  }`;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return withContext(text, match[0], match.index);
  }
  return null;
}

/**
 * Run every guard over one assistant turn.
 *
 * Order is deliberate: price first, because it is the rule whose breach
 * does the most damage and the one most worth naming accurately in the
 * review log.
 */
export function runGuards(
  text: string,
  context: VehicleContext = {},
): GuardResult {
  const price = detectPrice(text);
  if (price) {
    return {
      ok: false,
      rule: "price",
      matched: price,
      replacement: PRICE_DEFLECTION,
      original: text,
    };
  }

  const checks: [GuardRule, string | null][] = [
    ["service-time", detectServiceTime(text)],
    ["frequency", firstMatch(text, FREQUENCY_PATTERNS)],
    ["urgency", firstMatch(text, URGENCY_PATTERNS)],
    ["internal", firstMatch(text, INTERNAL_PATTERNS)],
    ["contact-details", firstMatch(text, CONTACT_PATTERNS)],
    ["unsupported-car-fact", detectUnsupportedCarFact(text, context)],
  ];

  for (const [rule, matched] of checks) {
    if (matched) {
      return {
        ok: false,
        rule,
        matched,
        replacement: GENERAL_DEFLECTION,
        original: text,
      };
    }
  }

  return { ok: true, text };
}

/* ─── voice ──────────────────────────────────────────────────────────── */

/**
 * Split a guarded turn into sentences for speech.
 *
 * Voice emits sentence by sentence so speech can begin before the whole
 * turn has been read out, and the rule agreed for Session 6 is that
 * nothing is spoken before its sentence is complete. Splitting here, after
 * runGuards has passed the whole turn, means every sentence that reaches
 * text-to-speech has already been through every guard — a stricter
 * position than guarding each sentence as it streams, because a price
 * split across two sentences cannot slip between them.
 *
 * Abbreviations are the usual trap. A naive split on ". " turns "No. 3"
 * and "e.g." into sentence ends, which in speech becomes an audible
 * stumble, so the lookbehind requires a lower-case or digit character
 * before the stop and a capital or digit after it.
 */
const ABBREVIATIONS =
  /\b(?:mr|mrs|ms|dr|prof|st|rd|ave|no|vs|etc|approx|dept|est|fig|incl|max|min|e\.g|i\.e)\.$/i;

export function sentences(text: string): string[] {
  const parts = text
    .split(/(?<=[a-z0-9)"'\]][.!?])\s+(?=[A-Z0-9"'(])/g)
    .map((part) => part.trim())
    .filter(Boolean);

  // Re-join anything split on a title or abbreviation rather than a real
  // sentence end. "Mr. Patel" is one sentence; splitting it is an audible
  // stumble.
  const joined: string[] = [];
  for (const part of parts) {
    const previous = joined[joined.length - 1];
    if (previous && ABBREVIATIONS.test(previous)) {
      joined[joined.length - 1] = `${previous} ${part}`;
    } else {
      joined.push(part);
    }
  }
  return joined;
}
