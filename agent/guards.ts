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
    if (match) return match[0];
  }

  // A bare number near a money word: "it'd get you 24000", "the figure is
  // 24,000". Sentence-scoped so an unrelated number elsewhere is ignored.
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    if (!MONEY_WORD.test(sentence)) continue;
    for (const candidate of sentence.match(/\d[\d,]*/g) ?? []) {
      if (looksLikeMoneyNumber(candidate)) return candidate;
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

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match[0];
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
