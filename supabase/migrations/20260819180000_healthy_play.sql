-- HEALTHY PLAY --------------------------------------------------------
-- 1) Give each catalogue game its own XP reward (the UI previously hardcoded
--    +20 / +30 locally and never read this table).
-- 2) Seed the full Healthy Play catalog so the page runs off real rows.
--    Slugs mirror the mock activity ids so the existing interactive modals
--    (trivia, bubble, match, bingo, wheel, senses) keep working.

alter table public.games add column if not exists xp_reward int not null default 20;

insert into public.games (slug, name, description, emoji, category, instructions, xp_reward, premium_required, sort_order, active) values
  ('trivia', 'Wellness Trivia', 'Five quick questions, real answers.', '🧩', 'trivia', '["Answer five questions","Learn something new","Earn your XP"]', 20, false, 5, true),
  ('myth', 'Myth or Fact', 'Bust a few wellness myths.', '🤔', 'trivia', '["Read each claim","Pick myth or fact","See the real answer"]', 20, false, 6, true),
  ('bubble', 'Breathing Bubble', 'Breathe with the bubble.', '🫧', 'breathe', '["Follow the bubble","Inhale as it grows","Exhale as it shrinks"]', 20, false, 7, true),
  ('match', 'Focus Match', 'A gentle memory game.', '🃏', 'memory', '["Flip two cards","Match the pairs","Beat your best time"]', 20, false, 8, true),
  ('bingo', 'Healthy Habit Bingo', 'Fill a row of good days.', '🎟', 'achievement', '["Pick your habits","Mark each win","Fill a line"]', 30, false, 9, true),
  ('wheel', 'Wellness Wheel', 'Spin for today''s micro-challenge.', '🎡', 'activity', '["Give it a spin","Take on the challenge","Come back tomorrow"]', 20, false, 10, true),
  ('senses', '5-Senses Grounding', 'Come back to the room.', '🖐', 'mindfulness', '["Name what you see","Feel what''s around you","Hear the room"]', 20, false, 11, true),
  ('hunt', 'Gratitude Hunt', 'Find five small good things.', '🔎', 'gratitude', '["Spot five good things","Hold each in mind","Notice the shift"]', 20, false, 12, true),
  ('steps', 'Step Challenge', 'Beat yesterday by 500 steps.', '👟', 'movement', '["Check your steps","Set a gentle target","Move a little more"]', 20, false, 13, true),
  ('sleep', 'Sleep Wind-Down', 'A calm bedtime sequence.', '🌙', 'rest', '["Dim the lights","Slow your breath","Settle in"]', 20, false, 14, true),
  ('food', 'Food Balance Challenge', 'Build a balanced plate.', '🥗', 'nutrition', '["Choose your plate","Balance the groups","Enjoy mindfully"]', 20, false, 15, true),
  ('mood', 'Mood Color Game', 'Paint how today feels.', '🎨', 'self-care', '["Pick today''s color","Name the feeling","Let it pass"]', 20, false, 16, true),
  ('kindness', 'Kindness Quest', 'One small kind act.', '💚', 'kindness', '["Pick a kind act","Do it today","Notice the ripple"]', 20, false, 17, true),
  ('brain-break', 'Brain Break', 'Sixty seconds of nothing.', '🧠', 'rest', '["Free your mind","Breathe slowly","Let it be"]', 20, false, 18, true),
  ('sprint', 'Focus Sprint', 'Race the timer, gently.', '⚡', 'focus', '["Set a tiny timer","Go all in","Rest afterwards"]', 20, false, 19, true),
  ('streak', 'Habit Streak Challenge', 'Keep one habit alive 7 days.', '🔥', 'achievement', '["Pick one habit","Show up daily","Watch the streak grow"]', 30, false, 20, true),
  ('outdoor', 'Outdoor Quest', 'Find three things outside.', '🌳', 'nature', '["Step outside","Spot three things","Take a breath of air"]', 20, false, 21, true),
  ('numi', 'Numi Challenge of the Day', 'Numi picks something fun.', '🤖', 'community', '["Ask Numi for a challenge","Try it today","Share your win"]', 30, true, 22, true)
on conflict (slug) do nothing;
