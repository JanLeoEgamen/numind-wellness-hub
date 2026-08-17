-- ADMIN BACKEND: analytics + management helpers + admin feature tables
-- -----------------------------------------------------------------------------
-- Extends 20260817120000_admin_backend.sql (admin user listing + first admin).
-- Adds admin-gated RPC functions and the admin content tables the dashboard
-- needs, plus admin RLS policies on the user-owned tables the backend reads.

-- ============================================================================
-- 1) Helper: is the current caller an admin? (sugar over public.has_role)
--    Security definer so non-owner roles can call it; it only inspects roles.
-- ============================================================================
create or replace function public.user_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin');
$$;
revoke all on function public.user_is_admin() from anon;
grant execute on function public.user_is_admin() to authenticated;

-- ============================================================================
-- 2) ANALYTICS OVERVIEW -------------------------------------------------------
--    Returns one jsonb of real, aggregated engagement metrics. Security definer
--    bypasses RLS but raises 'forbidden' unless the caller is an admin.
-- ============================================================================
create or replace function public.admin_analytics_overview()
returns jsonb
language plpgsql stable security definer set search_path = public, auth
as $$
declare
  result jsonb;
  v_total_users bigint;
  v_active_today bigint;
  v_active_7d bigint;
  v_active_30d bigint;
  v_resets_today bigint;
  v_reset_users_today bigint;
  v_mind_gym_30d bigint;
  v_focus_30d bigint;
  v_journal_30d bigint;
  v_journal_users_30d bigint;
  v_lessons_30d bigint;
  v_quests_30d bigint;
  v_num_convos_30d bigint;
  v_num_users_30d bigint;
  v_rewards_30d bigint;
  v_plays_30d bigint;
  v_play_users_30d bigint;
  v_xp_total bigint;
  v_sub_active bigint;
  v_sub_total bigint;
begin
  if not public.user_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into v_total_users from auth.users;

  select count(distinct user_id) into v_active_today
  from public.xp_transactions where created_at >= date_trunc('day', now());

  select count(distinct user_id) into v_active_7d
  from public.xp_transactions where created_at >= now() - interval '7 days';

  select count(distinct user_id) into v_active_30d
  from public.xp_transactions where created_at >= now() - interval '30 days';

  select count(*) into v_resets_today
  from public.daily_resets where completed = true and date = current_date;

  select count(distinct user_id) into v_reset_users_today
  from public.daily_resets where date = current_date;

  select count(*) into v_mind_gym_30d
  from public.mind_gym_completions where completed_at >= now() - interval '30 days';

  select count(*) into v_focus_30d
  from public.focus_sessions where status = 'completed' and completed_at >= now() - interval '30 days';

  select count(*), count(distinct user_id) into v_journal_30d, v_journal_users_30d
  from public.journal_entries where created_at >= now() - interval '30 days';

  select count(*) into v_lessons_30d
  from public.learning_progress where status = 'completed' and completed_at >= now() - interval '30 days';

  select count(*) into v_quests_30d
  from public.quest_completions where completed = true and completed_at >= now() - interval '30 days';

  select count(*), count(distinct user_id) into v_num_convos_30d, v_num_users_30d
  from public.ai_conversations where created_at >= now() - interval '30 days';

  select count(*) into v_rewards_30d
  from public.xp_transactions where source_type = 'reward' and created_at >= now() - interval '30 days';

  select count(*), count(distinct user_id) into v_plays_30d, v_play_users_30d
  from public.game_plays where played_at >= now() - interval '30 days';

  select coalesce(sum(amount), 0) into v_xp_total from public.xp_transactions;

  select count(*) filter (where status in ('active', 'trialing')), count(*)
  into v_sub_active, v_sub_total
  from public.subscriptions;

  result := jsonb_build_object(
    'totalUsers', v_total_users,
    'activeToday', v_active_today,
    'active7d', v_active_7d,
    'active30d', v_active_30d,
    'dailyResetsToday', v_resets_today,
    'resetCompletionPct',
      case when v_reset_users_today > 0
           then round((v_resets_today::numeric / v_reset_users_today) * 100, 1)
           else 0 end,
    'mindGymSessions30d', v_mind_gym_30d,
    'focusSessions30d', v_focus_30d,
    'journalEntries30d', v_journal_30d,
    'journalUsers30d', v_journal_users_30d,
    'lessonsCompleted30d', v_lessons_30d,
    'questsCompleted30d', v_quests_30d,
    'numiConversations30d', v_num_convos_30d,
    'numiUsers30d', v_num_users_30d,
    'rewardsRedeemed30d', v_rewards_30d,
    'healthyPlaySessions30d', v_plays_30d,
    'healthyPlayUsers30d', v_play_users_30d,
    'xpEarnedTotal', v_xp_total,
    'subscriptionsActive', v_sub_active,
    'subscriptionsTotal', v_sub_total
  );
  return result;
