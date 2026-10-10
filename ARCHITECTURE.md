# ARCHITECTURE.md — The Motor House v2

Technical companion to CLAUDE.md. Read before any work in Phases B–E. Decisions recorded here are binding until changed here.

---

## 1. System overview

```
SELLER                                            OPERATORS (Sid, Alex)
  │                                                       │
  ▼                                                       ▼
┌──────────────────────────┐                   ┌───────────────────────┐
│  Public site (Next.js)   │                   │  /admin (Next.js)      │
│  pages · form · Maya     │                   │  inbox · detail ·      │
│  widget · blog           │                   │  pipeline · settings   │
└────────┬─────────────────┘                   └───────────┬───────────┘
         │ server actions / route handlers                 │ server actions
         ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Postgres (Supabase)  ·  Supabase Auth  ·  Vercel Blob               │
└────────┬─────────────────────────────────────────────────────────────┘
         │ enqueue on lead events
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Enrichment jobs (Inngest)                                           │
│  vehicle → mot → eligibility → landed cost → score → alert           │
│  provenance / valuation only when triggered from /admin              │
└────────┬─────────────────────────────────────────────────────────────┘
         │
         ▼
  External: DVLA VES · DVSA MOT · Resend · ElevenLabs · HPI/Experian · UKVD
```

Three trust boundaries: the public site trusts nothing from the client; `/admin` trusts an authenticated allow-listed user; jobs trust the database. No external API key ever reaches the browser.

## 2. Data model

All tables in Supabase Postgres with row-level security on. Public site writes through server actions using the service role; `/admin` reads/writes as the authenticated user. Timestamps are `timestamptz`, ids are `uuid`.

```sql
leads
  id, created_at, updated_at
  status            enum: new | contacted | offered | accepted | declined |
                          collected | listed | shipped | sold | lost | researching
  channel_recommended  enum: export | domestic | pass | null
  channel_decided      enum: export | domestic | pass | null
  reg               text
  vehicle_id        → vehicles
  -- contact
  name, phone, email, postcode, contact_window
  marketing_consent bool, consent_at
  -- the sale
  reason_for_sale   text
  timeline          enum: asap | this_month | few_months | researching
  finance_outstanding enum: yes | no | unsure
  settlement_known  bool
  part_exchange_interest bool
  fair_price_in_mind int   -- never shown back to seller as an offer
  others_approached text
  -- the car (seller-reported)
  mileage_reported  int
  service_history   enum: full | partial | none
  keepers           int
  condition         jsonb  -- {bodywork, interior, mechanical, tyres: {grade, note}}
  warning_lights    text
  known_faults      text
  modifications     text
  -- operations
  next_contact_date date
  source            text   -- utm / referrer / "maya"
  notes             text

vehicles
  id, reg (unique), fetched_at
  make, model, derivative, colour, fuel, engine_cc, year_of_manufacture
  first_registered  date
  tax_status, tax_due, mot_status, mot_expiry
  co2, euro_status, type_approval, wheelplan
  raw_dvla          jsonb

mot_tests
  id, vehicle_id → vehicles
  test_date, result, expiry_date, odometer, odometer_unit
  defects           jsonb  -- [{type: advisory|minor|major|dangerous, text}]

photos
  id, lead_id → leads, blob_url, shot_type, uploaded_at, width, height, bytes

enrichments
  id, lead_id → leads, created_at, version
  age_at_landing_years     numeric
  target_model_match       bool
  export_eligible          bool
  export_blockers          text[]
  vat_qualifying           enum: yes | no | unknown
  valuation_trade, valuation_private, valuation_retail  int  (null until run)
  valuation_source, valuation_at
  landed_cost              jsonb  -- itemised, from settings at time of run
  projected_margin_export  int
  projected_margin_domestic int
  max_bid_export, max_bid_domestic  int
  days_to_sell_estimate    int
  score                    numeric
  confidence               enum: low | medium | high
  recommended_channel      enum
  reasoning                text[]
  flags                    text[]

provenance_checks
  id, lead_id, provider, run_at, run_by
  finance_outstanding bool, write_off_category text, stolen bool,
  mileage_anomaly bool, plate_changes int, keepers int
  raw jsonb, cost_pence int

offers
  id, lead_id, made_by, made_at, amount, valid_until, channel
  status enum: sent | accepted | declined | expired
  notes

conversations
  id, lead_id, provider, started_at, ended_at, mode enum: text | voice
  consent_recorded_at, transcript jsonb, structured_notes jsonb
  cost_pence int

comparables
  id, logged_by, logged_at, market enum: uk | cyprus
  source text, url text, make, model, derivative, year, mileage
  asking int, sold int, days_listed int, notes

settings
  key text primary key, value jsonb, updated_by, updated_at
  -- shipping_gbp, marine_insurance_gbp, cyprus_clearance_gbp,
  -- cyprus_registration_gbp, cyprus_vat_rate, margin_floor_export,
  -- margin_floor_domestic, cra_contingency_pct, recon_default_gbp,
  -- target_models[], days_to_sell_table, export_slot_open (bool),
  -- operator_emails[], sla_hours

audit_log
  id, at, actor, lead_id, action, before jsonb, after jsonb
```

