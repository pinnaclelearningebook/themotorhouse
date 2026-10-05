-- The Motor House — initial schema
-- ARCHITECTURE.md section 2. All ids uuid, all timestamps timestamptz.
--
-- Table order follows foreign-key dependencies: vehicles before leads,
-- leads before everything that hangs off a lead.

-- ─── Enums ─────────────────────────────────────────────────────────────

create type lead_status as enum (
  'new', 'contacted', 'offered', 'accepted', 'declined',
  'collected', 'listed', 'shipped', 'sold', 'lost', 'researching'
);

create type channel as enum ('export', 'domestic', 'pass');

create type sale_timeline as enum ('asap', 'this_month', 'few_months', 'researching');

create type finance_outstanding as enum ('yes', 'no', 'unsure');

create type service_history as enum ('full', 'partial', 'none');

create type vat_qualifying as enum ('yes', 'no', 'unknown');

create type confidence_level as enum ('low', 'medium', 'high');

create type offer_status as enum ('sent', 'accepted', 'declined', 'expired');

create type conversation_mode as enum ('text', 'voice');

create type comparable_market as enum ('uk', 'cyprus');

-- ─── vehicles ──────────────────────────────────────────────────────────
-- One row per registration, shared across leads. `fetched_at` drives the
-- 24h lookup cache in /api/vehicle/lookup.
--
-- `model` is nullable on purpose: DVLA VES does not return a model field,
-- and DVSA MOT history (which does) has no record for a vehicle under
-- ~3 years old. See ARCHITECTURE.md section 3.

create table vehicles (
  id                   uuid primary key default gen_random_uuid(),
  reg                  text not null unique,
  fetched_at           timestamptz not null default now(),

  make                 text,
  model                text,
  derivative           text,
  colour               text,
  fuel                 text,
  engine_cc            integer,
  year_of_manufacture  integer,
  first_registered     date,

  tax_status           text,
  tax_due              date,
  mot_status           text,
  mot_expiry           date,

  co2                  integer,
  euro_status          text,
  type_approval        text,
  wheelplan            text,

  raw_dvla             jsonb
);

create index vehicles_fetched_at_idx on vehicles (fetched_at);

-- ─── leads ─────────────────────────────────────────────────────────────
-- A lead exists only once the registration is confirmed AND the first
-- contact field lands (CLAUDE.md section 9). The vehicle row is written
-- earlier, at reg-confirm.

create table leads (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  status                  lead_status not null default 'new',
  channel_recommended     channel,
  channel_decided         channel,

  reg                     text not null,
  vehicle_id              uuid references vehicles (id) on delete set null,

  -- contact
  name                    text,
  phone                   text,
  email                   text,
  postcode                text,
  contact_window          text,
  marketing_consent       boolean not null default false,
  consent_at              timestamptz,

  -- the sale
  reason_for_sale         text,
  timeline                sale_timeline,
  finance_outstanding     finance_outstanding,
  settlement_known        boolean,
  part_exchange_interest  boolean,
  -- Stored for the operator's context. Never echoed back to the seller
  -- as an offer, and never an input to the decision engine.
  fair_price_in_mind      integer,
  others_approached       text,

  -- the car, as the seller reports it
  mileage_reported        integer,
  service_history         service_history,
  keepers                 integer,
  condition               jsonb,
  warning_lights          text,
  known_faults            text,
  modifications           text,

  -- operations
  next_contact_date       date,
  source                  text,
  notes                   text
);

create index leads_created_at_idx on leads (created_at desc);
create index leads_status_idx on leads (status);
create index leads_next_contact_date_idx on leads (next_contact_date)
  where next_contact_date is not null;
create index leads_vehicle_id_idx on leads (vehicle_id);

-- ─── mot_tests ─────────────────────────────────────────────────────────

create table mot_tests (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references vehicles (id) on delete cascade,
  test_date      date,
  result         text,
  expiry_date    date,
  odometer       integer,
  odometer_unit  text,
  defects        jsonb
);

create index mot_tests_vehicle_id_idx on mot_tests (vehicle_id, test_date desc);

-- ─── photos ────────────────────────────────────────────────────────────

create table photos (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads (id) on delete cascade,
  blob_url     text not null,
  shot_type    text,
  uploaded_at  timestamptz not null default now(),
  width        integer,
  height       integer,
  bytes        integer
);

create index photos_lead_id_idx on photos (lead_id);

-- ─── enrichments ───────────────────────────────────────────────────────
-- Append-only. Every pipeline run writes a new version rather than
-- updating, so the decision panel can show which version a number came
-- from (ARCHITECTURE.md section 2).

