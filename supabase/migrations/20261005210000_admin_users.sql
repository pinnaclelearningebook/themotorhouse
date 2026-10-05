-- Admin access control.
--
-- The Phase B RLS migration deliberately shipped deny-all with no
-- policies, and said why: Supabase magic-link auth issues a session to
-- ANY email that asks for one, so `to authenticated using (true)` would
-- expose every lead's name, phone and postcode through the public REST
-- API. It also noted that a later grant would be required, because that
-- migration revoked table privileges from `authenticated`.
--
-- This is that migration. Access is gated on membership of admin_users,
-- which the database can read — unlike the ADMIN_ALLOWLIST env var,
-- which it cannot.

create table admin_users (
  email       text primary key,
  added_at    timestamptz not null default now(),
  added_by    text
);

alter table admin_users enable row level security;

-- Is the caller's JWT email on the list? Security definer so the policy
-- can read admin_users while admin_users is itself locked down.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Privileges first: the Phase B revoke means a policy alone is not
-- enough. Grant, then gate with the policy.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  leads, vehicles, mot_tests, photos, enrichments, provenance_checks,
  offers, conversations, comparables, settings, audit_log
  to authenticated;
grant select on admin_users to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'leads','vehicles','mot_tests','photos','enrichments',
    'provenance_checks','offers','conversations','comparables',
    'settings','audit_log'
  ]
  loop
    execute format(
      'create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())',
      t || '_admin_only', t
    );
  end loop;
end $$;

-- An admin may read the list; only the service role may change it, so a
-- compromised admin session cannot add accomplices.
create policy admin_users_readable_by_admins
  on admin_users for select to authenticated using (is_admin());