end;
$$;
revoke all on function public.admin_analytics_overview() from anon;
grant execute on function public.admin_analytics_overview() to authenticated;

-- ============================================================================
-- 3) USER DETAIL --------------------------------------------------------------
--    Returns profile + roles + XP + subscriptions + garden for one user.
-- ============================================================================
create or replace function public.admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, auth
as $$
declare
  result jsonb;
  v_roles text[];
  v_xp bigint;
begin
  if not public.user_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(array_agg(role::text order by role), '{}'::text[])
  into v_roles from public.user_roles where user_id = p_user_id;

  select coalesce(sum(amount), 0) into v_xp
  from public.xp_transactions where user_id = p_user_id;

  select jsonb_build_object(
    'user', (select row_to_json(x) from (select id, email, created_at from auth.users where id = p_user_id) x),
    'profile', (select row_to_json(x) from (select * from public.profiles where id = p_user_id) x),
    'roles', v_roles,
    'xpTotal', v_xp,
    'subscriptions', (select coalesce(jsonb_agg(row_to_json(x) order by x.started_at desc), '[]'::jsonb)
      from (select s.*, plan.name as plan_name, plan.slug as plan_slug, plan.price_monthly_cents
            from public.subscriptions s
            left join public.subscription_plans plan on plan.id = s.plan_id
            where s.user_id = p_user_id) x),
    'garden', (select row_to_json(x) from (select * from public.gardens where user_id = p_user_id) x)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_user_detail(uuid) from anon;
grant execute on function public.admin_user_detail(uuid) to authenticated;

-- ============================================================================
-- 4) ROLE MANAGEMENT ----------------------------------------------------------
-- ============================================================================
create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.user_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found';
  end if;
  insert into public.user_roles (user_id, role) values (p_user_id, p_role)
  on conflict (user_id, role) do nothing;
end;
$$;
revoke all on function public.admin_set_user_role(uuid, public.app_role) from anon;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

create or replace function public.admin_remove_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.user_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role = 'admin' and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'cannot remove the only admin';
  end if;
  delete from public.user_roles where user_id = p_user_id and role = p_role;
end;
$$;
revoke all on function public.admin_remove_user_role(uuid, public.app_role) from anon;
grant execute on function public.admin_remove_user_role(uuid, public.app_role) to authenticated;

-- ============================================================================
-- 5) NOTIFICATION BROADCAST ---------------------------------------------------
--    Insert a notification for one user, or for every user when p_user_id NULL.
-- ============================================================================
create or replace function public.admin_broadcast_notification(
  p_title text,
  p_message text default null,
  p_type text default 'general',
  p_emoji text default null,
  p_action_type text default null,
  p_action_id text default null,
  p_user_id uuid default null
)
returns integer
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_count integer;
begin
  if not public.user_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null then
    insert into public.notifications (user_id, type, title, message, emoji, action_type, action_id)
    select id, coalesce(p_type, 'general'), p_title, p_message, p_emoji, p_action_type, p_action_id
    from auth.users;
  else
    insert into public.notifications (user_id, type, title, message, emoji, action_type, action_id)
    values (p_user_id, coalesce(p_type, 'general'), p_title, p_message, p_emoji, p_action_type, p_action_id);
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.admin_broadcast_notification(text, text, text, text, text, text, uuid) from anon;
grant execute on function public.admin_broadcast_notification(text, text, text, text, text, text, uuid) to authenticated;

