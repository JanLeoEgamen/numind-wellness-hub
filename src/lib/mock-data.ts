export type Level = {
  level: number;
  name: string;
  emoji: string;
};

export const LEVELS: Level[] = [
  { level: 1, name: "Explorer", emoji: "Sprout" },
  { level: 2, name: "Growing", emoji: "Sprout" },
  { level: 3, name: "Blooming", emoji: "Flower2" },
  { level: 4, name: "Thriving", emoji: "Trees" },
  { level: 5, name: "Flourishing", emoji: "Flower2" },
  { level: 6, name: "Wellness Champion", emoji: "Trophy" },
];

export const XP_REWARDS = {
  dailyReset: 20,
  mindGym: 20,
  journal: 20,
  focus: 20,
  lesson: 30,
  quest: 20,
  goal: 50,
  streak7: 100,
};

export const GARDEN_STAGES = [
  { emoji: "Sprout", name: "Seed", threshold: 0 },
  { emoji: "Sprout", name: "Sprout", threshold: 200 },
  { emoji: "Flower2", name: "Flower", threshold: 600 },
  { emoji: "Trees", name: "Tree", threshold: 1200 },
  { emoji: "Flower2", name: "Garden", threshold: 2000 },
  { emoji: "Home", name: "Wellness Sanctuary", threshold: 3200 },
];

export const USER = {
  name: "Sarah",
  nickname: "sarah_grows",
  avatar: "Flower2",
  joined: "March 2026",
  daysActive: 96,
};

export type JourneyTask = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  xp: number;
  to: string;
  tone: "teal" | "lavender" | "mint" | "sun" | "coral";
};

export const TODAYS_JOURNEY: JourneyTask[] = [
  {
    id: "reset",
    emoji: "Sun",
    title: "Daily Reset",
    description: "Take one minute for yourself.",
    xp: 20,
    to: "/app/reset",
    tone: "sun",
  },
  {
    id: "mindgym",
    emoji: "Brain",
    title: "Mind Gym",
    description: "Try a breathing exercise.",
    xp: 20,
    to: "/app/mind-gym",
    tone: "teal",
  },
  {
    id: "focus",
    emoji: "Zap",
    title: "Focus Sprint",
    description: "Get 15 minutes of focus.",
    xp: 20,
    to: "/app/focus",
    tone: "lavender",
  },
  {
    id: "hydration",
    emoji: "Droplets",
    title: "Hydration Quest",
    description: "Drink a glass of water.",
    xp: 20,
    to: "/app/wellness",
    tone: "mint",
  },
  {
    id: "win",
    emoji: "Sparkles",
    title: "Today's Win",
    description: "Write something you're proud of.",
    xp: 20,
    to: "/app/journal",
    tone: "coral",
  },
];

export const BADGES = [
  { id: "first-step", emoji: "Sprout", name: "First Step", desc: "Planted your first seed", earned: true },
  { id: "7-day", emoji: "Flame", name: "7-Day Streak", desc: "Showed up 7 days in a row", earned: true },
  { id: "mindful", emoji: "PersonStanding", name: "Mindfulness Master", desc: "25 Mind Gym sessions", earned: true },
  { id: "hydration", emoji: "Droplets", name: "Hydration Hero", desc: "8 glasses, 10 days", earned: true },
  { id: "writer", emoji: "BookOpen", name: "Storyteller", desc: "20 journal entries", earned: true },
  { id: "focus", emoji: "Zap", name: "Deep Focus", desc: "10 focus sprints", earned: false },
  { id: "gardener", emoji: "Trees", name: "Green Thumb", desc: "Reach Tree stage", earned: false },
  { id: "kind", emoji: "Heart", name: "Kindness Champion", desc: "10 acts of kindness", earned: false },
  { id: "scholar", emoji: "GraduationCap", name: "Curious Mind", desc: "15 lessons completed", earned: false },
  { id: "30-day", emoji: "Trophy", name: "30-Day Streak", desc: "A full month of showing up", earned: false },
];

