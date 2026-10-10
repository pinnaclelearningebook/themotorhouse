-- The transcript ElevenLabs produces from the audio.
--
-- Kept beside our own rather than over the top of it. The `transcript`
-- column holds what passed the guards, written turn by turn as each one
-- was approved; this holds what their speech-to-text heard. They should
-- agree, and the interesting case is when they do not — a turn that was
-- blocked here but spoken there would be the single most important thing
-- to find out about, and that is only visible if both survive.
alter table conversations add column voice_transcript jsonb;
