# CLAUDE.md — The Motor House

Read in full at the start of every session. ARCHITECTURE.md is the technical companion; read it before any work in Phases B–E. SESSION-PROMPTS.md is the build order. SOURCES.md records every external claim. PENDING-INFO.md is the open-items checklist.

Version 2 — 5 October 2026. Supersedes the v1 milestone list. Everything built under v1 (Milestones 1–4, 62 routes) stays and is the foundation.

---

## 1. What this is

**The Motor House** is a UK car buying service. Sellers submit their car, we come back with a firm offer, we collect and pay. We buy any car.

Behind the site are two channels the seller never needs to understand:

- **Domestic** — most cars. Bought, reconditioned, resold in the UK within two weeks for a small margin. This is the volume and the cash flow.
- **Export** — a minority. Young (under 5 years at landing), high-spec target models (Range Rover, Evoque, Velar, Discovery Sport, Defender, Lexus, Mercedes GLE), preferably VAT-qualifying ex-company stock, shipped to Cyprus where UK right-hand-drive cars are the local standard. Larger margin, slower cycle, one car at a time.

**The site has one job:** turn a car owner into a submitted, enriched lead that reaches a person fast. v2 adds live vehicle data, a guided form, a virtual employee, an enrichment pipeline and an internal decision dashboard — all in service of that one job, not instead of it.

**Audience:** UK car owners, often sceptical of online buyers, frequently burned by an online valuation that fell at inspection. The premium target models matter commercially, but a Golf owner must never feel the site isn't for them.

**Not a marketplace.** We buy as principal. No listings, no buyer accounts, no checkout, no auction.

**Decisions are made by a person.** Every system in v2 scores, enriches and recommends. None of it makes an offer. There is no auto-offer code path anywhere in this repository.

## 2. Stack

- **Next.js (App Router), TypeScript, React Server Components by default.** Client components are leaf-level and marked.
- **Tailwind v4**, theme in `globals.css` via `@theme`. Tailwind's default palette is removed. Every colour comes from section 5. No arbitrary hex in components.
- **Postgres via Supabase** — leads, vehicles, MOT history, photos, scores, conversations, comparables. Replaces Airtable from Phase B. The Airtable adapter stays in `lib/adapters/` unused.
- **Supabase Auth** (magic link, allow-listed emails) for `/admin`.
- **Vercel Blob** for seller photos. Client-direct signed uploads.
- **Resend** for transactional email. **Zod** for all validation, shared client/server.
- **DVLA Vehicle Enquiry Service + DVSA MOT History** for live vehicle data (free, server-side only).
- **Paid adapters behind interfaces**, stubbed until keys exist: provenance (HPI / Experian AutoCheck), valuation (UK Vehicle Data or CheckCarDetails first; CAP HPI later).
- **ElevenLabs Conversational AI** for the virtual employee (Phase D). Agent prompt, knowledge base and tool definitions live in `agent/` so the provider is swappable.
- **Inngest** (or Vercel cron) for background enrichment jobs — decide in Phase C and record the decision in ARCHITECTURE.md.
- **MDX in-repo** for the blog. **Motion + Lenis** for motion (Phase E).
- **Vercel** hosting. Env vars in Vercel, never committed.

Conventions: `app/` routes · `components/ui|sections|forms|admin|agent/` · `lib/` logic · `lib/adapters/` third-party integrations · `agent/` the virtual employee's prompt and tools · `content/` MDX · `config/` typed data. No `any`. No unused exports. No commented-out code.

## 3. Placeholder convention

Never invent business facts. Phone, address, company number, review, statistic, "cars bought this month", a price — if it isn't known, it's a placeholder.

```ts
export const CONTACT = { phone: "AWAITING_RESPONSE: business phone number" }
```
```tsx
<AwaitingInfo label="Company registration number" />
```

`AwaitingInfo` renders a dashed chip in development and nothing in production. All placeholders live in `config/site.ts`. Every placeholder has a matching line in `PENDING-INFO.md`; remove the line when the value lands.

**No fabricated social proof, ever.** No invented testimonials, review counts, or counters. Sections that need proof render from a data array and render nothing while it's empty.

## 4. Seller psychology — the spine

Read before writing any page, any form step, or any line of the virtual employee's prompt.

**What the seller feels.** Three bad options: private sale (strangers, fraud risk, weeks), part-exchange (easy, underpaid), big online buyer (the number drops at inspection). They are looking for a fourth. They are also, increasingly, tired of being handled by a funnel.

**Eight levers:**

