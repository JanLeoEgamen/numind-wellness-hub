-- SUBSCRIPTION ACCESS --------------------------------------------------------
-- Pricing is the basis for access.
--   1) Every account starts on the Free plan (and existing users are backfilled)
--      so the "current plan" is canonical in the database.
--   2) Weekly / monthly / seasonal quests are premium content (matching the
--      NuMind Plus and Champion plan copy).
--   3) At most one active/trialing subscription may exist per user, so an
--      upgrade atomically replaces the previous plan (single active row).
--
-- Safe to re-run: every statement is idempotent (on-conflict/guarded).

-- 1) Free plan is the default entitlement at signup ------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare g_id uuid;
begin
  insert into public.profiles (id, first_name, last_name, nickname, avatar)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'first_name',''),
    nullif(new.raw_user_meta_data->>'last_name',''),
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''), split_part(new.email,'@',1)),
    coalesce(nullif(new.raw_user_meta_data->>'avatar',''),'🌷')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;

  insert into public.user_preferences (id) values (new.id) on conflict (id) do nothing;

  insert into public.gardens (user_id) values (new.id)
  on conflict (user_id) do nothing
  returning id into g_id;

  insert into public.wellness_habits (user_id, habit_type, title, target_value, unit, emoji)
  values
    (new.id,'water','Water',8,'glasses','💧'),
    (new.id,'sleep','Sleep',8,'hours','😴'),
    (new.id,'movement','Movement',30,'minutes','🏃'),
    (new.id,'healthy_eating','Healthy Eating',3,'meals','🥗'),
    (new.id,'mindfulness','Mindfulness',10,'minutes','🧘'),
    (new.id,'self_care','Self-Care',1,'count','🛁'),
    (new.id,'outdoor_time','Outdoor Time',20,'minutes','🌤️')
  on conflict (user_id, habit_type) do nothing;

  insert into public.notifications (user_id, type, title, message, emoji)
  values (new.id,'welcome','Welcome to NuMind 🌱','Plant your first seed with today''s Daily Reset.','🌱');

  insert into public.subscriptions (user_id, plan_id)
  select new.id, p.id
  from public.subscription_plans p
  where p.slug = 'free' and p.active
  on conflict do nothing;

  return new;
end; $$;

-- Backfill accounts created before the Free default so the admin panel and the
-- entitlement resolver always see a plan row for every user.
insert into public.subscriptions (user_id, plan_id)
select u.id, p.id
from auth.users u
cross join public.subscription_plans p
where p.slug = 'free' and p.active
  and not exists (select 1 from public.subscriptions s where s.user_id = u.id);

-- 2) Weekly, monthly and seasonal quests are premium ------------------------
update public.quests
set premium_required = true
where quest_type in ('weekly','monthly','seasonal')
  and premium_required = false;

-- 3) Single active plan per user -------------------------------------------
-- Idempotently end all but the newest active/trialing subscription per user so
-- the unique partial index below can be created safely.
with ranked as (
  select id,
         row_number() over (partition by user_id order by created_at desc, started_at desc) as rn
  from public.subscriptions
  where status in ('active','trialing')
)
update public.subscriptions s
set status = 'expired'
where s.status in ('active','trialing')
  and exists (select 1 from ranked r where r.id = s.id and r.rn > 1);

-- Upgrades swap plans atomically: one active row per user at any time.
create unique index if not exists subscriptions_one_active_idx
  on public.subscriptions (user_id)
  where status in ('active','trialing');
