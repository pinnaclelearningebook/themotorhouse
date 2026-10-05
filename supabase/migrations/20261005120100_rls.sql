-- Row-level security.
--
-- Posture for Phase B: RLS is ON everywhere with NO permissive policies,
-- which in Postgres means deny-all for every role that does not bypass
-- RLS. The only writer in Phase B is the server action path using the
-- Supabase service role, which bypasses RLS by design.
--
-- This is deliberate rather than unfinished. Supabase magic-link auth
-- will issue a session to ANY email address that requests one, so a
-- policy of `to authenticated using (true)` would let anyone who signed
-- up read every lead — names, phone numbers, emails, postcodes — through
-- the public REST API. The /admin allow-list lives in an env var
-- (ARCHITECTURE.md section 7), which the database cannot see.
--
-- PHASE C REQUIREMENT: before /admin ships, add an allow-list table the
-- policies can read, and write policies of the form
--
--   using ((auth.jwt() ->> 'email') in (select email from admin_users))
--
-- Do NOT ship `using (true)` for authenticated. The deny-all default
-- below is safe to leave in place until those policies exist.

alter table vehicles           enable row level security;
alter table leads              enable row level security;
alter table mot_tests          enable row level security;
alter table photos             enable row level security;
alter table enrichments        enable row level security;
alter table provenance_checks  enable row level security;
alter table offers             enable row level security;
alter table conversations      enable row level security;
alter table comparables        enable row level security;
alter table settings           enable row level security;
alter table audit_log          enable row level security;
alter table api_rate_limits    enable row level security;

-- Defence in depth: even with RLS enabled, remove table privileges from
-- the browser-facing roles so a future permissive policy cannot
-- accidentally expose a table that was never meant to be readable.

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- Consequence for Phase C: Supabase normally grants select/insert/update
-- on public tables to `authenticated`. The revoke above removes that, so
-- adding a policy alone will NOT be enough — the Phase C migration must
-- also issue an explicit `grant` on the specific tables /admin needs.
-- That is the intended shape: a table is reachable only when someone
-- grants it and writes a policy for it, never by default.