Every write from `/admin` that changes a lead, offer or setting writes an `audit_log` row. The decision panel shows the enrichment version it was computed from.

## 3. Vehicle lookup — `/api/vehicle/lookup`

```
POST { reg }  →  { vehicle: VehicleIdentity, mot: MotTest[], source: "live"|"cache" }
```

1. Normalise reg (strip spaces, uppercase). Validate against UK formats.
2. Rate-limit: 10/min per IP, 100/day per IP. Return 429 with a plain message.
3. Cache: `vehicles.fetched_at` within 24h → return cached.
4. DVLA VES: `POST https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles` with `x-api-key`. Map to `vehicles`.
5. DVSA MOT History: OAuth2 client-credentials token (cache token until expiry), then `GET /v1/trade/vehicles/registration/{reg}`. Map tests to `mot_tests`.
6. Persist both. Return.

Keys absent → return `{ vehicle: null, mot: [], source: "stub" }` and render the dev banner. Partial failure (DVLA ok, MOT down) returns what succeeded with `mot_unavailable: true`; the form proceeds without pre-filled mileage.

The "Is this your car?" card renders from whatever the two sources returned, in mono.

`make` · `colour` · `fuel` · `engine` · `year` · `mot expiry` come from DVLA and are near-always present. `model` and `last recorded mileage` come from DVSA MOT history, which **does not exist for a vehicle under ~3 years old** — the first MOT is due three years after first use. That excludes much of the export target, which is cars under five years.

**A missing model is a normal state, not an error.** The card shows what is known and asks the seller to confirm the model in a single field. The recognition lever carries on make, year, colour and engine, which together are strongly identifying. `derivative`/trim stays seller-typed until a paid valuation adapter exists.

## 4. Photo upload

`POST /api/photos/sign { leadId, shotType, contentType, bytes }` → signed Vercel Blob upload URL. Client uploads direct. On completion, `POST /api/photos/complete` writes the `photos` row. Max 12 per lead, 10MB each, image types only, EXIF stripped server-side on complete. Guided shot list: front-three-quarter, rear-three-quarter, driver-side, passenger-side, interior-front, interior-rear, dash-with-mileage, boot, each-wheel ×4, damage (repeatable).

## 5. Enrichment pipeline

Triggered on `lead.created` and `lead.updated` (debounced 30s). Inngest function with steps:

```
1. ensure_vehicle        — lookup if missing or stale
2. eligibility           — age at landing = today + 5w vs first_registered;
                           target model match against settings
3. landed_cost           — from settings, itemised
4. valuation_if_present  — read any existing valuation; do NOT call paid API
5. score                 — rules in lib/decision/score.ts, pure function,
                           unit-tested, settings passed in
6. persist enrichment    — new version row
7. alert                 — Resend to operator_emails with score, channel,
                           reasoning, deep link to /admin/leads/{id}
```