1. **Certainty over optimism.** The offer does not change. This is the primary message everywhere. Never "up to". Never hedge it.
2. **Loss framing, gently.** An unsold car costs money every month. Say it once, factually. Never countdowns, scarcity, or "prices drop soon".
3. **Reciprocity.** Free valuation, free collection, a free provenance summary shared with the seller whether or not they sell.
4. **Effort escalation.** One field first — the registration. Everything else comes after the site has shown it knows their car. Never front-load.
5. **The reason why.** Our strong offers on certain models are explained by real export demand. True, specific, survives scrutiny. Home, `/export`, every model page.
6. **Status congruence.** Specialist, not scrappage. Restraint carries it. If a section could sell a £900 Corsa, rebuild it — but a Corsa seller must still feel welcome.
7. **Anticipated regret reversal.** Name the alternatives honestly, including the ones that beat us for some sellers (voluntary termination, private sale on a rare car). Never disparage competitors by name.
8. **Authority through specificity.** One genuinely specialist, verified detail per model beats any badge. Example: the timing-chain issue is the 2.0 four-cylinder Ingenium, not the D300 straight-six — correcting that misconception is stronger than repeating it.

**v2 adds a ninth: recognition.** The moment the site identifies the seller's car from a registration — make, model, year, colour, last MOT mileage — the interaction stops being a form and becomes a conversation about *their* car. Design every step after that moment as if a person who has just looked at the car is speaking.

**Copy rules.** No exclamation marks. No urgency mechanics. Never "free quote" (say "firm offer"). Never "up to". Active voice. Buttons name the outcome. Same words through a flow. Sentence case everywhere except the plate. Short sentences.

## 5. Design system

**Direction: the specialist's file.** Precise, documentary, unhurried. The premium signal is paperwork done properly — V5C, HPI certificate, stamped service book — not gloss.

**Avoid:** orange, blue/purple, turquoise, black-and-red dealer templates, handshake stock photos, glassmorphism, gradient blobs, anything that would sit on a SaaS landing page.

**Colour tokens**

```
--ink        #12140F   dark ground, headlines
--ink-soft   #1F231C   raised surfaces on ink
--paper      #F5F4F0   page ground
--paper-warm #EDEBE4   alternate band
--oxblood    #5C1A1F   primary accent — buttons, links, active
--oxblood-lt #7A2B31   hover
--plate      #F5D000   number plate yellow — the registration input ONLY
--structure  #6B6F6B   secondary text, labels
--line       #DEDBD4   hairlines on paper
--line-dark  #2C302A   hairlines on ink
```

Plate yellow appears on the registration input and nowhere else, including the admin dashboard and the virtual employee's widget.

**Typography** — three roles: **Newsreader** display (headlines only, 400/500, never below 24px) · **Inter Tight** body · **Geist Mono** for all vehicle data: registrations, mileage, prices, dates, VINs, years, phone numbers, MOT dates, scores. Engine displacements are product names, not data — body face. Inline mono gets the `.data-inline` tracking fix.

Scale 72/56/36/24/18/16/13. Body line-height 1.7, display 1.05, display tracking -0.02em.

**Layout** — max 1200px, measure ≤ 68ch, 120px+ between major sections, 8px base, radius 4px (never above 8px), hairlines 1px. Sections alternate paper/ink.

**Signature element** — the registration input as a UK number plate. The one loud object on the site.

**Photography** — real cars we bought, or nothing. No stock.

**Admin dashboard** uses the same tokens and type. Internal, but still ours. Denser spacing is allowed (64px sections, 16px gaps); the palette and faces are not negotiable.

## 6. Motion

Weight and confidence, not play. Standard easing `cubic-bezier(0.16,1,0.3,1)`, 600–800ms entrances, 200ms feedback. Everything respects `prefers-reduced-motion`. Animate `transform` and `opacity` only. **Never animate the LCP element from opacity 0** — found and fixed in M1, do not reintroduce.

Home load: orchestrated, under 1.2s, once per session. Scroll: 24px rise + opacity at 20% viewport, once. Headlines: line-by-line mask reveal. Dark/light section transitions interpolate over ~400ms. Buttons: colour shift + 1px lift. Links: underline draws left to right.

Never: bounce, spinners, typewriter, autoplay carousels, confetti, parallax on text. Mobile Lighthouse performance ≥ 90 wins any conflict.

## 7. Routes

```
/                                   Home
/sell-my-range-rover                ┐ Model pages — one template,
/sell-my-range-rover-evoque         │ genuinely distinct hand-written
/sell-my-range-rover-velar          │ copy per model, one verified
/sell-my-discovery-sport            │ specialist detail each.
/sell-my-land-rover-defender        │ Range Rover page covers Sport
/sell-my-lexus                      │ until a dedicated page exists.
/sell-my-mercedes-gle               ┘
/export                             Why offers on some models are stronger
/how-it-works · /about · /faq · /recently-purchased
/valuation                          The form (also embedded on every page)
/valuation/thank-you
/blog · /blog/[slug] · /blog/category/[category]
/privacy · /terms · /cookies
/admin/**                           Internal. Auth-gated. noindex. Phase C.
/api/vehicle/lookup                 Server-side DVLA + MOT. Phase B.
/api/photos/sign                    Blob upload signing. Phase B.
/api/agent/**                       Virtual employee tool endpoints. Phase D.
```

