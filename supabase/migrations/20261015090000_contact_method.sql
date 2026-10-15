-- The phone number moves from step 1 to step 4, and the seller chooses
-- how they want to be reached.
--
-- Until now the lead was created the moment a car was confirmed and a
-- number landed, so every row had someone to ring. The owner's decision
-- on 15 October 2026 moves all contact details to the final step: the
-- first step is now the registration alone, which is lever 4 in
-- CLAUDE.md section 4 taken seriously — one field, and nothing asked
-- for until the site has shown it knows the car.
--
-- The cost is that a row can now exist with nobody to ring. That is
-- what `furthest_step` is for: those rows are worth keeping as drop-off
-- data even though they are not leads anyone can act on, and the inbox
-- hides them by default.

create type contact_method as enum ('call', 'whatsapp', 'sms', 'email');

-- One statement per column. test/query-audit.test.ts reads the schema
-- straight out of these files with a regex that takes one `add column`
-- per `alter table`, so a combined statement would leave it unable to
-- see the rest — and it is the check that catches a query naming a
-- column nothing defines.

-- Null until step 4. A lead with a method has contact details.
alter table leads add column preferred_contact_method contact_method;

-- The furthest step the seller reached, so the funnel can be counted.
-- 2 is the floor, not 1: the row is only created once step 1 is done,
-- so a row that exists has by definition finished the first step and
-- is looking at the second. People who type a registration and leave
-- before confirming the car leave no row at all and cannot be counted
-- here — see the note on /admin.
alter table leads add column furthest_step smallint not null default 2
  constraint leads_furthest_step_range check (furthest_step between 2 and 4);

-- Set once, when step 4 submits. The difference between "reached the
-- last step" and "finished it".
alter table leads add column completed_at timestamptz;

comment on column leads.preferred_contact_method is
  'How the seller asked to be contacted. Null means step 4 was never submitted.';
comment on column leads.furthest_step is
  'Highest form step reached (2-4). Only ever raised, never lowered.';
comment on column leads.completed_at is
  'When step 4 submitted. Null means the lead is incomplete.';

-- The inbox filters on this constantly; the funnel counts group by it.
create index leads_furthest_step_idx on leads (furthest_step);
create index leads_completed_at_idx on leads (completed_at);

-- Existing rows all carry a phone number, because under the old flow
-- one was required before the row could exist. Any of them that also
-- has a name went all the way through, so they are completed; the rest
-- stopped somewhere after step 1 and we cannot now say where.
--
-- `updated_at` is the honest stand-in for a completion time we never
-- recorded. It is the last time anything about the lead changed, which
-- for a finished submission is the moment it finished.
update leads
set furthest_step = 4,
    completed_at = updated_at
where name is not null;

-- Deliberately not backfilled: preferred_contact_method stays null on
-- every historic lead. Nobody asked those sellers, and "call" is a
-- guess, not a record. The admin page says "not asked" for them rather
-- than showing a preference that was never given.
