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

The "Is this your car?" card shows: make · model · colour · fuel · engine · year · MOT expiry · last recorded mileage with its date. All mono. Derivative/trim comes only from the paid valuation adapter later; until then the seller types it.

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
| TBD (Phase C) | Inngest vs Vercel cron for jobs | Record the choice and reasoning here |