-- ============================================================================
-- 6) ADMIN CONTENT TABLES -----------------------------------------------------
--    Tables for the admin sections that had no backing table in Phase 1.
--    All are publicly readable catalogs; only admins can write.
-- ============================================================================
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  enabled boolean not null default true,
  rollout_pct int not null default 100 check (rollout_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text,
  palette jsonb not null default '{}'::jsonb,
  premium_required boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text,
  questions jsonb not null default '[]'::jsonb,
  xp_reward int not null default 20,
  premium_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.numi_prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  text text not null,
  category text,
  tone text not null default 'gentle',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasonal_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text,
  category text,
  instructions jsonb not null default '[]'::jsonb,
  preview_url text,
  premium_required boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
declare admin_catalog text[] := array['feature_flags','themes','quizzes','numi_prompts','seasonal_events','games'];
begin
  foreach t in array admin_catalog loop
    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true);', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''));', t);
    execute format('create trigger %1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- 7) ADMIN RLS ON EXISTING USER-OWNED TABLES ----------------------------------
--    The backend scopes queries to the caller (RLS). Admins additionally need
--    read (and targeted write) access across all users for management/analytics.
-- ============================================================================
create policy "admins read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "admins read subscriptions" on public.subscriptions
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins update subscriptions" on public.subscriptions
  for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "admins read all posts" on public.community_posts
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins update posts" on public.community_posts
  for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "admins read reactions" on public.community_reactions
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "admins read xp" on public.xp_transactions
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 8) SEED DATA ---------------------------------------------------------------
-- ============================================================================
insert into public.feature_flags (key, label, description, enabled, rollout_pct) values
  ('community', 'Together Community', 'Show the Together community feed.', true, 100),
  ('numi', 'Numi Companion', 'Enable the Numi AI companion.', true, 100),
  ('premium', 'Premium Tiers', 'Offer NuMind+ and Champion plans.', true, 100),
  ('seasonal_events', 'Seasonal Events', 'Show seasonal events and content.', true, 100),
  ('labs', 'Labs', 'Preview experimental features.', false, 0)
on conflict (key) do nothing;

insert into public.themes (slug, name, description, emoji, palette, premium_required, sort_order, active) values
  ('meadow', 'Meadow', 'Sunlit greens and soft blues.', '🌼', '{"accent":"#6BBF8A","bg":"#F4FAF3"}', false, 1, true),
  ('sunset', 'Sunset', 'Warm dusk colours.', '🌇', '{"accent":"#F2994A","bg":"#FFF4E6"}', true, 2, true),
  ('forest', 'Forest', 'Deep greens and calm.', '🌲', '{"accent":"#2F7D5C","bg":"#EAF3EE"}', true, 3, true),
  ('ocean', 'Ocean', 'Cool blues and teal.', '🌊', '{"accent":"#4A90D9","bg":"#EAF3FA"}', false, 4, true)
on conflict (slug) do nothing;

insert into public.games (slug, name, description, emoji, category, instructions, premium_required, sort_order, active) values
  ('memory-match', 'Memory Match', 'Flip cards to find matching pairs.', '🧠', 'memory', '["Flip two cards","Match the pairs","Beat your best time"]', false, 1, true),
  ('breath-bubble', 'Breath Bubble', 'Guide a bubble through a calm breath cycle.', '🌬', 'breathe', '["Follow the bubble","Inhale as it grows","Exhale as it shrinks"]', false, 2, true),
  ('word-find', 'Calm Word Find', 'Find soothing words hidden in a grid.', '🔍', 'words', '["Scan the grid","Find each calm word","Clear the board"]', false, 3, true),
  ('zen-sort', 'Zen Sort', 'Sort the tiles into a calmer order.', '🧘', 'sort', '["Arrange the tiles","Restore the balance","Enjoy the calm"]', true, 4, true)
on conflict (slug) do nothing;

insert into public.quizzes (slug, title, description, category, questions, xp_reward, active) values
  ('wellness-basics', 'Wellness Basics', 'Test your everyday wellness know-how.', 'learning', '[{"q":"How many minutes of mindful breathing is a good daily start?","options":["2","10","60"],"answer":1},{"q":"Which counts as a wellness win?","options":["Drinking a glass of water","Doing nothing","Skipping self-care"],"answer":0}]', 20, true)
on conflict (slug) do nothing;

insert into public.numi_prompts (slug, text, category, tone, active) values
  ('morning-checkin', 'How are you feeling this morning? Pick one word.', 'reflection', 'gentle', true),
  ('small-win', 'What was one small thing that went right today?', 'reflection', 'encouraging', true),
  ('breath-together', 'Let''s take three slow breaths together.', 'grounding', 'calm', true),
  ('gratitude', 'Name one thing you''re grateful for right now.', 'reflection', 'gentle', true),
  ('kind-to-self', 'What''s something kind you could tell yourself today?', 'reflection', 'encouraging', true)
on conflict (slug) do nothing;

insert into public.seasonal_events (slug, name, description, emoji, starts_at, ends_at, active) values
  ('spring-bloom', 'Spring Bloom', 'Celebrate the season of growth.', '🌸', '2026-03-20', '2026-06-20', true),
  ('summer-solstice', 'Summer Solstice', 'The longest, brightest day.', '🌞', '2026-06-21', '2026-09-22', true),
  ('autumn-harvest', 'Autumn Harvest', 'A season of gathering and reflection.', '🍂', '2026-09-23', '2026-12-20', true),
  ('winter-glow', 'Winter Glow', 'Warmth through the cold months.', '❄️', '2026-12-21', '2027-03-19', true)
on conflict (slug) do nothing;


