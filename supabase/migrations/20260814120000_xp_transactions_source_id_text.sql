-- xp_transactions.source_id was created as uuid, which only allows single
-- UUID keys. Awarding XP  for recurring quests needs a composite idempotency
-- key like "<quest_uuid>:<period_key>" (so a quest can pay out again each new
-- day/week/month), which cannot fit a uuid column — the insert failed at the
-- Postgres layer and the error was swallowed by awardXp's caller, so quest XP
-- was never persisted and reset on browser refresh.
--
-- Widen the column to text. All existing values are already valid (they come
-- from real row uuids or are NULL), so a plain cast is safe and preserves the
-- data. Idempotency lookups in awardXp filter on user_id + source_type +
-- source_id, which works identically against a text column.
alter table public.xp_transactions
  alter column source_id type text using source_id::text;