create table enrichments (
  id                         uuid primary key default gen_random_uuid(),
  lead_id                    uuid not null references leads (id) on delete cascade,
  created_at                 timestamptz not null default now(),
  version                    integer not null default 1,

  age_at_landing_years       numeric,
  target_model_match         boolean,
  export_eligible            boolean,
  export_blockers            text[],
  vat_qualifying             vat_qualifying,

  valuation_trade            integer,
  valuation_private          integer,
  valuation_retail           integer,
  valuation_source           text,
  valuation_at               timestamptz,

  landed_cost                jsonb,
  projected_margin_export    integer,
  projected_margin_domestic  integer,
  max_bid_export             integer,
  max_bid_domestic           integer,
  days_to_sell_estimate      integer,

  score                      numeric,
  confidence                 confidence_level,
  recommended_channel        channel,
  reasoning                  text[],
  flags                      text[]
);

create unique index enrichments_lead_version_idx on enrichments (lead_id, version);
create index enrichments_lead_created_idx on enrichments (lead_id, created_at desc);

-- ─── provenance_checks ─────────────────────────────────────────────────
-- Paid. Written only by a job a human triggered from /admin. `cost_pence`
-- and `run_by` exist so spend is always attributable.

create table provenance_checks (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references leads (id) on delete cascade,
  provider             text not null,
  run_at               timestamptz not null default now(),
  run_by               text not null,

  finance_outstanding  boolean,
  write_off_category   text,
  stolen               boolean,
  mileage_anomaly      boolean,
  plate_changes        integer,
  keepers              integer,

  raw                  jsonb,
  cost_pence           integer
);

create index provenance_checks_lead_id_idx on provenance_checks (lead_id);

-- ─── offers ────────────────────────────────────────────────────────────
-- `amount` is always typed by a person. There is no code path that
-- writes this row automatically (CLAUDE.md sections 1 and 17).

create table offers (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads (id) on delete cascade,
  made_by      text not null,
  made_at      timestamptz not null default now(),
  amount       integer not null,
  valid_until  date,
  channel      channel,
  status       offer_status not null default 'sent',
  notes        text
);

create index offers_lead_id_idx on offers (lead_id, made_at desc);

-- ─── conversations ─────────────────────────────────────────────────────

create table conversations (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references leads (id) on delete cascade,
  provider             text,
  started_at           timestamptz not null default now(),
  ended_at             timestamptz,
  mode                 conversation_mode not null default 'text',
  consent_recorded_at  timestamptz,
  transcript           jsonb,
  structured_notes     jsonb,
  cost_pence           integer
);

create index conversations_lead_id_idx on conversations (lead_id);

-- ─── comparables ───────────────────────────────────────────────────────

create table comparables (
  id           uuid primary key default gen_random_uuid(),
  logged_by    text,
  logged_at    timestamptz not null default now(),
  market       comparable_market not null,
  source       text,
  url          text,
  make         text,
  model        text,
  derivative   text,
  year         integer,
  mileage      integer,
  asking       integer,
  sold         integer,
  days_listed  integer,
  notes        text
);

create index comparables_lookup_idx on comparables (market, make, model, year);

-- ─── settings ──────────────────────────────────────────────────────────
-- Every decision-engine constant lives here so it is editable from
-- /admin without a deploy. Deliberately sparse at seed time — see
-- supabase/seed.sql.

create table settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

-- ─── audit_log ─────────────────────────────────────────────────────────

create table audit_log (
  id       uuid primary key default gen_random_uuid(),
  at       timestamptz not null default now(),
  actor    text,
  lead_id  uuid references leads (id) on delete set null,
  action   text not null,
  before   jsonb,
  after    jsonb
);

create index audit_log_lead_id_idx on audit_log (lead_id, at desc);

-- ─── api_rate_limits ───────────────────────────────────────────────────
-- Not in ARCHITECTURE.md section 2 as originally written; added because
-- /api/vehicle/lookup limits are per-IP and must hold across serverless
-- instances, where an in-memory counter does not. Recorded in the
-- ARCHITECTURE.md section 9 decisions log.
--
-- One row per (key, window_start). Counting rows in a window is cheaper
-- and more concurrency-safe than incrementing a shared counter.

create table api_rate_limits (
  id            uuid primary key default gen_random_uuid(),
  bucket        text not null,
  identifier    text not null,
  occurred_at   timestamptz not null default now()
);

create index api_rate_limits_lookup_idx
  on api_rate_limits (bucket, identifier, occurred_at desc);

-- ─── updated_at maintenance ────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();
