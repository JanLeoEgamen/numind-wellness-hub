-- BACKFILL: habit-goal XP that was never banked before the per-day fix.
--
-- Background: habit goal rewards were keyed on the static habit id
-- (source_id = habit_id), so awardXp's idempotency check let a habit pay out
-- only once in the user's lifetime. Every later day's +20 was shown live
-- client-side but never written to xp_transactions, so it vanished on refresh.
--
-- This migration recomputes every (user, habit, date) whose logged total met
-- the habit's goal and inserts the missing +20 rows using the new per-day key
-- "<habit_id>:<date>", so they are counted going forward and match future
-- awards. It is idempotent — a day is skipped if it already has a transaction:
-- either the new per-day key, or an old (no-date) row created on that calendar
-- day (approximated in UTC).

insert into public.xp_transactions (user_id, amount, source_type, source_id, description, created_at)
select
  gd.user_id,
  20,
  'habit_goal',
  gd.habit_id::text || ':' || to_char(gd.log_date, 'YYYY-MM-DD'),
  'Habit goal reached',
  timezone('utc', gd.log_date::timestamp)
from (
  select
    l.user_id,
    l.habit_id,
    l.date as log_date,
    sum(l.value) as total_today,
    max(h.target_value) as goal
  from public.habit_logs l
  join public.wellness_habits h on h.id = l.habit_id
  group by l.user_id, l.habit_id, l.date
) gd
where gd.goal > 0
  and gd.total_today >= gd.goal
  and not exists (
    select 1
    from public.xp_transactions x
    where x.user_id = gd.user_id
      and x.source_type = 'habit_goal'
      and (
        x.source_id = gd.habit_id::text || ':' || to_char(gd.log_date, 'YYYY-MM-DD')
        or (
          x.source_id = gd.habit_id::text
          and (x.created_at at time zone 'utc')::date = gd.log_date
        )
      )
  );
