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
/**
 * The response time, qualified, in the one wording everything uses.
 *
 * Both sentences are published word for word: the first is the heading on
 * /how-it-works and in three section components, the second is the second
 * sentence of FAQ 1. Nothing else is added.
 *
 * An earlier version said "within two hours on a weekday". The word
 * weekday appears nowhere on the site. It was a reasonable-sounding
 * hedge for the open weekend question in PENDING-INFO, and inventing a
 * restriction is the same offence as inventing a promise — it describes a
 * service nobody has agreed to provide. Weekends are now handled by Maya
 * saying she does not know, which is a statement about her, not about us.
 *
 * RESPONSE_TIME is the single place the wording lives, so the prompt, the
 * deflection and the knowledge base cannot drift apart.
 */
export const RESPONSE_TIME =
  "a firm offer within two hours. If you enquire late in the evening, you " +
  "will hear from us first thing the next morning";

/**
 * The spoken form, approved for voice.
 *
 * The published sentences read as a notice when said aloud. This says the
 * same two things in the same order with no addition: the offer, the two
 * hours, and the evening clause. Nothing is qualified, softened or
 * re-timed.
 */
export const RESPONSE_TIME_SPOKEN =
  "You'll get a firm offer within two hours, and if you get in touch late " +
  "in the evening, you'll hear from us first thing the next morning.";

