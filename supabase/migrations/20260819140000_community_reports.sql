-- Together: user-facing post reports feed the existing admin moderation flow,
-- and a real (non-fabricated) community aggregate powers the Community Challenges.

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'other',
  details text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.community_reports enable row level security;
create policy "reporters insert reports" on public.community_reports
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "reporters read own reports" on public.community_reports
  for select to authenticated using (auth.uid() = reporter_id);
create policy "moderators read all reports" on public.community_reports
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));
create policy "moderators manage reports" on public.community_reports
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

grant select, insert on public.community_reports to authenticated;
grant all on public.community_reports to service_role;

create index community_reports_post_idx on public.community_reports (post_id);
create index community_reports_status_idx on public.community_reports (status);

-- Real community-wide totals (across all users) for the Together challenges.
-- Security definer so members can see shared aggregates without exposing rows.
create or replace function public.community_progress()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'totalFocusMinutes', coalesce((select sum(duration_minutes) from public.focus_sessions where status = 'completed'), 0),
    'totalResets', coalesce((select count(*) from public.daily_resets where completed), 0),
    'totalGardenItems', coalesce((select count(*) from public.user_garden_items), 0),
    'totalJournals', coalesce((select count(*) from public.journal_entries), 0)
  );
$$;
grant execute on function public.community_progress() to authenticated;