
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('admin','moderator','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROFILES ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  nickname text,
  avatar text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  preferred_motivational_style text not null default 'gentle',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in users" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- CATALOG -------------------------------------------------------------
create table public.levels (
  id serial primary key,
  level_number int not null unique,
  name text not null,
  tagline text,
  xp_required int not null,
  emoji text,
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text,
  category text,
  criteria jsonb not null default '{}'::jsonb,
  xp_reward int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mind_gym_activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text not null,
  duration_minutes int not null default 3,
  difficulty text not null default 'easy',
  instructions jsonb not null default '[]'::jsonb,
  emoji text,
  xp_reward int not null default 10,
  premium_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text,
  quest_type text not null check (quest_type in ('daily','weekly','monthly','seasonal')),
  requirements jsonb not null default '{}'::jsonb,
  xp_reward int not null default 25,
  emoji text,
  start_date date,
  end_date date,
  premium_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  content_type text not null check (content_type in ('article','lesson','video','tip','quiz','challenge')),
  category text,
  duration_minutes int,
  media_url text,
  emoji text,
  xp_reward int not null default 15,
  premium_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garden_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  item_type text not null check (item_type in ('flower','tree','butterfly','bird','bench','fountain','path','decoration','seasonal')),
  emoji text,
  xp_cost int not null default 0,
  unlock_level int not null default 1,
  seasonal_tag text,
  premium_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  reward_type text not null check (reward_type in ('garden_decoration','numi_accessory','theme','avatar_accessory','badge_frame','sticker','seasonal')),
  emoji text,
  xp_cost int not null default 100,
  unlock_level int not null default 1,
  premium_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safety_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  country_code text not null default 'GLOBAL',
  region text,
  phone text,
  sms text,
  url text,
  hours text,
  priority int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  emoji text,
  price_monthly_cents int not null default 0,
  price_annual_cents int not null default 0,
  currency text not null default 'USD',
  features jsonb not null default '[]'::jsonb,
  popular boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['levels','badges','mind_gym_activities','quests','learning_content','garden_items','rewards','safety_resources','subscription_plans']
  loop
    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true);', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''));', t);
    if t <> 'levels' then
      execute format('create trigger %1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at();', t);
    end if;
  end loop;
end $$;

grant usage, select on sequence public.levels_id_seq to service_role;