/** Normalised for comparison: case, punctuation and spacing do not count. */
function flatten(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Every form the site already uses, plus the one approved for speech.
 *
 * The FAQ answer and the /how-it-works heading word the same promise
 * differently, and both are published. A guard that accepted only one of
 * them would block Maya for quoting the site — which it did, on the FAQ
 * answer, the first time this ran.
 */
const ACCEPTED_RESPONSE_TIME = [
  RESPONSE_TIME,
  RESPONSE_TIME_SPOKEN,
  // config/faq.ts, the answer to "How quickly will I get my offer?"
  "within two hours of your enquiry, from a person, not an algorithm. If " +
    "you enquire late in the evening, you will hear from us first thing " +
    "the next morning",
].map(flatten);

/** Qualifiers the site does not use, and so neither may she. */
const FORBIDDEN_QUALIFIER =
  /\b(?:weekday|weekdays|working day|working days|business day|business days|business hours|office hours|mon(?:day)?[-\s]*(?:to|–|-)[-\s]*fri(?:day)?)\b/i;

/** Does this turn mention the response-time promise at all? */
/**
 * The first `limit` sentences, sliced out of the original.
 *
 * Sliced rather than rejoined from the split parts: `sentences()` trims
 * each one, and rejoining them lost the spacing at the boundaries —
 * "within2 hours" reached a seller that way once. The same technique the
 * voice path uses to walk its buffer.
 */
export function firstSentences(text: string, limit: number): string {
  const parts = sentences(text);
  if (parts.length <= limit) return text;

  let consumed = 0;
  for (const part of parts.slice(0, limit)) {
    const at = text.indexOf(part, consumed);
    if (at === -1) return text;
    consumed = at + part.length;
  }
  return text.slice(0, consumed);
}

/**
 * Cut the turn at the first thing shaped like a tool call.
 *
 * In speech she has no tools, and the system prompt still describes
 * them, so she reached for one by writing the syntax out in prose. A
 * production voice turn ended with `<invoke name="set_field">` and
 * `<parameter name="field">reason_for_sale</parameter>`, which went to
 * the speech synthesiser and would have been read aloud to a seller.
 *
 * Truncation rather than a block: the sentences before it were good, and
 * what follows is markup she invented. A partial tag at the end of a
 * delta simply does not match yet, so it stays unreleased until it
 * either completes and is cut, or turns out to be ordinary prose.
 */
const TOOL_SYNTAX =
  /<\/?\s*(?:antml:)?(?:invoke|parameter|function_calls?|function_results?|tool_use|tool_call)\b/i;

export function stripToolSyntax(text: string): {
  text: string;
  matched: string | null;
} {
  const found = TOOL_SYNTAX.exec(text);
  if (!found) return { text, matched: null };
  return {
    text: text.slice(0, found.index).trimEnd(),
    matched: text.slice(found.index, found.index + 120),
  };
}

export function mentionsResponseTime(text: string): boolean {
  return /\b\d+\s*hours?\b|\b(?:one|two|three|four|five|six|twelve|24)\s*hours?\b/i.test(
    text,
  );
}

export const PRICE_DEFLECTION =
  "A person prices your car once your details are in. I can't put a " +
  "number on it myself, but photographs and your service history are what " +
  "help them most.";

/** Used when a turn is blocked for anything other than a price. */
export const GENERAL_DEFLECTION =
  "I'd rather not answer that from guesswork. A person will confirm it " +
  "when they call. Is there anything on the form I can help with?";

export type GuardRule =
  | "price"
  | "service-time"
  | "unqualified-promise"
  | "frequency"
  | "urgency"
  | "internal"
  | "contact-details"
  | "unsupported-car-fact"
  | "self-correction"
  | "machinery";

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
  // Spelled-out money, including compounds. "Twenty eight thousand" has a
  // unit word between the ten and the thousand, which an adjacent-only
  // pattern misses — and spoken numbers are nearly always said that way.
  /\b(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:[-\s]+(?:one|two|three|four|five|six|seven|eight|nine|hundred))*[-\s]+(?:grand|k)\b/i,
  // A bare "thirty grand" with nothing before it.
  /\b(?:one|two|three|four|five|six|seven|eight|nine)?[-\s]*(?:thousand|grand)\b(?=[^.]*$)/i,
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

/**
 * A comma-grouped figure with no unit attached.
 *
 * "around 28,500" is a price whatever words surround it, and requiring a
 * money word nearby missed it. Mileage is the one honest collision, so a
 * figure followed by a distance unit is left alone — "18,400 miles" is
 * not an offer.
 */
const GROUPED_NUMBER = /\b\d{1,3}(?:,\d{3})+\b(?!\s*(?:miles|mile|mi\b|km|kilometres))/gi;

function detectGroupedFigure(text: string): { match: string; index: number } | null {
  for (const found of text.matchAll(GROUPED_NUMBER)) {
    if (looksLikeMoneyNumber(found[0])) {
      return { match: found[0], index: found.index };
    }
  }
  return null;
}

/**
 * Words that make a figure a distance rather than an amount.
 *
 * "You said about twelve thousand, so put the figure from the dashboard
 * in" was blocked as a price. She was repeating the seller's mileage
 * back to them. Currency markers still win: "£28,000 with 40,000 miles"
 * is a price whatever else is in the sentence.
 */
const MILEAGE_CONTEXT =
  /\b(?:mileage|miles|mile|odometer|dashboard|clocked|on the clock|km)\b/i;
const CURRENCY_MARKER = /£|\bgbp\b|\bpounds?\b|\bgrand\b|\bquid\b/i;

function detectPrice(text: string): string | null {
  // Currency beats everything; otherwise a mileage sentence is exempt
  // from the heuristics that infer money from a bare number.
  const aboutDistance =
    MILEAGE_CONTEXT.test(text) && !CURRENCY_MARKER.test(text);

  for (const pattern of PRICE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return withContext(text, match[0], match.index);
  }

  if (aboutDistance) return null;

  /**
   * Spelled-out thousands, but only where the sentence is about money.
   *
   * "Twelve thousand" is a mileage as often as an amount. "Grand" and
   * "quid" carry their own meaning and are matched unconditionally above;
   * "thousand" does not, so it needs a money word to count.
   */
  const SPELLED_THOUSAND =
    /\b(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:[-\s]+(?:one|two|three|four|five|six|seven|eight|nine|hundred))*[-\s]+thousand\b/i;
  const spelled = SPELLED_THOUSAND.exec(text);
  if (spelled && MONEY_WORD.test(text)) {
    return withContext(text, spelled[0], spelled.index);
  }

  const grouped = detectGroupedFigure(text);
  if (grouped) return withContext(text, grouped.match, grouped.index);

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
  // The denials. "We haven't bought one of those" is as much a claim
  // about our history as "we've bought hundreds", and it invites the
  // next question.
  /\bwe (?:haven'?t|have not|never) (?:bought|had|seen|taken)\b/i,
  /\bwe'?ve never (?:bought|had|seen|taken)\b/i,
  /\bthe last one we (?:bought|had|took)\b/i,
  /\bwe don'?t (?:get|see) many\b/i,
  /\bnone (?:have|has) come through\b/i,
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

/**
 * The response time stated without its qualification.
 *
 * Weekends are undecided, so "you'll hear within two hours" on its own is
 * a promise we might not keep — and breaking that one undermines the
 * positioning the whole site rests on. Any mention has to carry the
 * weekday, evening or weekend wording with it.
 */
const RESPONSE_TIME_MENTION = /\b(?:two|2)\s*hours?\b/i;

/** Saying she does not know is a disclaimer, not a promise. */
const DISCLAIMING =
  /\b(?:don'?t know|do not know|can'?t say|cannot say|won'?t promise|not sure|a person will confirm)\b/i;

/**
 * The response time, stated in any form but the two approved ones.
 *
 * Two are allowed: the published sentences verbatim, and the spoken form
 * agreed for voice. Both say the same thing. Anything else — a different
 * number, an added "on a weekday", a shortened version that drops the
 * evening clause — is a promise that differs from the one on the site,
 * and the whole positioning rests on that promise being kept.
 */
function detectUnqualifiedPromise(text: string): string | null {
  const forbidden = FORBIDDEN_QUALIFIER.exec(text);
  if (forbidden) return withContext(text, forbidden[0], forbidden.index);

  const mention = RESPONSE_TIME_MENTION.exec(text);
  if (!mention) {
    // A different number of hours attached to the offer is a changed
    // promise, not an absent one.
    const altered = /\b(?:one|three|four|five|six|twelve|24|\d+)\s*hours?\b/i.exec(text);
    if (altered && /\boffer\b/i.test(text)) {
      return withContext(text, altered[0], altered.index);
    }
    return null;
  }

  const flat = flatten(text);
  if (ACCEPTED_RESPONSE_TIME.some((form) => flat.includes(form))) return null;
  if (DISCLAIMING.test(text)) return null;

  /**
   * A blend of the approved forms is still the approved promise.
   *
   * She produced "A firm offer within two hours, and if you get in touch
   * late in the evening, you'll hear from us first thing the next
   * morning" — the heading's first half joined to the spoken form's
   * second. It adds nothing, changes no number and drops no clause, and
   * blocking it would mean blocking the right answer for its punctuation.
   *
   * What must survive is the test that actually matters: both halves
   * present, nothing added. The forbidden qualifiers and changed numbers
   * are checked above and are unaffected.
   */
  const bothHalves =
    /\bfirm offer\b/.test(flat) &&
    /\blate in the evening\b/.test(flat) &&
    /\bfirst thing the next morning\b/.test(flat);
  if (bothHalves) return null;

  return withContext(text, mention[0], mention.index);
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

/* ─── narrating the machinery ─────────────────────────────────────────── */

/**
 * The seller does not know there is a form state to read.
 *
 * prompt.md has said "you never describe the machinery" since Session 5
 * and she said "the form shows nothing filled in yet" anyway, on
 * production, to the person who wrote the rule. A seller who hears that
 * learns two things: that something is watching the fields, and that it
 * has nothing useful to say about them.
 *
 * Narrow on purpose. Helping with one field by name is the job —
 * "the mileage is the one it still needs" is fine. What is blocked is
 * the form offered as a source of information about itself.
 */
const MACHINERY_PATTERNS: RegExp[] = [
  /\b(?:the|your) form (?:shows|says|tells me|has|is showing|currently)\b/i,
  /\baccording to (?:the|your) form\b/i,
  /\bform state\b/i,
  /\bnothing (?:is )?(?:filled|completed|entered)(?: in)?\b/i,
  /\bno(?:ne of the)? fields? (?:are|is|have been) (?:filled|completed)\b/i,
  /\bI (?:can see|see|checked|looked at) (?:the|your) form\b/i,
  /\bwhat (?:the|your) form (?:shows|says|has)\b/i,
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

/** Digits only, so "2,996" and "2996" are the same engine. */
function digitsOf(value: string): string {
  return value.replace(/[^\d]/g, "");
}

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
  if (haystack.includes(needle.toLowerCase())) return true;

  // A figure written "2,996cc" is the same as a stored 2996. Comparing
  // the rendered string blocked Maya for correctly reading the engine
  // size off the record she had been given.
  const digits = digitsOf(needle);
  if (digits.length >= 3 && digitsOf(haystack).includes(digits)) return true;

  return false;
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
  opts: { sellerMessage?: string } = {},
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
    ["unqualified-promise", detectUnqualifiedPromise(text)],
    ["frequency", firstMatch(text, FREQUENCY_PATTERNS)],
    ["urgency", firstMatch(text, URGENCY_PATTERNS)],
    ["internal", firstMatch(text, INTERNAL_PATTERNS)],
    ["contact-details", firstMatch(text, CONTACT_PATTERNS)],
    ["unsupported-car-fact", detectUnsupportedCarFact(text, context)],
    ["self-correction", detectSelfCorrection(text, opts.sellerMessage)],
    ["machinery", firstMatch(text, MACHINERY_PATTERNS)],
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

/* ─── claims of having recorded something ───────────────────────────── */

/**
 * Did she just tell the seller she wrote something down?
 *
 * Voice writes notes in a step that runs beside the reply, so the model
 * does not learn whether the write succeeded before it speaks. It says
 * "I've put that on the record" either way. When nothing was written,
 * that is a promise to a seller that an operator will not find — so the
 * turn is logged for review rather than left to be discovered by someone
 * ringing a lead with a missing figure.
 *
 * Matched narrowly, on the past tense only. "I'll put that down" is an
 * intention, and the writer runs after the reply, so it is not a claim
 * that anything has already happened.
 */
const RECORD_CLAIM =
  /\b(?:i'?ve|i have)\s+(?:now\s+)?(?:noted|recorded|logged|saved|put (?:that|it|this|your|the)[^.]{0,30}?\b(?:down|on the record|on your enquiry)|written (?:that|it|this) down|added (?:that|it|this))\b|\b(?:noted|recorded) (?:that|it) (?:for|on)\b|\bthat'?s (?:noted|recorded|on the record)\b|\bit'?s (?:noted|recorded|on the record)\b/i;

export function claimsARecord(text: string): string | null {
  const match = RECORD_CLAIM.exec(text);
  return match ? withContext(text, match[0], match.index) : null;
}

/* ─── correcting herself, unasked ───────────────────────────────────── */

/**
 * Revisiting her own earlier answer when nobody asked.
 *
 * She appended "My last answer was also worded as if I had checked the
 * record when I had not" to an answer about MOT history. It was both
 * unprompted and untrue — she had checked. Unsolicited self-correction
 * reads as unreliability whether or not the correction is right, and the
 * seller did not ask.
 *
 * Exempt when they did ask: a seller querying an earlier answer is
 * entitled to one.
 */
const SELF_CORRECTION =
  /\b(?:my (?:last|previous|earlier) (?:answer|reply|message)|earlier i said|a moment ago i said|i said (?:that )?[^.]{0,40}\bbut (?:that|it) (?:was|is) (?:wrong|not right)|i was wrong to say|correction(?=[,:])|to correct (?:myself|what i said))\b/i;

const SELLER_ASKED_ABOUT_IT =
  /\b(?:you (?:said|told me|mentioned)|earlier|before|a minute ago|that'?s not what|you were wrong|is that right|are you sure)\b/i;

function detectSelfCorrection(
  text: string,
  sellerMessage: string | undefined,
): string | null {
  if (sellerMessage && SELLER_ASKED_ABOUT_IT.test(sellerMessage)) return null;
  const match = SELF_CORRECTION.exec(text);
  return match ? withContext(text, match[0], match.index) : null;
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