Paid calls (`provenance.run`, `valuation.run`) are separate Inngest functions triggered only by a button in `/admin`, logged with cost and actor. There is no code path that runs them automatically.

**Everything the decision engine produces is internal.** `export_eligible`, `recommended_channel`, `channel_decided`, `score`, `confidence`, `max_bid`, `projected_margin` and `reasoning` are for `/admin` only. None of them is ever rendered to a seller, included in an email to a seller, or returned by any route the browser can reach. A seller is told a number, and that we collect and pay. Which channel their car went to is not something they are shown or told.

`lib/decision/score.ts` is a pure function `(lead, vehicle, mot, enrichmentInputs, settings) → Enrichment`. It has tests covering: export-eligible target model; too old at landing; target model with provenance flag; domestic high-margin; domestic below floor; Cat N; missing MOT data. Reasoning strings are human sentences, never codes.

## 6. Virtual employee — agent/

```
agent/
  prompt.md          system prompt — reviewed by a human before any change ships
  knowledge/         grounded facts: how-it-works, offer policy, collection,
                     payment, finance, part-ex, what we buy, Cyprus (one page)
  tools.ts           tool schemas + server handlers
  guards.ts          output guards: price/valuation/range regex + numeric-with-
                     currency detection → replace with the standard deflection;
                     car-fact assertions checked against vehicle context
  elevenlabs.ts      provider adapter — create agent, session token, webhooks
```

Session flow: seller confirms car → widget mounts silent with "Talk to Maya" / "Just the form" → opt-in → text mode by default, voice on request → consent modal before mic → ElevenLabs session with `vehicleContext` and `formState` injected → tool calls hit `/api/agent/*` which validate the session belongs to the lead → transcript webhook writes `conversations` on end.

Guards run on every assistant turn server-side before it reaches the seller. A blocked turn is logged with the original text for weekly review.

## 7. Admin

`/admin/layout.tsx` checks Supabase session + allow-list, else redirects to `/admin/login`. Every page `noindex`. Routes: `/admin` (inbox), `/admin/leads/[id]`, `/admin/pipeline`, `/admin/follow-ups`, `/admin/comparables`, `/admin/settings`, `/admin/review` (Maya guard log).

Inbox query: `leads` joined to latest `enrichments`, ordered by `score desc, created_at asc`, with `sla_breached = now() - created_at > sla_hours and status = 'new'`.

## 8. Environment variables

```
NEXT_PUBLIC_SITE_URL
SUPABASE_URL · SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
ADMIN_ALLOWLIST            comma-separated emails
BLOB_READ_WRITE_TOKEN
RESEND_API_KEY · OPERATOR_EMAILS
DVLA_VES_API_KEY
DVSA_MOT_CLIENT_ID · DVSA_MOT_CLIENT_SECRET · DVSA_MOT_API_KEY · DVSA_MOT_SCOPE
DVSA_MOT_TOKEN_URL         issued at registration, contains a tenant id
DVSA_MOT_API_BASE          optional override
INNGEST_EVENT_KEY · INNGEST_SIGNING_KEY
ELEVENLABS_API_KEY · ELEVENLABS_AGENT_ID
PROVENANCE_PROVIDER · PROVENANCE_API_KEY        (optional)
VALUATION_PROVIDER · VALUATION_API_KEY          (optional)
```

Missing optional keys → adapter returns `null` and `/admin` shows the control disabled with the reason. Missing required keys → loud server log and dev banner, never a silent success.