export const MIND_GYM_CATEGORIES = [
  { id: "breathe", emoji: "Wind", name: "Breathe" },
  { id: "mindfulness", emoji: "PersonStanding", name: "Mindfulness" },
  { id: "focus", emoji: "Zap", name: "Focus" },
  { id: "gratitude", emoji: "Smile", name: "Gratitude" },
  { id: "motivation", emoji: "Target", name: "Motivation" },
  { id: "stress", emoji: "Sprout", name: "Stress Reset" },
  { id: "wind-down", emoji: "Moon", name: "Wind Down" },
  { id: "self-care", emoji: "Heart", name: "Self-Care" },
];

export type Activity = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  minutes: number;
  difficulty: "Easy" | "Gentle" | "Focused";
  xp: number;
  locked?: boolean;
  description: string;
};

export const MIND_GYM_ACTIVITIES: Activity[] = [
  { id: "breath-60", name: "60-Second Breathing", emoji: "Wind", category: "breathe", minutes: 1, difficulty: "Easy", xp: 20, description: "Slow your breath, settle your shoulders." },
  { id: "calm-2", name: "2-Minute Calm", emoji: "Sprout", category: "stress", minutes: 2, difficulty: "Easy", xp: 20, description: "A short reset for a busy moment." },
  { id: "focus-5", name: "5-Minute Focus Sprint", emoji: "Zap", category: "focus", minutes: 5, difficulty: "Focused", xp: 20, description: "Warm up your attention before deep work." },
  { id: "gratitude", name: "Gratitude Boost", emoji: "Smile", category: "gratitude", minutes: 2, difficulty: "Gentle", xp: 20, description: "Name three good things from today." },
  { id: "stretch", name: "Stretch Break", emoji: "PersonStanding", category: "self-care", minutes: 3, difficulty: "Easy", xp: 20, description: "Loosen up from head to toe." },
  { id: "reflection", name: "Positive Reflection", emoji: "Sparkles", category: "motivation", minutes: 3, difficulty: "Gentle", xp: 20, description: "Notice one thing you handled well." },
  { id: "wind-down", name: "Evening Wind Down", emoji: "Moon", category: "wind-down", minutes: 6, difficulty: "Gentle", xp: 20, description: "Ease into rest with a calm sequence." },
  { id: "body-scan", name: "Guided Body Scan", emoji: "PersonStanding", category: "mindfulness", minutes: 8, difficulty: "Gentle", xp: 30, locked: true, description: "A longer mindfulness journey. NuMind+" },
];

export const QUESTS = {
  daily: [
    { id: "q1", emoji: "Droplets", name: "Hydration Hero", desc: "Drink 8 glasses of water", xp: 20, progress: 5, goal: 8 },
    { id: "q2", emoji: "Footprints", name: "15-Minute Walk", desc: "Move your body outdoors", xp: 20, progress: 1, goal: 1 },
    { id: "q3", emoji: "Sun", name: "Go Outside", desc: "Get 10 minutes of daylight", xp: 20, progress: 0, goal: 1 },
    { id: "q4", emoji: "PersonStanding", name: "Mindfulness Minute", desc: "One minute of stillness", xp: 20, progress: 1, goal: 1 },
    { id: "q5", emoji: "Smile", name: "Gratitude Moment", desc: "Note one thing you're grateful for", xp: 20, progress: 0, goal: 1 },
  ],
  weekly: [
    { id: "w1", emoji: "Zap", name: "Focus Sprint x5", desc: "Five focus sessions this week", xp: 80, progress: 3, goal: 5 },
    { id: "w2", emoji: "BookOpen", name: "Learn Something", desc: "Finish 3 lessons", xp: 60, progress: 1, goal: 3 },
    { id: "w3", emoji: "Heart", name: "Do Something Kind", desc: "Two acts of kindness", xp: 60, progress: 2, goal: 2 },
  ],
  monthly: [
    { id: "m1", emoji: "Trees", name: "Grow Your Garden", desc: "Earn 800 Garden XP", xp: 200, progress: 540, goal: 800 },
    { id: "m2", emoji: "Flame", name: "20-Day Rhythm", desc: "20 Daily Resets this month", xp: 200, progress: 12, goal: 20 },
  ],
  seasonal: [
    { id: "s1", emoji: "Flower2", name: "Summer Sunrise", desc: "10 mornings outdoors", xp: 300, progress: 4, goal: 10 },
    { id: "s2", emoji: "Umbrella", name: "Slow Days Challenge", desc: "8 wind-down sessions", xp: 250, progress: 2, goal: 8 },
  ],
};

