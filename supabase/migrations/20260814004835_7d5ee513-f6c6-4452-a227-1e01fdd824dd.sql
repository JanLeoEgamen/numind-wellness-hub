
-- SIGNUP AUTOMATION ---------------------------------------------------
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- LEVELS ---------------------------------------------------------------
insert into public.levels (level_number, name, tagline, xp_required, emoji) values
  (1,'Explorer','Just getting started',0,'🌱'),
  (2,'Growing','Building the habit',500,'🌿'),
  (3,'Blooming','Finding your rhythm',1200,'🌷'),
  (4,'Thriving','Consistency unlocked',2200,'🌳'),
  (5,'Flourishing','Wellness is your default',3600,'🌺'),
  (6,'Wellness Champion','You inspire others',5500,'🏆');

-- BADGES ---------------------------------------------------------------
insert into public.badges (slug,name,description,emoji,category,xp_reward) values
  ('first-step','First Step','Completed your very first activity','👣','milestone',25),
  ('7-day-streak','7-Day Streak','Seven days in a row','🔥','streak',100),
  ('30-day-streak','30-Day Streak','A full month of showing up','🌟','streak',300),
  ('mindfulness-master','Mindfulness Master','50 Mind Gym sessions','🧘','mind_gym',150),
  ('focus-champion','Focus Champion','25 focus sessions completed','🎯','focus',150),
  ('journal-explorer','Journal Explorer','20 journal entries written','📓','journal',120),
  ('hydration-hero','Hydration Hero','Hit your water goal 14 days','💧','wellness',120),
  ('movement-master','Movement Master','Moved every day for two weeks','🏃','wellness',120),
  ('learning-legend','Learning Legend','Finished 15 lessons','📚','learning',150),
  ('quest-champion','Quest Champion','Completed 25 quests','🏆','quest',200);

-- MIND GYM -------------------------------------------------------------
insert into public.mind_gym_activities (slug,title,description,category,duration_minutes,difficulty,emoji,xp_reward,instructions,premium_required) values
  ('box-breathing','Box Breathing','Four counts in, hold, out, hold. Steady the nervous system.','breathe',3,'easy','🫁',20,'["Breathe in for 4","Hold for 4","Breathe out for 4","Hold for 4","Repeat 6 times"]',false),
  ('478-breath','4-7-8 Breath','A longer exhale to wind down before sleep.','breathe',4,'easy','🌙',20,'["Inhale 4","Hold 7","Exhale 8","Repeat 4 times"]',false),
  ('body-scan','Body Scan','Notice each part of the body without judgement.','ground',6,'medium','🧍',20,'["Start at your toes","Move slowly upward","Soften what feels tight"]',false),
  ('54321','5-4-3-2-1 Grounding','Come back to the present using your senses.','ground',3,'easy','🖐️',20,'["5 things you see","4 you feel","3 you hear","2 you smell","1 you taste"]',false),
  ('gratitude-pause','Gratitude Pause','Three small good things from today.','reflect',2,'easy','💛',20,'["Name three good things","Say why each mattered"]',false),
  ('thought-reframe','Thought Reframe','Turn a harsh thought into a kinder one.','reflect',5,'medium','🔄',20,'["Write the thought","Find the evidence","Write a kinder version"]',false),
  ('mindful-walk','Mindful Walk','A short walk with full attention.','move',10,'easy','🚶',20,'["Walk slowly","Feel each step","Notice the air"]',false),
  ('progressive-relax','Progressive Relaxation','Tense and release, muscle by muscle.','calm',8,'medium','💆',20,'["Tense for 5 seconds","Release","Move to the next muscle group"]',true),
  ('loving-kindness','Loving Kindness','Send warmth to yourself and others.','calm',7,'medium','🤍',20,'["May I be well","May you be well","May we all be well"]',true),
  ('focus-primer','Focus Primer','Prime your attention before deep work.','focus',3,'easy','🎯',20,'["One deep breath","Name the single next task","Set a 25 minute timer"]',false);

-- QUESTS ---------------------------------------------------------------
insert into public.quests (slug,title,description,category,quest_type,xp_reward,emoji,requirements) values
  ('daily-reset','Complete your Daily Reset','One minute to set the tone.','ritual','daily',20,'🌞','{"action":"daily_reset","count":1}'),
  ('daily-breathe','Breathe once today','Any Mind Gym breathing activity.','mind_gym','daily',20,'🫁','{"action":"mind_gym","count":1}'),
  ('daily-water','Drink your water','Hit your hydration target.','wellness','daily',20,'💧','{"action":"habit_water","count":1}'),
  ('weekly-journal','Write three entries','Three journal entries this week.','journal','weekly',60,'📓','{"action":"journal","count":3}'),
  ('weekly-focus','Five focus sessions','Protect your deep work time.','focus','weekly',75,'🎯','{"action":"focus_session","count":5}'),
  ('monthly-garden','Grow your garden','Unlock three new garden items.','garden','monthly',150,'🌳','{"action":"garden_item","count":3}'),
  ('seasonal-bloom','Spring Bloom Challenge','Complete 20 activities this season.','seasonal','seasonal',400,'🌸','{"action":"any","count":20}');

