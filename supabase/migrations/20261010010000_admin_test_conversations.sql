-- Conversations started by an admin to test voice while Maya is off.
--
-- Turning agent_enabled on in production to test a voice call would make
-- her live to anyone who loaded /valuation for the duration. This is the
-- alternative: a signed-in, allow-listed admin can open one conversation
-- while the switch stays false, and only that conversation is served.
--
-- The flag is on the row rather than inferred from anything, so it is
-- visible everywhere the conversation is: a transcript on a lead and a
-- blocked turn in /admin/review both say plainly that they came from a
-- test, and nothing counts them as seller activity.
alter table conversations add column admin_test boolean not null default false;

create index conversations_admin_test_idx on conversations (admin_test)
  where admin_test;