export const HABITS = [
  { id: "water", emoji: "Droplets", name: "Water", unit: "glasses", value: 5, goal: 8, tone: "cyan" },
  { id: "sleep", emoji: "Moon", name: "Sleep", unit: "hours", value: 7, goal: 7, tone: "lavender" },
  { id: "movement", emoji: "Footprints", name: "Movement", unit: "min", value: 20, goal: 30, tone: "mint" },
  { id: "eating", emoji: "Salad", name: "Healthy Eating", unit: "meals", value: 2, goal: 3, tone: "mint" },
  { id: "mindfulness", emoji: "PersonStanding", name: "Mindfulness", unit: "min", value: 5, goal: 5, tone: "teal" },
  { id: "selfcare", emoji: "Heart", name: "Self-Care", unit: "moments", value: 1, goal: 2, tone: "coral" },
  { id: "outdoor", emoji: "Sun", name: "Outdoor Time", unit: "min", value: 15, goal: 20, tone: "sun" },
];

export const JOURNAL_MODES = [
  { id: "brain-dump", emoji: "MessageSquareText", name: "Brain Dump", prompt: "Empty your head here. No structure needed." },
  { id: "gratitude", emoji: "Rainbow", name: "Gratitude", prompt: "What are three things you're grateful for today?" },
  { id: "win", emoji: "Sparkles", name: "Today's Win", prompt: "What's one thing you're proud of today?" },
  { id: "goal", emoji: "Target", name: "Tomorrow's Goal", prompt: "What's one thing that would make tomorrow good?" },
  { id: "letter", emoji: "Mail", name: "Letter to Future Me", prompt: "Dear future me..." },
  { id: "free", emoji: "BookOpen", name: "Free Journal", prompt: "Write whatever feels right." },
];

export const JOURNAL_ENTRIES = [
  { id: "j1", mode: "Today's Win", title: "Finished the presentation", excerpt: "I was nervous all week but I did it, and my hands only shook a little.", date: "Today", mood: "Good", favorite: true },
  { id: "j2", mode: "Gratitude", title: "Three good things", excerpt: "Cold brew, the walk by the river, my sister calling out of nowhere.", date: "Yesterday", mood: "Amazing", favorite: false },
  { id: "j3", mode: "Brain Dump", title: "Too many tabs open", excerpt: "Writing it all down helped. Most of it wasn't urgent after all.", date: "2 days ago", mood: "Okay", favorite: false },
  { id: "j4", mode: "Letter to Future Me", title: "Open in 3 months", excerpt: "Locked until Nov 14 — write a letter to open it later.", date: "5 days ago", mood: "Good", favorite: true },
  { id: "j5", mode: "Tomorrow's Goal", title: "Slow morning", excerpt: "No phone before coffee. Ten minutes on the balcony.", date: "1 week ago", mood: "Good", favorite: false },
];

export const MEMORIES = [
  { id: "m1", emoji: "Flame", title: "Your first streak was 3 days. You're now at 18!", date: "March 2026", tone: "coral" },
  { id: "m2", emoji: "PersonStanding", title: "You've completed 25 Mind Gym activities!", date: "April 2026", tone: "teal" },
  { id: "m3", emoji: "Sprout", title: "Six months ago you planted your first seed. Look at your garden today!", date: "March 2026", tone: "mint" },
  { id: "m4", emoji: "BookOpen", title: "Your 20th journal entry — the one about the river walk.", date: "May 2026", tone: "lavender" },
  { id: "m5", emoji: "Trophy", title: "You earned Mindfulness Master after a slow, steady month.", date: "June 2026", tone: "sun" },
];