-- LEARNING -------------------------------------------------------------
insert into public.learning_content (slug,title,summary,content_type,category,duration_minutes,emoji,xp_reward) values
  ('why-sleep-matters','Why Sleep Matters','How rest quietly powers your mood and focus.','article','sleep',5,'😴',30),
  ('stress-basics','The Stress Response, Simply','What happens in your body and how to settle it.','lesson','stress',7,'🌊',30),
  ('build-a-habit','How Habits Actually Form','Small, repeatable, forgiving.','lesson','habits',6,'🔁',30),
  ('two-minute-rule','The Two-Minute Rule','A tip for days with no energy.','tip','focus',2,'⏱️',15),
  ('focus-deep-dive','Deep Work for Busy Minds','A short video on protecting attention.','video','focus',9,'🎬',30),
  ('mood-quiz','What Lifts Your Mood?','A quick quiz to learn your patterns.','quiz','self_awareness',4,'❓',20),
  ('kindness-challenge','7 Days of Self-Kindness','A gentle week-long challenge.','challenge','self_care',7,'🤍',60);

-- GARDEN ITEMS ---------------------------------------------------------
insert into public.garden_items (slug,name,description,item_type,emoji,xp_cost,unlock_level,seasonal_tag) values
  ('daisy','Daisy','A cheerful first bloom.','flower','🌼',0,1,null),
  ('tulip','Tulip','Soft colour for early growth.','flower','🌷',100,1,null),
  ('sunflower','Sunflower','Turns toward the light.','flower','🌻',200,2,null),
  ('young-tree','Young Tree','Roots taking hold.','tree','🌲',300,2,null),
  ('blossom-tree','Blossom Tree','A season of flowering.','tree','🌸',600,3,'spring'),
  ('butterfly','Butterfly','Visits gardens that are cared for.','butterfly','🦋',250,2,null),
  ('songbird','Songbird','A small morning song.','bird','🐦',350,3,null),
  ('garden-bench','Garden Bench','Somewhere to rest.','bench','🪑',400,3,null),
  ('fountain','Fountain','Gentle running water.','fountain','⛲',800,4,null),
  ('stone-path','Stone Path','Connects your favourite spots.','path','🪨',300,3,null),
  ('lantern','Lantern','Warm light after dark.','decoration','🏮',450,4,null),
  ('snow-pine','Snow Pine','A winter visitor.','seasonal','🎄',500,4,'winter');

-- REWARDS --------------------------------------------------------------
insert into public.rewards (slug,name,description,reward_type,emoji,xp_cost,unlock_level) values
  ('reward-fairy-lights','Fairy Lights','Twinkling lights for your garden.','garden_decoration','✨',300,2),
  ('reward-numi-scarf','Numi''s Scarf','A cosy scarf for your companion.','numi_accessory','🧣',250,2),
  ('reward-numi-glasses','Numi''s Glasses','Studious Numi.','numi_accessory','🤓',250,2),
  ('reward-sunset-theme','Sunset Theme','Warm dusk colours for the app.','theme','🌇',600,3),
  ('reward-forest-theme','Forest Theme','Deep greens and calm.','theme','🌲',600,3),
  ('reward-flower-crown','Flower Crown','For your avatar.','avatar_accessory','👑',400,3),
  ('reward-gold-frame','Gold Badge Frame','Show off your badges.','badge_frame','🥇',750,4),
  ('reward-sticker-pack','Encouragement Stickers','A pack of kind stickers.','sticker','🌈',150,1),
  ('reward-spring-set','Spring Set','Seasonal decorations.','seasonal','🌸',900,4);

-- SAFETY ---------------------------------------------------------------
insert into public.safety_resources (name,description,country_code,phone,sms,url,hours,priority) values
  ('International Association for Suicide Prevention','Find a crisis centre anywhere in the world.','GLOBAL',null,null,'https://www.iasp.info/resources/Crisis_Centres/','24/7',1),
  ('988 Suicide & Crisis Lifeline','Free, confidential support in the US.','US','988','988','https://988lifeline.org','24/7',2),
  ('Samaritans','Free listening support in the UK and Ireland.','GB','116123',null,'https://www.samaritans.org','24/7',3),
  ('Lifeline Australia','Crisis support and suicide prevention.','AU','131114',null,'https://www.lifeline.org.au','24/7',4),
  ('NCMH Crisis Hotline','Philippines national crisis hotline.','PH','1553',null,'https://ncmh.gov.ph','24/7',5);

-- PLANS ----------------------------------------------------------------
insert into public.subscription_plans (slug,name,tagline,emoji,price_monthly_cents,price_annual_cents,features,popular,sort_order) values
  ('free','Free','Everything you need to start','🌱',0,0,'["Daily Reset","Core Mind Gym activities","Journal","Wellness Garden","Daily quests"]',false,1),
  ('plus','NuMind Plus','For everyday growth','🌷',799,6900,'["Everything in Free","Full Mind Gym library","Numi conversations","Weekly & monthly quests","All themes"]',true,2),
  ('champion','Wellness Champion','The whole garden','🏆',1499,12900,'["Everything in Plus","Seasonal challenges","Premium rewards","Monthly Journey report","Early access features"]',false,3);