`/recently-purchased` is excluded from the sitemap while its array is empty. `/admin` and `/api` are excluded always.

### 7a. Header and navigation

Wordmark left · "Cars we buy" disclosure (seven models) · "Why we pay more" (`/export`) · `Get my offer` right. Ink on paper, 1px hairline, no shadow. Sticky copy after the hero, `aria-hidden` + `inert`. Below 768px: wordmark + CTA only, no hamburger. How it works, About, FAQ, Blog live in the footer. Footer carries the full sitemap and company details.

## 8. Page briefs (unchanged from v1)

Home: hero with plate input above the fold · assurance strip · the promise (largest type after hero) · how it works (numbered) · why our offers differ → `/export` · what we buy (seven cards + "and everything else" → `/valuation`) · comparison (private / part-ex / us, no names) · recently purchased · from the blog · final CTA · footer. Form reachable in zero clicks.

Model pages: H1 `Sell your [model]` · specialist opener · export eligibility block where it applies · at least one verified specialist detail · what we look for · 4-question model FAQ with FAQPage schema · plate input · three sibling links.

`/export`: Cyprus only. Left-hand traffic, UK RHD stock is the local standard, that's why some offers are stronger, that's why under five years. Never "and the EU".

`/how-it-works`: four steps, then the no-deductions policy in its own block, largest type on the page.

## 9. The form (v2 — Phase B and C)

**Step 1 — Identify.** Plate input → live lookup → "Is this your car?" card (make, year, colour, fuel, engine, MOT expiry, plus model and last recorded mileage **when available**, all in mono) → confirm, or "not my car" → manual entry. On confirm, make/model/year/mileage pre-fill.

Model and mileage come from MOT history and are absent on vehicles under ~3 years old. The card treats that as normal and asks for the model in one field — see ARCHITECTURE.md section 3.

**Step 2 — The car.** Mileage (pre-filled, editable) · service history · keepers · condition by area (bodywork / interior / mechanical / tyres: good/fair/poor + note) · warning lights · known faults · modifications · photos (up to 12, guided prompts for specific shots, previews, delete).

**Step 3 — The sale.** Reason for selling (free text) · timeline (asap / this month / next few months / just researching) · outstanding finance (yes/no/unsure, settlement known?) · part-exchange interest · fair price in their mind (optional, never echoed as an offer) · anyone else approached.

**Step 4 — You.** Name · phone · email · postcode · preferred contact window · marketing consent (unticked, separate from the enquiry).

**Persistence.** A lead exists from the moment reg is confirmed and contact details land (collect name/phone early if the seller skips ahead; the order above is the default, not a cage). Every later step patches the same record. Abandonment at any step leaves a usable lead. The operator alert fires on first persistence, and again with the score when enrichment completes.

**"Just researching" is a follow-up date, not a dead lead.** Never make it optional.

**Photos by email** remains the fallback in the auto-reply for anyone who skipped the uploader.

## 10. The virtual employee (Phase D)

Working name **Maya** — real name to PENDING-INFO.md. A voice-and-text assistant beside the form from the moment the car is identified. Behaves like the person who meets you on the forecourt.

**Does:** greets by the car's name once identified · explains each step in a sentence · detects a stall (30s on a field, or a skipped required field) and helps with that field specifically · answers process questions from a grounded knowledge base · asks the mindset questions (what's prompting the sale, how soon, any worries, other offers) and writes answers to the lead as structured notes · can pre-fill a field the seller says aloud, move between steps, trigger the photo guide.

**Never:** states a price, valuation, range, or anything that sounds like an offer · asserts a fact about the car not present in the lookup data · pressures, flatters, or creates urgency · promises anything the site doesn't · continues after the seller declines.

**Hard rules are coded, not prompted.** Price/valuation refusal is a pattern-matched guard on the output, not a line in the prompt. Facts about the car are drawn only from the lookup payload passed as tool context.

**Legal:** AI disclosure on first speech and in the widget. Recording and transcript consent before audio starts. Transcripts stored on the lead under the same retention policy. Opt-in only, silent by default, persistent "just the form" dismiss.

**Tools** (defined in `agent/tools.ts`, served from `/api/agent/*`): `read_form_state` · `set_field` · `go_to_step` · `trigger_photo_guide` · `append_lead_note` · `get_vehicle_context`.

