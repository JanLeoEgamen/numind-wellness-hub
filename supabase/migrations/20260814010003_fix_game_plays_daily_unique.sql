-- game_plays: enforce one row per user per game per calendar day.
--
-- A unique constraint/index can only reference IMMUTABLE expressions, and
-- casting timestamptz to date is timezone-dependent (STABLE), so we key the
-- uniqueness on a dedicated played_date column (already in the 001 CREATE
-- TABLE; ensured here for any pre-existing table) rather than played_at::date.

-- Ensure the column exists (covers environments where 001's table already
-- existed without it).
alter table public.game_plays
  add column if not exists played_date date;

-- Backfill any existing rows from their timestamp (UTC calendar day).
update public.game_plays
  set played_date = (played_at at time zone 'utc')::date
  where played_date is null;

alter table public.game_plays
  alter column played_date set default current_date,
  alter column played_date set not null;

create unique index game_plays_user_game_day_idx
  on public.game_plays (user_id, game, played_date);
