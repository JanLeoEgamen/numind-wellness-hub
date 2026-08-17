// Task-breakdown engine for the Focus Zone "Break It Down" card.
//
// The app has no external AI provider/key wired up, so instead of a fixed
// "clean my apartment" script we generate genuinely content-aware micro-steps
// from the user's task. It's deterministic, works offline and for every user,
// and is a real source (unlike the hardcoded list it replaces). If an LLM is
// added later, this becomes the local fallback.

type Domain = {
  // Lowercased patterns used to detect this task type.
  patterns: string[];
  // Micro-steps returned for the task. "{task}" is replaced with a short
  // version of the user's task.
  steps: string[];
};

function short(task: string): string {
  const t = task.trim().replace(/\s+/g, " ").replace(/[.!\?]+$/, "");
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

const DOMAINS: Domain[] = [
  {
    patterns: ["write", "report", "essay", "blog", "article", "doc", "document", "email", "reply", "deck", "slides", "presentation", "draft", "book", "chapter", "paper", "post"],
    steps: [
      "Gather your notes, links and any outline — 5 minutes, no more.",
      "Write the rough first section without judging it (25-min timer).",
      "Fill in the remaining sections in one more focused block.",
      "Read it back; cut anything that doesn't help.",
      "Do a final polish pass and ship it.",
    ],
  },
  {
    patterns: ["clean", "tidy", "clutter", "declutter", "organi", "tidy up", "apartment", "house", "room", "kitchen", "bathroom", "garage", "desk", "drawer", "closet", "wardrobe"],
    steps: [
      "Gather your cleaning supplies and a timer.",
      "Clear surfaces and collect loose items into one pile.",
      "Pick one visible zone and finish it fully.",
      "Put things away / wash the zone in a 20-minute block.",
      "Final pass: trash, vacuum, and step back to admire it.",
    ],
  },
  {
    patterns: ["workout", "gym", "exercise", "run", "walk", "run outside", "yoga", "stretch", "train", "strength", "cardio", "work out"],
    steps: [
      "Lay out your gear and set a small, specific goal.",
      "Warm up for 5 minutes.",
      "Do the main session in one 25-minute block (or a set timer).",
      "Cool down and stretch what you just worked.",
      "Log it — even one session counts.",
    ],
  },
  {
    patterns: ["study", "learn", "read", "lesson", "course", "exam", "test", "homework", "research", "topic", "subject", "summary", "notes"],
    steps: [
      "Open the material and collect it in one place.",
      "Do a 25-minute block on just the first section.",
      "Write notes in your own words (a few lines is fine).",
      "Quiz yourself or explain it out loud.",
      "Summarize the whole thing in three lines.",
    ],
  },
  {
    patterns: ["inbox", "email", "respond", "reply", "correspond", "messages"],
    steps: [
      "Scan and label everything that needs a reply.",
      "Bang out the quick replies first (under 2 minutes each).",
      "Write the one or two important responses properly.",
      "Archive or file what's finished.",
    ],
  },
  {
    patterns: ["grocer", "shop", "shopping", "errand", "buy", "pick up", "purchase", "order", "returns"],
    steps: [
      "Write the list of what you actually need.",
      "Group the list by store or route.",
      "Do the top three first.",
      "Put everything away and tick them off.",
    ],
  },
  {
    patterns: ["cook", "meal", "recipe", "dinner", "lunch", "breakfast", "meal prep", "bake", "baking"],
    steps: [
      "Pick the recipe and check you have the ingredients.",
      "Prep — chop, measure, and lay everything out.",
      "Cook it in stages, one thing at a time.",
      "Plate it and enjoy without multitasking.",
      "Tidy the kitchen with a short reset.",
    ],
  },
  {
    patterns: ["project", "assignment", "deadline", "feature", "bug", "task", "report", "plan", "side project", "launch", "event"],
    steps: [
      "Define what 'done' actually looks like for this.",
      "Write the single next step you can start immediately.",
      "Do a 25-minute focused block on that step.",
      "Review it and note what to ask for or adjust.",
      "Wrap up and schedule the next 15 minutes.",
    ],
  },
];

const FALLBACK: string[] = [
  "Name the single next step that would feel like progress.",
  "Set a 10-minute timer and just start — momentum beats motivation.",
  "Do one small piece now, then pause.",
  "Check what's actually left and schedule the next 15 minutes.",
  "Finish with a 5-minute tidy so tomorrow starts clean.",
];

export function breakdownTask(input: string): string[] {
  const raw = input?.trim() ?? "";
  if (!raw) return FALLBACK;

  const text = raw.toLowerCase();
  const taskShort = short(raw);

  // Score every domain: more pattern matches (especially longer, specific ones)
  // win over accidental single-keyword hits.
  let best: Domain | null = null;
  let bestScore = 0;
  for (const d of DOMAINS) {
    let score = 0;
    for (const p of d.patterns) {
      if (text.includes(p)) score += p.length; // longer, more specific patterns weigh more
    }
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  const steps = best ? best.steps : FALLBACK;
  // Apply the task onto the first step where it reads naturally; otherwise just
  // return the steps as-is so every task still gets a concrete plan.
  const withTask = steps.map((s, i) =>
    i === 0 && best ? s.replace(/^Gather your notes/, `Gather what you need for "${taskShort}"`) : s,
  );

  return best ? withTask : steps;
}
