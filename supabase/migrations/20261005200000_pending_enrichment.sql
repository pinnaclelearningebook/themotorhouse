-- Enrichment is triggered directly from the step-4 server action, with
-- cron as the catch-up for anything that failed or was never triggered
-- (ARCHITECTURE.md section 9).
--
-- The flag is what cron sweeps. Default true so a lead is always picked
-- up even if the inline trigger never ran.

alter table leads
  add column pending_enrichment boolean not null default true;

create index leads_pending_enrichment_idx
  on leads (created_at)
  where pending_enrichment;
