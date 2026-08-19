-- FOCUS ZONE: daily focus plans + richer focus sessions
-- -----------------------------------------------------------------------------
-- 1) focus_plans — one row per (user, day) holding the day's Top 3, brain dump
--    and the persisted task checklist, so the Focus Zone survives a refresh.
-- 2) focus_sessions gains `notes` and `distractions` so each completed sprint
--    records what was worked on and how the session actually went.

-- ============================================================================
-- 1) Daily focus plans
-- ============================================================================
create table public.focus_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  top_3 jsonb not null default '[]'::jsonb,
  brain_dump text,
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

grant select, insert, update, delete on public.focus_plans to authenticated;
grant all on public.focus_plans to service_role;
alter table public.focus_plans enable row level security;
create policy "own rows focus_plans" on public.focus_plans
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index focus_plans_user_date_idx on public.focus_plans (user_id, date desc);
create trigger focus_plans_updated_at before update on public.focus_plans
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2) Richer focus sessions
-- ============================================================================
alter table public.focus_sessions add column notes text;
alter table public.focus_sessions add column distractions int not null default 0;
