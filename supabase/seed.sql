-- Settings seed.
--
-- This file is deliberately short. CLAUDE.md section 11 names real
-- defaults for exactly two values: the export margin floor (£3,500) and
-- the domestic margin floor (£500). Those are seeded below.
--
-- Everything else the decision engine needs — shipping, marine
-- insurance, Cyprus clearance, Cyprus registration, Cyprus VAT handling,
-- recon default, CRA contingency, the days-to-sell table, target models,
-- SLA hours — is UNCONFIRMED and tracked in PENDING-INFO.md under
-- Phase C.
--
-- Those keys are NOT seeded with placeholder numbers. A decision engine
-- that computes a plausible margin from invented shipping costs is worse
-- than one that refuses to run: the first produces a number a person
-- might act on. Phase C must read these keys and fail loudly when they
-- are absent.
--
-- Money is stored in whole pounds, matching the integer columns on
-- enrichments and offers.

insert into settings (key, value, updated_by) values
  ('margin_floor_export',   '3500'::jsonb, 'seed'),
  ('margin_floor_domestic', '500'::jsonb,  'seed'),
  -- Not Alex's to decide: two hours is the promise the site already
  -- makes on every page, so the inbox marks a breach against it.
  ('sla_hours',             '2'::jsonb,    'seed')
on conflict (key) do nothing;