## 9. Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-05 | Postgres (Supabase) replaces Airtable | Scores, transcripts, comparables and auth don't fit Airtable; Supabase bundles auth + storage + RLS |
| 2026-10-05 | Free lookups on every reg, paid checks only from `/admin` | Cost per visitor must stay near zero; cost per *interesting* lead can be pounds |
| 2026-10-05 | Decision engine is rules, not ML | Transparent, testable, tunable by Alex without a deploy; volume too low for anything else |
| 2026-10-05 | No auto-offer path | One wrong automated offer costs more than a year of saved minutes |
| 2026-10-05 | ElevenLabs for Maya v1, provider-swappable | Fastest route to a voice that feels like a person; agent logic kept in-repo |
| 2026-10-05 | Guards on agent output are code, not prompt | Prompts fail quietly; regex and context checks fail loudly |
| 2026-10-05 | The identify card tolerates a missing model | DVLA VES has no model field; DVSA MOT has model and mileage but only after first MOT at ~3 years, which excludes most export-target cars. Verified against the DVLA VES v1.2.0 schema before building. |
| 2026-10-05 | `api_rate_limits` table rather than in-memory counters | `/api/vehicle/lookup` limits are per-IP and must hold across serverless instances; Postgres is already in the stack and no other shared store is |
| 2026-10-05 | Vehicle row written at reg-confirm, lead row at first contact field | CLAUDE.md section 9 requires both reg confirmed *and* contact details before a lead exists; writing a lead at confirm would create uncontactable rows and nothing for the operator alert to fire on |
| 2026-10-05 | Settings seed carries only the two documented margin floors | Landed-cost constants are unconfirmed in PENDING-INFO; seeding invented numbers would let the Phase C decision engine compute plausible margins from fiction. Absent values fail loudly instead. |
| 2026-10-05 | Phone moves to the end of step 1; the lead is created there | The four-step form put contact details at step 4, so a persistence proof showed zero rows at every abandonment point before submit — a seller who described their car and their circumstances and then stopped left nothing at all. One phone field after "Is this your car?" costs the seller almost nothing and turns every later abandonment into a lead someone can ring. Steps 2-4 patch the row. |
| 2026-10-05 | Vercel cron, not Inngest, for enrichment jobs | The pipeline is seven steps finishing in seconds at a handful of leads a day. Inngest adds a third-party dependency, two env vars and a webhook surface — another thing that can fail quietly, and this project has found several of those. A cron hitting an internal route plus a `pending_enrichment` flag does the same work with nothing new to operate. **Fallback:** if Phase D needs step-level durability, retries across minutes, or fan-out, Inngest is the move and the pipeline is written so the steps can be lifted into it. |
| 2026-10-05 | `/admin` sweeps pending enrichments on load, instead of upgrading to Pro | Hobby caps cron at daily, so a failed inline enrichment could sit for hours. Rather than pay for a minute-level cron, the inbox sweeps anything still pending when an operator opens it — which is exactly the moment it matters, since an unscored lead only costs anything when someone is looking for work to do. Daily cron remains the backstop for a day nobody opens the dashboard. |
| 2026-10-05 | The two hard constraints are a test, not a grep | "No automatic paid calls" and "no offer path" were verified by hand. A check nobody is obliged to run is a check that eventually is not run, so `test/constraints.test.ts` walks the source and fails the build on a violation. Both rules were confirmed to fail when deliberately broken, and to pass when restored. |
| 2026-10-05 | Cron sweep runs daily, not every minute | Hobby accounts are capped at one cron run per day; `* * * * *` is rejected at deploy. The inline trigger from step 4 makes the common case immediate, so cron only matters when that trigger fails. **The gap:** on Hobby, a failed inline enrichment waits until 06:00 to be swept. Mitigations, in order of preference: upgrade to Pro and set the schedule back to every minute; or sweep on `/admin` load in Phase C part 2 so an operator opening the inbox catches anything stuck. |
| 2026-10-05 | Enrichment is triggered directly from step 4 as well as by cron | Cron alone means a lead waits for the next tick. A seller submitting at 2pm and the operator being alerted at 2:14 is the wrong experience when the promise is two hours. The server action fires the pipeline inline; cron is the catch-up for anything that failed or was never triggered. |
| 2026-10-05 | The admin auth gate lives in `app/admin/(workspace)/layout.tsx`, not `app/admin/layout.tsx` | The gate was on the `/admin` layout, which in the App Router wraps every descendant — including the login page it redirects to. `/admin/login` 307'd to itself indefinitely, so admin sign-in was unreachable from the moment it shipped. Typecheck, lint and 73 tests all passed: nothing about it is a type error. The login page and the auth callback now sit outside the gated group, and `test/admin-routing.test.ts` fails if the gate moves back. |
| 2026-10-05 | Magic-link sign-in happens in a Server Action; no `NEXT_PUBLIC_SUPABASE_*` pair exists | The login form was a client component reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, neither of which was set anywhere — not in `.env.local`, not in Vercel — so sign-in failed locally as well as deployed. Rather than add a second set of names to keep in sync, the Supabase call moved server-side, which the repo needed anyway: `@supabase/ssr` uses PKCE, and the code verifier is a cookie only a server can write. One set of env names, and keys never reach the browser. |
| 2026-10-05 | The allow-list is checked before `signInWithOtp`, not only after sign-in | `signInWithOtp` creates an auth user for any address that asks. Calling it unconditionally let anyone with the URL fill `auth.users` and spend the Supabase email quota, even though RLS would still have denied them data. Checking `ADMIN_ALLOWLIST` first means a stranger's address never reaches Supabase; the page's reply is identical either way, so the list still cannot be enumerated. Verified: submitting an off-list address created zero auth users. |
| 2026-10-05 | `/admin/auth/callback` is a route handler, not a page | PKCE returns a code, not a session, and exchanging it is what writes the session cookies. A Server Component cannot set cookies, so the exchange has to be a route handler. Previously no callback existed at all and the link pointed at `/admin`, which would have arrived carrying a code nobody read. |
| 2026-10-06 | Our server is the brain for Maya; ElevenLabs becomes voice transport later | Section 6 requires guards on every assistant turn server-side before it reaches the seller, which a hosted widget talking browser-to-provider makes impossible. Verified that ElevenLabs supports a custom LLM over an OpenAI-compatible `/v1/chat/completions` endpoint with SSE, so voice can call the same path in Session 6 and the guards cover both modes without being written twice. ELEVENLABS keys therefore move to before Session 6. |
| 2026-10-06 | Nothing is streamed | A guard must see the whole turn before any of it reaches the seller, and half an emitted price cannot be recalled. Costs a beat of latency in text; voice may need sentence-level guarding instead, which is a Session 6 decision. |
| 2026-10-06 | The knowledge base is derived from `config/faq.ts`, not written beside it | A hand-written copy of the FAQ is a second source of truth that drifts, and a confidently wrong policy answer is worse than none. Deriving it means changing `/faq` changes Maya in the same deploy. Entries awaiting a decision are excluded exactly as they are from the page's JSON-LD. |
| 2026-10-06 | Knowledge pages hold facts; behaviour stays in the prompt | My first version put "never tell a seller which route their car took" in a knowledge page, which made that page fail the test that runs every page through the guards. The test was right: a page that cannot be read aloud to a seller is not knowledge. |
| 2026-10-06 | `agent_enabled` fails closed and seeds false | Anything other than exactly true is off, including a missing row or an unreadable settings table. A switch that defaults to on when the database hiccups is not a switch, and the failure mode of shipping her early is a seller being told something we cannot stand behind. |
| 2026-10-06 | The agent session is a random token on the conversation row, and leads are bound to the browser that created them | The session route originally took a `leadId` from the request body. A registration is visible on any parked car, so that let anyone open a session naming a stranger's lead and have `set_field` write to it. Now the route takes only a registration and resolves the vehicle itself, the lead-creation action records the id in an httpOnly cookie, and `/api/agent/notes` accepts a lead only if that cookie vouches for it. |
| 2026-10-06 | Blocked turns are stored in `agent_blocks`, never in the transcript | The transcript is what the seller saw. Keeping the original there would let a later read of the lead resurface a number nobody stood behind; keeping it separately is what makes weekly review possible without that risk. |
| 2026-10-09 | Thinking is off for Maya (`between_tools`) | On claude-sonnet-5-5 thinking is on by default and its tokens come out of the same `max_tokens` budget. With the full system prompt and a 400-token ceiling the budget was spent before any text was produced: a 200 response, an empty assistant turn in the transcript, and a blank bubble for the seller. Maya writes two sentences and the hard rules are enforced by `agent/guards.ts` rather than by reasoning, so thinking bought nothing and cost the reply. An empty completion is now an error rather than a message. |
| 2026-10-09 | Every model call is bounded, and so is the whole turn | `fetch` has no default timeout; one call was observed holding a request open for 60.5 minutes before the socket gave up, which on Vercel spends the entire function budget while the seller watches a typing indicator. A per-call timeout was not enough once the tool loop existed — five rounds multiply it — so a turn runs against a single deadline. |
| 2026-10-09 | Agent tool writes confirm themselves, and enum fields are validated first | `setField` and `appendLeadNote` ignored the Supabase error, so a rejected write reported success and Maya told the seller something was saved when it was not. A timeline of "fairly soon" is rejected by the `sale_timeline` enum, which is exactly how this surfaced. Enum-backed fields are now checked against the values the column accepts before the write is attempted. |
| 2026-10-09 | `AGENT_DEV_FORCE_ON` exists because local and production share one settings table | Flipping `agent_enabled` to true to test Maya locally would have turned her on in production in the same instant. The flag runs her in `next dev` while the stored setting stays false, and is guarded by `NODE_ENV` like `ADMIN_DEV_BYPASS`. |
| 2026-10-09 | Test files run one at a time | Several tests each boot a Postgres compiled to WebAssembly and replay every migration. Run in parallel workers they contend badly enough to hang, so the suite passed file by file and failed when run together — a green run that depends on what else is on the machine means nothing. |
| 2026-10-06 | No claims about volume, frequency, track record or experience | No car has been bought, so "most weeks" is a fabrication of the same kind as an invented review. Policy is always available instead. Applying the rule repository-wide found two instances already live in blog copy, both rewritten; `agent/guards.ts` blocks the pattern in anything Maya says. |
| 2026-10-05 | Actual money gets its own storage (`car_costs`, `leads.sold_price`), kept apart from projections | The pipeline's per-car P&L had nothing truthful to compute from: `enrichments` holds the decision engine's projected margins and `offers` holds what we offered. A P&L built from projected landed costs would read as realised and would not be, which is the same failure the settings seed refuses — and these are the numbers that decide whether the export channel is worth running. The dashboard now shows projected (Decision panel) and actual (Money panel) as separate sections with different labels, and `lib/admin/pnl.ts` has a test asserting it never reads a projected margin. |
| 2026-10-05 | Purchase price is read from the accepted offer, never stored on the lead | A second editable copy of what we paid is somewhere for the two to silently disagree, and the brand promise is that the offer does not change. One source. |
| 2026-10-05 | A margin with no logged costs is labelled "before costs", not shown as the margin | Zero recorded costs is not zero costs. Recon and shipping are usually the difference between a good car and a bad one, so an unqualified margin that ignores them flatters the export channel exactly where the decision is being made. |
| 2026-10-05 | Pipeline cards move by select-and-submit, not drag-and-drop | Keyboard operable, works on a phone, needs no client JavaScript, and cannot drop a car into the wrong column on a bad swipe. A kanban board is a reading surface here; the precision matters more than the gesture. |
| 2026-10-05 | The offer-entry action is `recordOffer`, and the offers constraint now tests for writes rather than any mention | Offer entry was missing, so purchase price could never be populated and the P&L was dead on arrival. Adding it hit two existing guards, both correctly: the banned-name regex rejects `makeOffer`/`createOffer`, so the function is named for what it does — a person typed the number, we write it down. The "writes to offers only from /admin" check matched any `from("offers")`, including the pipeline's read of the accepted offer; it now looks for `.insert`/`.update`/`.upsert`/`.delete` after the table, and was confirmed to still fail on an insert outside /admin while passing a read. |