export const LESSONS = [
  { id: "l1", emoji: "Brain", title: "Why your attention wanders", category: "Focus", minutes: 4, xp: 30, progress: 100, type: "Lesson" },
  { id: "l2", emoji: "Moon", title: "The 90-minute sleep cycle", category: "Sleep", minutes: 5, xp: 30, progress: 60, type: "Video" },
  { id: "l3", emoji: "Sprout", title: "Everyday stress, explained gently", category: "Everyday Stress", minutes: 6, xp: 30, progress: 0, type: "Lesson" },
  { id: "l4", emoji: "Smile", title: "Reframing without pretending", category: "Positive Mindset", minutes: 4, xp: 30, progress: 0, type: "Lesson" },
  { id: "l5", emoji: "Dumbbell", title: "Habit stacking in 3 steps", category: "Healthy Habits", minutes: 3, xp: 30, progress: 100, type: "Quick tip" },
  { id: "l6", emoji: "Target", title: "Plan a realistic day", category: "Productivity", minutes: 5, xp: 30, progress: 0, type: "Mini quiz" },
  { id: "l7", emoji: "Footprints", title: "Movement snacks", category: "Movement", minutes: 3, xp: 30, progress: 0, type: "Quick tip" },
  { id: "l8", emoji: "Heart", title: "Saying what you need", category: "Relationships", minutes: 6, xp: 30, progress: 0, type: "Lesson" },
  { id: "l9", emoji: "Sprout", title: "Small steps, compounding", category: "Personal Growth", minutes: 4, xp: 30, progress: 0, type: "Challenge" },
  { id: "l10", emoji: "PersonStanding", title: "Mindfulness without the myths", category: "Mindfulness", minutes: 5, xp: 30, progress: 0, type: "Lesson" },
];

export const PLAY_ACTIVITIES = [
  { id: "trivia", emoji: "Puzzle", name: "Wellness Trivia", desc: "Five quick questions, real answers.", xp: 20, playable: true },
  { id: "myth", emoji: "CircleQuestionMark", name: "Myth or Fact", desc: "Bust a few wellness myths.", xp: 20, playable: true },
  { id: "bubble", emoji: "Sparkles", name: "Breathing Bubble", desc: "Breathe with the bubble.", xp: 20, playable: true },
  { id: "match", emoji: "Sparkles", name: "Focus Match", desc: "A gentle memory game.", xp: 20, playable: true },
  { id: "bingo", emoji: "Ticket", name: "Healthy Habit Bingo", desc: "Fill a row of good days.", xp: 30, playable: true },
  { id: "wheel", emoji: "FerrisWheel", name: "Wellness Wheel", desc: "Spin for today's micro-challenge.", xp: 20, playable: true },
  { id: "senses", emoji: "Hand", name: "5-Senses Grounding", desc: "Come back to the room.", xp: 20, playable: true },
  { id: "hunt", emoji: "Search", name: "Gratitude Hunt", desc: "Find five small good things.", xp: 20 },
  { id: "steps", emoji: "Footprints", name: "Step Challenge", desc: "Beat yesterday by 500 steps.", xp: 20 },
  { id: "sleep", emoji: "Moon", name: "Sleep Wind-Down Game", desc: "A calm bedtime sequence.", xp: 20 },
  { id: "food", emoji: "Salad", name: "Food Balance Challenge", desc: "Build a balanced plate.", xp: 20 },
  { id: "mood", emoji: "Palette", name: "Mood Color Game", desc: "Paint how today feels.", xp: 20 },
  { id: "kindness", emoji: "Heart", name: "Kindness Quest", desc: "One small kind act.", xp: 20 },
  { id: "brain-break", emoji: "Brain", name: "Brain Break", desc: "Sixty seconds of nothing.", xp: 20 },
  { id: "sprint", emoji: "Zap", name: "Focus Sprint", desc: "Race the timer, gently.", xp: 20 },
  { id: "streak", emoji: "Flame", name: "Habit Streak Challenge", desc: "Keep one habit alive 7 days.", xp: 30 },
  { id: "outdoor", emoji: "Trees", name: "Outdoor Quest", desc: "Find three things outside.", xp: 20 },
  { id: "numi", emoji: "Bot", name: "Numi Challenge of the Day", desc: "Numi picks something fun.", xp: 30, locked: true },
];

