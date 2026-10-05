-- The virtual employee: blocked turns, and the switches that govern her.
--
-- ARCHITECTURE.md section 6: "A blocked turn is logged with the original
-- text for weekly review." The original is the point. A guard that only
-- recorded that it fired would tell us the system works; keeping what the
-- model actually tried to say is what tells us how it fails, and that is
-- the input to every later change to agent/prompt.md and agent/guards.ts.
--
-- lead_id is nullable on purpose. Maya appears once the car is identified,
-- which is before the phone field creates the lead (CLAUDE.md section 9),
-- so a turn can legitimately be blocked while no lead exists yet.

create table agent_blocks (
  id               uuid primary key default gen_random_uuid(),
  at               timestamptz not null default now(),
  lead_id          uuid references leads (id) on delete set null,
  conversation_id  uuid references conversations (id) on delete set null,
  -- Which guard fired: price, frequency, urgency, internal,
  -- contact-details, unsupported-car-fact.
  rule             text not null,
  -- The fragment that tripped it.
  matched          text,
  -- What the model wrote. Never sent to the seller.
  original         text not null,
  -- What the seller received instead.
  replacement      text not null,
  reviewed_at      timestamptz,
  reviewed_by      text
);

create index agent_blocks_at_idx on agent_blocks (at desc);
create index agent_blocks_rule_idx on agent_blocks (rule);

alter table agent_blocks enable row level security;

grant select, insert, update, delete on agent_blocks to authenticated;

create policy agent_blocks_admin_only
  on agent_blocks for all to authenticated
  using (is_admin()) with check (is_admin());