## 11. The decision engine (Phase C)

Transparent rules. Every input shown in the dashboard with its source. A person decides.

**Inputs:** vehicle identity · MOT history · provenance result (when run) · valuation band (when run) · age at estimated landing (buy date + 5 weeks) · target-model match · VAT-qualifying (asked; verified later against V5C/invoice) · seller timeline and reason · current capital state · Cyprus comparables for the model · landed-cost model.

**Export passes only if all true:** under 5 years at landing · target model · provenance clean · projected Cyprus margin ≥ floor (default £3,500) after full landed cost · export capital slot free.

**Domestic passes if:** provenance clean or Cat N/S with explicit handling · retail − max bid − recon − CRA contingency ≥ floor (default £500) · expected days-to-sell ≤ 21.

**Output:** `recommended_channel` (export / domestic / pass) · `confidence` · `max_bid` · `projected_margin` · `reasoning[]` as plain bullets · `flags[]`. Then *Make offer* (a person types the number) or *Pass*.

Every constant — shipping, insurance, clearance, registration, Cyprus VAT handling, margin floors, CRA contingency, target models, days-to-sell table — lives in the settings table, editable from `/admin/settings` without a deploy.

## 12. The dashboard (Phase C)

`/admin`, Supabase magic-link auth, allow-list in env. `noindex`, excluded from sitemap, no public links.

Inbox (score-sorted, channel badge, 2-hour SLA marker) · Lead detail (everything: vehicle, MOT timeline, photos, condition, seller answers, Maya transcript and notes, provenance, valuation, decision panel with sourced numbers, offer entry, outcome, call log) · Pipeline kanban (new → contacted → offered → accepted → collected → listed/shipped → sold, with per-car P&L) · Follow-ups by `next_contact_date` · Comparables logger · Settings.

## 13. Build order — v2 phases

**Phase A — Ship what exists.** Commit posts 8–12. Deploy the real repo to Vercel. Env vars in. End-to-end test from a phone. No new code.

**Phase B — Live vehicle data + storage.** Supabase schema and migration. `/api/vehicle/lookup`. Confirm-your-car step. Photo upload via Blob.

**Phase C — Form v2, enrichment, dashboard v1.** Four-step form. Background enrichment job. Decision engine with settings. `/admin` inbox, detail, pipeline, follow-ups, settings. Scored operator alerts.

**Phase D — Maya.** Text mode, tools, stall detection, mindset questions, then voice with disclosure and consent. Transcript on lead.

**Phase E — Compounding.** Comparables feeding valuation. Follow-up reminders (to the operator, never automated messages to sellers). Paid adapters enabled when keys arrive. Motion pass and Lighthouse tuning. Local SEO pages once the address exists.

Each phase is independently shippable. Each phase starts with a plan and waits for approval before code.

## 14. SEO (unchanged, plus admin exclusions)

Static generation wherever possible. Unique metadata per route. `sitemap.ts` and `robots.ts` from real routes; `/admin` and `/api` disallowed. Canonicals everywhere. Per-route OG images. One `h1` per page. JSON-LD: AutoDealer, FAQPage, BreadcrumbList, BlogPosting, Organization. Core Web Vitals on mobile: LCP < 2.0s, CLS < 0.05, INP < 200ms. Model pages target transactional intent; blog targets informational and links inward. Local city pages only after the trading address is confirmed, never with placeholder content.

## 15. Verification discipline

Every external claim is verified before it is written, and logged in `SOURCES.md` with page and URL as it is written — not at the end. Where a claim can't be sourced it is not made, and the gap is recorded with an instruction not to fill it without evidence. Figures carry their date in the copy. This applies equally to the virtual employee's knowledge base and to anything the decision engine shows a human.

## 16. Legal

UK GDPR: privacy policy, lawful basis, retention, deletion. Explicit unticked marketing consent. Cookie consent blocks all non-essential scripts. Voice: AI disclosure, recording consent, transcript retention. Companies Act footer details. ICO registration. ASA/CAP: every claim substantiable. Solicitor review of privacy, terms, and the finance blog post before public launch.

## 17. Definition of done

Renders at 375/768/1440 · keyboard navigable with visible focus · reduced motion respected · WCAG AA contrast · mobile Lighthouse ≥ 90 performance, ≥ 95 accessibility · unique title and description · no fabricated data, every unknown an `AWAITING_RESPONSE` with a `PENDING-INFO.md` line · no exclamation marks, "up to", "free quote", urgency mechanics · plate yellow only on the plate · no auto-offer path · every number in the dashboard shows its source · and the question that matters: would a seller believe a person who actually buys cars built this?
