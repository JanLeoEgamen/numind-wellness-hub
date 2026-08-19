-- REWARDS MARKETPLACE ------------------------------------------------
-- 1) Add the "Relaxation Content" reward type to match the marketplace spec
--    (README §32) and seed the matching Deep Rest Soundscape reward.
-- 2) Fix the admin dashboard "rewards redeemed" metric to count real
--    redemptions (user_rewards) instead of a source_type that was never written.

-- The reward_type check constraint is auto-named; find and drop it robustly.
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.rewards'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%reward_type%';
  if cname is not null then
    execute format('alter table public.rewards drop constraint %I', cname);
  end if;
end $$;

alter table public.rewards
  add constraint rewards_reward_type_check
  check (reward_type in ('garden_decoration','numi_accessory','theme','avatar_accessory','badge_frame','sticker','seasonal','relaxation_content'));

insert into public.rewards (slug, name, description, reward_type, emoji, xp_cost, unlock_level)
values ('reward-deep-rest', 'Deep Rest Soundscape', 'A calm soundscape for better sleep.', 'relaxation_content', '🌙', 800, 4)
on conflict (slug) do nothing;

-- Admin analytics: rewardsRedeemed30d should count actual redemptions.
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
  from public.user_rewards where unlocked_at >= now() - interval '30 days';

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
