-- Actual money, as distinct from projected money.
--
-- The pipeline shows a per-car P&L (CLAUDE.md section 12). Nothing in the
-- schema could support one honestly: `enrichments` holds projections from
-- the decision engine, and `offers` holds what we offered. Neither is
-- what a car actually cost or actually fetched.
--
-- Computing a "P&L" from projected landed costs would produce a figure
-- that looks realised and is not — the same failure mode as seeding
-- invented landed-cost constants, which the settings seed refuses to do.
-- So actuals get their own storage, and the dashboard shows projected and
-- actual as different things with different labels.
--
-- Purchase price is deliberately NOT stored here. It is the accepted
-- offer, read from `offers`, because the brand promise is that the offer
-- does not change — a second, editable copy of the purchase price is a
-- place for those two numbers to silently disagree.

create table car_costs (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads (id) on delete cascade,
  -- Free text rather than an enum: the cost lines that matter vary by
  -- car and by channel, and an enum would be guessing at them now.
  kind         text not null,
  amount       integer not null,
  incurred_on  date,
  note         text,
  logged_by    text,
  logged_at    timestamptz not null default now()
);

create index car_costs_lead_idx on car_costs (lead_id);

-- Proceeds live on the lead: one sale per car.
alter table leads add column sold_price integer;
alter table leads add column sold_on    date;

-- Same access rule as everything else: admins only, enforced by the
-- database and not only by the application (see 20261005210000).
alter table car_costs enable row level security;

grant select, insert, update, delete on car_costs to authenticated;

create policy car_costs_admin_only
  on car_costs for all to authenticated
  using (is_admin()) with check (is_admin());