export const REWARDS = [
  { id: "r1", emoji: "Flower2", name: "Cherry Blossom Tree", category: "Garden Decorations", cost: 400, owned: false, featured: true },
  { id: "r2", emoji: "Droplets", name: "Stone Fountain", category: "Garden Decorations", cost: 750, owned: false },
  { id: "r3", emoji: "Flower2", name: "Butterfly Flock", category: "Garden Decorations", cost: 250, owned: true },
  { id: "r4", emoji: "GraduationCap", name: "Numi's Top Hat", category: "Numi Accessories", cost: 300, owned: false },
  { id: "r5", emoji: "Glasses", name: "Numi Shades", category: "Numi Accessories", cost: 200, owned: true },
  { id: "r6", emoji: "MoonStar", name: "Midnight Theme", category: "Themes", cost: 600, owned: false, limited: true },
  { id: "r7", emoji: "Sunrise", name: "Sunrise Theme", category: "Themes", cost: 500, owned: false },
  { id: "r8", emoji: "Circle", name: "Avatar Cap", category: "Avatar Accessories", cost: 150, owned: true },
  { id: "r9", emoji: "Image", name: "Gold Badge Frame", category: "Badge Frames", cost: 450, owned: false },
  { id: "r10", emoji: "Sparkles", name: "Sparkle Sticker Pack", category: "Stickers", cost: 100, owned: true },
  { id: "r11", emoji: "Moon", name: "Deep Rest Soundscape", category: "Relaxation Content", cost: 800, owned: false },
  { id: "r12", emoji: "Gift", name: "Summer Seasonal Box", category: "Seasonal Items", cost: 900, owned: false, limited: true },
];

export const COMMUNITY_POSTS = [
  { id: "c1", author: "River", avatar: "Waves", text: "Day 30 of showing up. Some days it was just one breath. Still counts.", hearts: 128, claps: 44, stars: 61, tag: "Inspiration" },
  { id: "c2", author: "Mo", avatar: "Clover", text: "Left a coffee paid forward at my local place today. Small thing, big smile.", hearts: 210, claps: 96, stars: 33, tag: "Kindness" },
  { id: "c3", author: "Devi", avatar: "Flower2", text: "Finally slept 7 hours three nights in a row. My brain feels like mine again.", hearts: 88, claps: 25, stars: 40, tag: "Inspiration" },
  { id: "c4", author: "Jonas", avatar: "Bird", text: "Walked my neighbour's dog while she recovers from surgery. Best 20 minutes of my week.", hearts: 172, claps: 71, stars: 52, tag: "Kindness" },
];

export const NOTIFICATIONS = [
  { id: "n1", emoji: "Sun", title: "Your Daily Reset is ready.", time: "8:00 AM", unread: true, category: "Reset" },
  { id: "n2", emoji: "Flame", title: "Keep your streak alive!", time: "Yesterday", unread: true, category: "Streak" },
  { id: "n3", emoji: "Sprout", title: "Your garden is ready to grow.", time: "Yesterday", unread: true, category: "Garden" },
  { id: "n4", emoji: "Gift", title: "You've unlocked a reward.", time: "2 days ago", unread: false, category: "Rewards" },
  { id: "n5", emoji: "Flower2", title: "Numi found a memory for you.", time: "3 days ago", unread: false, category: "Memory Lane" },
  { id: "n6", emoji: "Zap", title: "Ready for a Focus Sprint?", time: "4 days ago", unread: false, category: "Focus" },
  { id: "n7", emoji: "Trophy", title: "A new Quest has started!", time: "1 week ago", unread: false, category: "Quest" },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    emoji: "Sprout",
    monthly: 0,
    annual: 0,
    tagline: "Start the habit.",
    features: ["Daily Reset", "Limited Mind Gym", "Basic Journal", "Limited Healthy Play"],
  },
  {
    id: "plus",
    name: "NuMind+",
    emoji: "Sprout",
    monthly: 9.99,
    annual: 89.99,
    tagline: "The full wellness routine.",
    popular: true,
    features: [
      "Full Mind Gym",
      "Healthy Play",
      "Wellness Quest",
      "Wellness Garden",
      "My Journal",
      "Learning Lounge",
      "Memory Lane",
      "Rewards",
    ],
  },
  {
    id: "premium",
    name: "NuMind Premium",
    emoji: "Flower2",
    monthly: 19.99,
    annual: 179.99,
    tagline: "Everything, plus Numi.",
    features: [
      "Everything in NuMind+",
      "Numi AI companion",
      "Advanced personalization",
      "Premium games & challenges",
      "Exclusive Garden content",
      "Premium themes",
      "Monthly Journey",
    ],
  },
];

