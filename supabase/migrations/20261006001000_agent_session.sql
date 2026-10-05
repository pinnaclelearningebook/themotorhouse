-- Session ownership for the agent endpoint.
--
-- /api/agent/* is reachable by anyone who can load /valuation, so a
-- conversation id alone cannot be the credential: ids leak, get logged,
-- and appear in screenshots. The server issues a random token per
-- conversation, keeps it here, and sets it in an httpOnly cookie. Every
-- tool call and every turn is checked against it, which is what
-- SESSION-PROMPTS.md means by "each validating the session belongs to
-- the lead".
--
-- turn_count is the cost ceiling. It lives on the row rather than in
-- memory because serverless instances do not share memory, and a counter
-- that resets when a container recycles is not a limit.

alter table conversations add column session_token text;
alter table conversations add column turn_count integer not null default 0;
alter table conversations add column vehicle_id uuid references vehicles (id) on delete set null;

-- A conversation can legitimately start before the lead exists: Maya
-- appears when the car is identified, the lead is created at the phone
-- field (CLAUDE.md section 9). Notes buffer client-side until then.
alter table conversations alter column lead_id drop not null;

create index conversations_session_token_idx on conversations (session_token);
