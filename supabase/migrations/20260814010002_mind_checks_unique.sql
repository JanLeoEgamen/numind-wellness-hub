-- Make mind_checks one row per user per day.
--
-- The Daily Reset page has three reflections (Mood / Worry / Focus) that all
-- share a single day's row and a single XP award. Enforcing a unique
-- (user_id, date) lets the server upsert atomically instead of
-- read-then-insert/update (which could create duplicate rows under racy saves).

-- Defensive dedupe: the feature is new, but fold any stray duplicates into the
-- newest row before adding the constraint so the migration never fails.
delete from public.mind_checks a
using public.mind_checks b
where a.id < b.id
  and a.user_id = b.user_id
  and a.date = b.date;

alter table public.mind_checks
  add constraint mind_checks_user_date_key unique (user_id, date);