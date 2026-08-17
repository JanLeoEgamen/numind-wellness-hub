-- Healthy Play: persist each play session so plays are tracked and XP is
-- awarded at most once per game per day. The per-day uniqueness key
-- (played_date) is maintained in follow-up migration 20260814010003.
create table if not exists public.game_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  played_at timestamptz not null default now(),
  played_date date default current_date,
  played_count int not null default 1,
  xp_awarded int not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.game_plays to authenticated;
grant all on public.game_plays to service_role;
alter table public.game_plays enable row level security;
create policy "own rows game_plays" on public.game_plays
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index game_plays_user_idx on public.game_plays (user_id, played_at desc);