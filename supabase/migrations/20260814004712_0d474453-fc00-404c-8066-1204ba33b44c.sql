
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;

-- GOALS
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'wellbeing',
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  target_value numeric,
  current_value numeric not null default 0,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.daily_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  mood int check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  focus int check (focus between 1 and 5),
  sleep_rating int check (sleep_rating between 1 and 5),
  intention text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.wellness_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_type text not null check (habit_type in ('water','sleep','movement','healthy_eating','mindfulness','self_care','outdoor_time')),
  title text,
  target_value numeric not null default 1,
  unit text not null default 'count',
  emoji text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_type)
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.wellness_habits(id) on delete cascade,
  date date not null default current_date,
  value numeric not null default 1,
  note text,
  created_at timestamptz not null default now()
);

create table public.mind_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  mood int check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  stress int check (stress between 1 and 5),
  focus int check (focus between 1 and 5),
  note text,
  created_at timestamptz not null default now()
);

create table public.mind_gym_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.mind_gym_activities(id) on delete cascade,
  completed_at timestamptz not null default now(),
  duration_minutes int,
  xp_awarded int not null default 0
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text,
  duration_minutes int not null default 25,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  xp_awarded int not null default 0,
  created_at timestamptz not null default now()
);

create table public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  completed_at timestamptz,
  xp_awarded int not null default 0,
  period_key text not null default to_char(now(),'YYYY-MM-DD'),
  created_at timestamptz not null default now(),
  unique (user_id, quest_id, period_key)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null default '',
  journal_type text not null default 'free' check (journal_type in ('brain_dump','gratitude','todays_win','tomorrows_goal','letter_to_future_me','free')),
  mood_tag text,
  favorite boolean not null default false,
  private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.learning_content(id) on delete cascade,
  status text not null default 'started' check (status in ('started','completed')),
  progress_percent int not null default 0,
  xp_awarded int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, content_id)
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  source_type text not null,
  source_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table public.gardens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'My Wellness Garden',
  stage int not null default 1,
  growth_points int not null default 0,
  theme text not null default 'meadow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_garden_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garden_id uuid not null references public.gardens(id) on delete cascade,
  item_id uuid not null references public.garden_items(id) on delete cascade,
  placed boolean not null default true,
  position_x numeric,
  position_y numeric,
  unlocked_at timestamptz not null default now(),
  unique (garden_id, item_id)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null default 'milestone',
  title text not null,
  description text,
  source_type text,
  source_id uuid,
  emoji text,
  favorite boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  xp_spent int not null default 0,
  equipped boolean not null default false,
  unlocked_at timestamptz not null default now(),
  unique (user_id, reward_id)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Chat with Numi',
  last_message_at timestamptz not null default now(),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null check (memory_type in ('goal','preference','favorite_activity','motivational_preference','achievement')),
  content text not null,
  source_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  message text,
  emoji text,
  read boolean not null default false,
  action_type text,
  action_id text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('trialing','active','past_due','canceled','expired')),
  billing_period text not null default 'monthly' check (billing_period in ('monthly','annual')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  category text not null default 'win',
  emoji text,
  anonymous boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'heart',
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- OWNER-ONLY RLS + GRANTS + updated_at triggers
do $$
declare t text;
declare owned text[] := array['goals','daily_resets','wellness_habits','habit_logs','mind_checks','mind_gym_completions','focus_sessions','quest_completions','journal_entries','learning_progress','xp_transactions','user_badges','gardens','user_garden_items','memories','user_rewards','ai_conversations','ai_conversation_messages','ai_memories','notifications','subscriptions'];
declare with_updated text[] := array['goals','wellness_habits','journal_entries','gardens','ai_conversations','ai_memories','subscriptions','community_posts'];
begin
  foreach t in array owned loop
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "own rows %1$s" on public.%1$I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create index %1$s_user_id_idx on public.%1$I (user_id);', t);
  end loop;
  foreach t in array with_updated loop
    execute format('create trigger %1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

create index daily_resets_user_date_idx on public.daily_resets (user_id, date desc);
create index habit_logs_habit_date_idx on public.habit_logs (habit_id, date desc);
create index mind_checks_user_date_idx on public.mind_checks (user_id, date desc);
create index xp_transactions_user_created_idx on public.xp_transactions (user_id, created_at desc);
create index journal_entries_user_created_idx on public.journal_entries (user_id, created_at desc);
create index ai_messages_conversation_idx on public.ai_conversation_messages (conversation_id, created_at);
create index notifications_user_read_idx on public.notifications (user_id, read, created_at desc);

-- COMMUNITY
grant select, insert, update, delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;
alter table public.community_posts enable row level security;
create policy "members read posts" on public.community_posts for select to authenticated using (hidden = false or auth.uid() = user_id);
create policy "authors write posts" on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "authors update posts" on public.community_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authors delete posts" on public.community_posts for delete to authenticated using (auth.uid() = user_id);
create index community_posts_created_idx on public.community_posts (created_at desc);

grant select, insert, delete on public.community_reactions to authenticated;
grant all on public.community_reactions to service_role;
alter table public.community_reactions enable row level security;
create policy "members read reactions" on public.community_reactions for select to authenticated using (true);
create policy "own reactions insert" on public.community_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "own reactions delete" on public.community_reactions for delete to authenticated using (auth.uid() = user_id);
create index community_reactions_post_idx on public.community_reactions (post_id);

-- AUDIT
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;
create policy "admins read audit" on public.audit_events for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins write audit" on public.audit_events for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
