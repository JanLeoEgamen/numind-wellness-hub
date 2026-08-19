-- USER PREFERENCES ----------------------------------------------------
-- Stores every Setting page preference as one row per user. Mirrors the
-- RLS + grants pattern used by the other user-owned tables so the page
-- can read/write its own row through the normal authenticated client.

create table public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Appearance
  theme text not null default 'light' check (theme in ('light','dark','system')),
  font_scale int not null default 100 check (font_scale between 80 and 140),
  reduce_motion boolean not null default false,
  high_contrast boolean not null default false,
  -- Notifications
  daily_reset_reminder boolean not null default true,
  streak_nudges boolean not null default true,
  garden_rewards boolean not null default true,
  community_activity boolean not null default false,
  reminder_time text not null default 'Morning' check (reminder_time in ('Morning','Afternoon','Evening','Custom')),
  -- Privacy
  private_journal boolean not null default true,
  -- AI
  numi_personalization boolean not null default true,
  numi_memory boolean not null default true,
  -- Community
  show_nickname boolean not null default true,
  appear_in_milestones boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;
alter table public.user_preferences enable row level security;
create policy "read own preferences" on public.user_preferences for select to authenticated using (auth.uid() = id);
create policy "insert own preferences" on public.user_preferences for insert to authenticated with check (auth.uid() = id);
create policy "update own preferences" on public.user_preferences for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "delete own preferences" on public.user_preferences for delete to authenticated using (auth.uid() = id);
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create index user_preferences_theme_idx on public.user_preferences (theme);

-- Signup: seed a default preferences row so reads never need to coalesce.
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

  return new;
end; $$;