export const FAQS = [
  { q: "Is NuMind a medical or healthcare app?", a: "No. NuMind is a consumer wellness and personal-growth app. It does not provide medical advice, diagnosis or treatment, and Numi is not a healthcare professional." },
  { q: "What is Numi?", a: "Numi is your AI wellness companion. Numi motivates you, helps you organize goals, suggests activities and celebrates your progress. Numi always identifies itself as AI." },
  { q: "How does the Wellness Garden work?", a: "Every activity you complete earns Garden XP. Your garden grows from a seed to a full Wellness Sanctuary, and you can unlock decorations along the way." },
  { q: "What happens if I miss a day?", a: "Nothing bad. Your progress stays, your garden stays, and NuMind welcomes you back. Streak Savers can protect a streak if you have one." },
  { q: "Is my journal private?", a: "Your journal entries are yours. They are never shown in the community and never used as marketing analytics." },
  { q: "Can I cancel anytime?", a: "Yes. Plans can be cancelled at any time and you keep access until the end of your billing period." },
  { q: "Does NuMind work on my phone?", a: "Yes. NuMind is available on the web, iOS and Android, and your progress syncs across devices." },
];

export const MONTHLY_JOURNEY = [
  { emoji: "Sparkles", title: "Your July", value: "A month of showing up", sub: "28 active days out of 31" },
  { emoji: "Flame", title: "Longest Streak", value: "18 days", sub: "Your personal best" },
  { emoji: "Star", title: "XP Earned", value: "1,860 XP", sub: "+34% vs June" },
  { emoji: "PersonStanding", title: "Mind Gym Sessions", value: "31", sub: "Breathe was your favourite" },
  { emoji: "Zap", title: "Focus Sessions", value: "22", sub: "9 hours of deep work" },
  { emoji: "BookOpen", title: "Journal Entries", value: "19", sub: "Mostly Today's Win" },
  { emoji: "GraduationCap", title: "Lessons Completed", value: "7", sub: "Sleep was your top topic" },
  { emoji: "Trophy", title: "Badges", value: "3 new", sub: "Mindfulness Master, Hydration Hero, Storyteller" },
  { emoji: "Target", title: "Goals Completed", value: "5 of 6", sub: "Nice pace" },
  { emoji: "Trees", title: "Garden Growth", value: "Flower → Tree", sub: "+640 Garden XP" },
  { emoji: "Medal", title: "Biggest Win", value: "You reset 12 mornings in a row", sub: "Even the tough ones" },
  { emoji: "Bot", title: "Numi Says", value: "\"You kept going on the hard days. That's the whole thing.\"", sub: "Numi is an AI companion" },
  { emoji: "Target", title: "Next Month", value: "Aim for 20 Daily Resets", sub: "Small steps, again" },
];

export const ADMIN_METRICS = [
  { label: "Daily Active Users", value: "24,318", delta: "+4.2%" },
  { label: "Monthly Active Users", value: "186,420", delta: "+7.8%" },
  { label: "D30 Retention", value: "41%", delta: "+1.6pt" },
  { label: "Daily Reset Completion", value: "68%", delta: "+2.1pt" },
  { label: "Mind Gym Usage", value: "52%", delta: "+3.4pt" },
  { label: "Focus Sessions", value: "31,904", delta: "+9.0%" },
  { label: "Journal Usage", value: "27%", delta: "-0.4pt" },
  { label: "Learning Completion", value: "44%", delta: "+2.8pt" },
  { label: "Quest Completion", value: "61%", delta: "+5.1pt" },
  { label: "Average Streak", value: "9.4 days", delta: "+0.6" },
  { label: "Numi Usage", value: "38%", delta: "+6.2pt" },
  { label: "Garden Engagement", value: "57%", delta: "+3.9pt" },
  { label: "Rewards Redeemed", value: "12,077", delta: "+11%" },
  { label: "Subscription Conversion", value: "6.3%", delta: "+0.5pt" },
  { label: "Subscription Cancellation", value: "2.1%", delta: "-0.3pt" },
];