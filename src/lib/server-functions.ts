// Backend data layer for NuMind Wellness Hub.
//
// These are TanStack Start server functions. They run only on the server, are
// protected by `requireSupabaseAuth` (which validates the user's JWT and opens an
// RLS-scoped Supabase client bound to that user), and replace the Phase-1 mock
// data with live, persisted rows.
//
// The `.validator(...)` steps type the request payload; we keep them light
// (runtime validation can be strengthened later with zod, already a dependency).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 1. Profile + derived stats (XP, level, streak, garden)
// ---------------------------------------------------------------------------

export type MyStats = {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
    avatar: string | null;
    preferredMotivationalStyle: string;
    onboardingCompleted: boolean;
    createdAt: string | null;
  } | null;
  xpTotal: number;
  level: { number: number; name: string; tagline: string | null; emoji: string | null };
  currentStreak: number;
  longestStreak: number;
  garden: { growthPoints: number; stage: number; theme: string } | null;
  todayCompleted: boolean;
  todayDone: {
    reset: boolean;
    mindgym: boolean;
    focus: boolean;
    hydration: boolean;
    win: boolean;
  };
  dailyRewardClaimed: boolean;
};

export const getMyStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyStats> => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    const [profileRes, xpRes, resetRes, gardenRes, levelsRes, mindRes, focusRes, habitRes, journalRes, rewardRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, nickname, avatar, preferred_motivational_style, onboarding_completed, created_at",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("xp_transactions").select("amount").eq("user_id", userId),
        supabase
          .from("daily_resets")
          .select("completed")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("gardens")
          .select("stage, growth_points, theme")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("levels").select("level_number, name, tagline, xp_required, emoji").order("xp_required"),
        // Today's real activity, so the Home "Today's Journey" checklist is
        // truthful and survives a refresh instead of living only in-session.
        supabase
          .from("mind_gym_completions")
          .select("id")
          .eq("user_id", userId)
          .gte("completed_at", `${today}T00:00:00`)
          .lt("completed_at", `${today}T23:59:59`),
        supabase
          .from("focus_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("completed_at", `${today}T00:00:00`)
          .lt("completed_at", `${today}T23:59:59`),
        supabase.from("habit_logs").select("id").eq("user_id", userId).eq("date", today),
        supabase
          .from("journal_entries")
          .select("id")
          .eq("user_id", userId)
          .gte("created_at", `${today}T00:00:00`)
          .lt("created_at", `${today}T23:59:59`),
        supabase
          .from("xp_transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("source_type", "daily_reward")
          .gte("created_at", `${today}T00:00:00`)
          .lt("created_at", `${today}T23:59:59`),
      ]);

    const profileRows = profileRes.data;
    const xpRows = xpRes.data ?? [];
    const xpTotal = xpRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    const levelRows = levelsRes.data ?? [];
    let currentLevel = levelRows[0] ?? {
      level_number: 1,
      name: "Explorer",
      tagline: null,
      xp_required: 0,
      emoji: null as string | null,
    };
    for (const lvl of levelRows) {
      if (xpTotal >= lvl.xp_required) currentLevel = lvl;
    }

    // Streak = consecutive completed Daily Reset days ending today or yesterday.
    const { data: completedDates } = await supabase
      .from("daily_resets")
      .select("date")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("date", { ascending: false })
      .limit(400);

    const dateSet = new Set((completedDates ?? []).map((r) => r.date));
    const todayDate = new Date(today);
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const walked = dateSet.has(today)
      ? todayDate
      : dateSet.has(toDateKey(yesterday))
        ? yesterday
        : null;

    let streak = 0;
    let cursor = walked;
    while (cursor) {
      if (!dateSet.has(toDateKey(cursor))) break;
      streak += 1;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    }

    // Longest streak: scan chronological order.
    const ordered = [...(completedDates ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    let longest = 0;
    let run = 0;
    for (const d of ordered) {
      run = dateSet.has(d.date) ? run + 1 : 0;
      if (run > longest) longest = run;
    }

    const mindToday = (mindRes.data?.length ?? 0) > 0;
    const focusToday = (focusRes.data?.length ?? 0) > 0;
    const hydrationToday = (habitRes.data?.length ?? 0) > 0;
    const winToday = (journalRes.data?.length ?? 0) > 0;

    return {
      profile: profileRows
        ? {
            id: profileRows.id,
            firstName: profileRows.first_name,
            lastName: profileRows.last_name,
            nickname: profileRows.nickname,
            avatar: profileRows.avatar,
            preferredMotivationalStyle: profileRows.preferred_motivational_style,
            onboardingCompleted: profileRows.onboarding_completed,
            createdAt: profileRows.created_at,
          }
        : null,
      xpTotal,
      level: {
        number: currentLevel.level_number,
        name: currentLevel.name,
        tagline: currentLevel.tagline,
        emoji: currentLevel.emoji,
      },
      currentStreak: streak,
      longestStreak: longest,
      garden: gardenRes.data
        ? {
            growthPoints: gardenRes.data.growth_points,
            stage: gardenRes.data.stage,
            theme: gardenRes.data.theme,
          }
        : null,
      todayCompleted: resetRes.data?.completed ?? false,
      todayDone: {
        reset: resetRes.data?.completed ?? false,
        mindgym: mindToday,
        focus: focusToday,
        hydration: hydrationToday,
        win: winToday,
      },
      dailyRewardClaimed: (rewardRes.data?.length ?? 0) > 0,
    };
  });

export type UpdateProfileInput = {
  nickname?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  preferredMotivationalStyle?: string;
};

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: UpdateProfileInput) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const patch: Record<string, string> = {};
    if (data.nickname !== undefined) patch["nickname"] = data.nickname.trim();
    if (data.avatar !== undefined) patch["avatar"] = data.avatar;
    if (data.firstName !== undefined) patch["first_name"] = data.firstName.trim();
    if (data.lastName !== undefined) patch["last_name"] = data.lastName.trim();
    if (data.preferredMotivationalStyle !== undefined) {
      patch["preferred_motivational_style"] = data.preferredMotivationalStyle;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type MyGoal = {
  id: string;
  title: string;
  category: string;
  status: string;
  currentValue: number;
  targetValue: number | null;
  createdAt: string;
};

export const getMyGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyGoal[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("goals")
      .select("id, title, category, status, current_value, target_value, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      currentValue: g.current_value,
      targetValue: g.target_value,
      createdAt: g.created_at,
    }));
  });

export const addMyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { title: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const title = data.title.trim();
    if (!title) throw new Error("Goal title can't be empty.");
    const { error } = await supabase.from("goals").insert({
      user_id: userId,
      title,
      category: "wellbeing",
      status: "active",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeMyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("goals")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 2. XP ledger (idempotent per source) + garden growth
// ---------------------------------------------------------------------------

export type AwardXpInput = {
  amount: number;
  sourceType: string;
  sourceId?: string;
  description?: string;
};

export type AwardXpResult = {
  awarded: boolean;
  xpTotal: number;
};

export const awardXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: AwardXpInput) => d)
  .handler(async ({ context, data }): Promise<AwardXpResult> => {
    const { supabase, userId } = context;
    const amount = Math.max(0, Math.min(2000, Math.round(data.amount || 0)));
    if (amount === 0) return { awarded: false, xpTotal: 0 };

    const sourceId = data.sourceId ?? "none";

    // Idempotency: a source (type + id) awards XP at most once.
    const { data: existing } = await supabase
      .from("xp_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("source_type", data.sourceType)
      .eq("source_id", sourceId);

    if ((existing ?? []).length > 0) {
      const { data: total } = await supabase
        .from("xp_transactions")
        .select("amount")
        .eq("user_id", userId);
      return { awarded: false, xpTotal: (total ?? []).reduce((s, r) => s + (r.amount ?? 0), 0) };
    }

    const { error: insertError } = await supabase.from("xp_transactions").insert({
      user_id: userId,
      amount,
      source_type: data.sourceType,
      source_id: sourceId === "none" ? null : sourceId,
      description: data.description ?? null,
    });

    if (insertError) throw new Error(insertError.message);

    // Garden grows at half the XP rate (rounded), matching the client store.
    const { data: garden } = await supabase
      .from("gardens")
      .select("growth_points")
      .eq("user_id", userId)
      .maybeSingle();
    if (garden) {
      await supabase
        .from("gardens")
        .update({ growth_points: (garden.growth_points ?? 0) + Math.round(amount / 2) })
        .eq("user_id", userId);
    }

    const { data: total } = await supabase
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", userId);

    return { awarded: true, xpTotal: (total ?? []).reduce((s, r) => s + (r.amount ?? 0), 0) };
  });

// ---------------------------------------------------------------------------
// 3. Daily Reset (upsert per day, XP awarded once on completion)
// ---------------------------------------------------------------------------

export type DailyResetInput = {
  date?: string;
  mood?: number | null;
  energy?: number | null;
  focus?: number | null;
  sleepRating?: number | null;
  intention?: string | null;
  completed?: boolean;
};

export type DailyResetResult = {
  newReset: boolean;
  awarded: boolean;
};

export const submitDailyReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: DailyResetInput) => d)
  .handler(async ({ context, data }): Promise<DailyResetResult> => {
    const { supabase, userId } = context;
    const date = data.date ?? toDateKey(new Date());

    // First-ever Daily Reset becomes a keepsake memory.
    const ensureResetMemory = async (resetId?: string) => {
      await insertMemoryIfAbsent(supabase, userId, {
        memoryType: "milestone",
        title: "Your first Daily Reset",
        description: `You showed up on ${date} — that was the first step.`,
        sourceType: "daily_reset",
        sourceId: resetId ?? null,
        emoji: "Sun",
      });
    };

    // Consecutive-streak keepsakes (7 / 30 / 100 days) from real resets.
    const ensureStreakMemory = async (resetId: string) => {
      const { data: completedRows } = await supabase
        .from("daily_resets")
        .select("date")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("date", { ascending: false })
        .limit(400);
      const dateSet = new Set((completedRows ?? []).map((r) => r.date));
      const todayKey = toDateKey(new Date());
      const yesterday = new Date(todayKey);
      yesterday.setDate(yesterday.getDate() - 1);
      const walked = dateSet.has(todayKey)
        ? new Date(todayKey)
        : dateSet.has(toDateKey(yesterday))
          ? new Date(yesterday)
          : null;

      let streak = 0;
      let cursor = walked;
      while (cursor) {
        if (!dateSet.has(toDateKey(cursor))) break;
        streak += 1;
        const prev = new Date(cursor);
        prev.setDate(prev.getDate() - 1);
        cursor = prev;
      }

      if (streak === 7 || streak === 30 || streak === 100) {
        await insertMemoryIfAbsent(supabase, userId, {
          memoryType: "streak",
          title: `You kept a ${streak}-day streak of Daily Resets.`,
          description: `${streak} days of showing up for yourself — that's something to hold onto.`,
          sourceType: "streak",
          sourceId: resetId,
          emoji: "Flame",
        });
      }
    };

    // Read the existing row so we can decide, atomically, whether this call
    // transitions the reset to completed (and therefore whether XP is due).
    const { data: existing } = await supabase
      .from("daily_resets")
      .select("id, completed")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    const patch: {
      mood: number | null;
      energy: number | null;
      focus: number | null;
      sleep_rating: number | null;
      intention: string | null;
    } = {
      mood: data.mood ?? null,
      energy: data.energy ?? null,
      focus: data.focus ?? null,
      sleep_rating: data.sleepRating ?? null,
      intention: data.intention ?? null,
    };

    const completed = data.completed ?? existing?.completed ?? false;
    const completingNow = !!data.completed && !existing?.completed;

    // Atomic upsert: one daily_resets row per user per day.
    const { error } = await supabase
      .from("daily_resets")
      .upsert(
        {
          user_id: userId,
          date,
          ...patch,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        } as any,
        { onConflict: "user_id,date" },
      );
    if (error) throw new Error(error.message);

    // Re-read the row id to use as the XP idempotency key.
    const { data: row } = await supabase
      .from("daily_resets")
      .select("id, completed")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    // Award +20 XP only on the false -> true completion transition. awardXp is
    // itself idempotent (keyed on source_type + source_id), so re-submits and
    // duplicate requests never grant XP twice.
    if (completingNow && row?.completed) {
      await awardXp({
        data: { amount: 20, sourceType: "daily_reset", sourceId: row.id, description: "Daily Reset" },
      }).catch(() => {});
      await ensureResetMemory(row.id).catch(() => {});
      await ensureStreakMemory(row.id).catch(() => {});
    }

    return { newReset: !existing, awarded: completingNow && row?.completed === true };
  });

// ---------------------------------------------------------------------------
// 4. Wellness habits + habit logs
// ---------------------------------------------------------------------------

export type LogHabitInput = {
  habitId: string;
  date?: string;
  value?: number;
};

export type LogHabitResult = {
  totalToday: number;
  goalMet: boolean;
  xpAwarded: number;
};

// Records progress for a habit on a given day. Multiple logs per day accumulate.
// Reaching the habit's goal awards XP at most once per day: the idempotency key
// "<habitId>:<date>" rotates each day (mirroring how recurring quests key on
// "<questId>:<periodKey>"), so a habit pays out again on each new day instead
// of once in the user's lifetime.
export const logHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: LogHabitInput) => d)
  .handler(async ({ context, data }): Promise<LogHabitResult> => {
    const { supabase, userId } = context;
    const date = data.date ?? toDateKey(new Date());
    const value = Math.max(0, Math.round(data.value ?? 1));

    const { error } = await supabase.from("habit_logs").insert({
      user_id: userId,
      habit_id: data.habitId,
      date,
      value,
    });
    if (error) throw new Error(error.message);

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("value")
      .eq("user_id", userId)
      .eq("habit_id", data.habitId)
      .eq("date", date);
    const totalToday = (logs ?? []).reduce((s, l) => s + (l.value ?? 0), 0);

    const { data: habit } = await supabase
      .from("wellness_habits")
      .select("target_value")
      .eq("id", data.habitId)
      .eq("user_id", userId)
      .maybeSingle();

    const goal = Number(habit?.target_value ?? 0);
    const reached = goal > 0 && totalToday >= goal;

    // Award once per day. awardXp is idempotent on (source_type, source_id),
    // so rapid taps / duplicate requests can never pay the goal out twice.
    let xpAwarded = 0;
    if (reached) {
      try {
        const result = await awardXp({
          data: {
            amount: 20,
            sourceType: "habit_goal",
            sourceId: `${data.habitId}:${date}`,
            description: "Habit goal reached",
          },
        });
        xpAwarded = result.awarded ? 20 : 0;
      } catch {
        // A failed XP write must never break the habit log itself.
      }
    }

    return { totalToday, goalMet: reached, xpAwarded };
  });

export const getMyHabits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    // NOTE: `favorite` is a new column (see migrations/..._add_habit_favorite.sql).
    // It isn't in the generated types yet, so the query is softly typed; the
    // column must be applied before this reads it live.
    const { data: habits } = await (supabase as any)
      .from("wellness_habits")
      .select("id, habit_type, title, target_value, unit, emoji, active, favorite")
      .eq("user_id", userId)
      .order("created_at");

    const { data: logs } = await supabase
      .from("habit_logs")
      .select("habit_id, value")
      .eq("user_id", userId)
      .eq("date", today);

    const totals = new Map<string, number>();
    for (const log of logs ?? []) {
      totals.set(log.habit_id, (totals.get(log.habit_id) ?? 0) + (log.value ?? 0));
    }

    return (habits ?? []).map((h: any) => ({
      id: h.id,
      type: h.habit_type,
      title: h.title,
      goal: h.target_value,
      unit: h.unit,
      emoji: h.emoji,
      favorite: h.favorite ?? false,
      today: totals.get(h.id) ?? 0,
    }));
  });

// ---------------------------------------------------------------------------
// 5. Mind Gym completions
// ---------------------------------------------------------------------------

export type MindGymCompletionInput = {
  activityId: string;
  durationMinutes?: number;
};

export const completeMindGymActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: MindGymCompletionInput) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: activity } = await supabase
      .from("mind_gym_activities")
      .select("id, xp_reward")
      .eq("id", data.activityId)
      .maybeSingle();

    const xp = activity?.xp_reward ?? 0;

    const { data: existing } = await supabase
      .from("mind_gym_completions")
      .select("id")
      .eq("activity_id", data.activityId)
      .eq("user_id", userId);

    if ((existing ?? []).length === 0) {
      const { error } = await supabase.from("mind_gym_completions").insert({
        user_id: userId,
        activity_id: data.activityId,
        duration_minutes: data.durationMinutes ?? null,
        xp_awarded: xp,
      });
      if (error) throw new Error(error.message);
      await awardXp({ data: { amount: xp, sourceType: "mind_gym", sourceId: data.activityId, description: "Mind Gym" } });
      // Mind Gym milestone keepsake at 25 / 100 total completions.
      try {
        const { data: completions } = await supabase
          .from("mind_gym_completions")
          .select("id")
          .eq("user_id", userId);
        const total = (completions ?? []).length;
        if (total === 25 || total === 100) {
          await insertMemoryIfAbsent(supabase, userId, {
            memoryType: "milestone",
            title: `You've completed ${total} Mind Gym activities!`,
            description: total === 100 ? "A hundred sessions of showing up." : "A quiet win to hold onto.",
            sourceType: "mind_gym",
            sourceId: data.activityId,
            emoji: "PersonStanding",
          });
        }
      } catch (err) {
        console.error("[Memory Lane] Mind Gym milestone skipped:", err);
      }
    }

    return { xp };
  });

// ---------------------------------------------------------------------------
// 6. Focus sessions
// ---------------------------------------------------------------------------

export type FocusSessionInput = {
  task?: string | null;
  durationMinutes: number;
  notes?: string | null;
  distractions?: number;
};

export const recordFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: FocusSessionInput) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const minutes = Math.max(1, Math.min(180, Math.round(data.durationMinutes || 25)));
    const xp = Math.min(20, Math.max(5, Math.round((minutes / 5) * 5)));
    const now = new Date().toISOString();

    const { data: saved, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: userId,
        task: data.task?.trim() ? data.task.trim() : null,
        duration_minutes: minutes,
        started_at: now,
        completed_at: now,
        status: "completed",
        xp_awarded: xp,
        notes: data.notes ?? null,
        distractions: Math.max(0, Math.round(data.distractions ?? 0)),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Award XP once per session: the focus_sessions row id is the idempotency
    // key, so every completed focus session pays out (not just the first).
    await awardXp({
      data: {
        amount: xp,
        sourceType: "focus_session",
        sourceId: saved?.id ?? String(now),
        description: "Focus Sprint",
      },
    });

    // Focus-streak milestone bonus: +25 XP on every 7th consecutive focus day.
    // Keyed on the streak length so a given milestone only pays out once.
    let streakBonus = 0;
    try {
      const { data: completedDates } = await supabase
        .from("focus_sessions")
        .select("completed_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .not("completed_at", "is", null);
      const dateSet = new Set(
        (completedDates ?? []).map((r) => toDateKey(new Date(r.completed_at as string))),
      );
      const streak = computeCurrentStreak(dateSet, toDateKey(new Date()));
      if (streak > 0 && streak % 7 === 0) {
        const { awarded } = await awardXp({
          data: {
            amount: 25,
            sourceType: "focus_streak_bonus",
            sourceId: `streak:${streak}`,
            description: `${streak}-day focus streak`,
          },
        });
        if (awarded) streakBonus = 25;
      }
    } catch (err) {
      console.error("[Focus] streak bonus skipped:", err);
    }

    return { xp, streakBonus };
  });

// ---------------------------------------------------------------------------
// 7. Journal entries
// ---------------------------------------------------------------------------

export type SaveJournalInput = {
  id?: string;
  title?: string;
  content: string;
  journalType?: string;
  moodTag?: string | null;
  favorite?: boolean;
};

export const saveJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SaveJournalInput) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    if (data.id) {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          title: data.title ?? null,
          content: data.content,
          journal_type: data.journalType ?? "free",
          mood_tag: data.moodTag ?? null,
          ...(data.favorite !== undefined ? { favorite: data.favorite } : {}),
        })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id, xpAwarded: 0 };
    }

    const { data: inserted, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        title: data.title ?? null,
        content: data.content,
        journal_type: data.journalType ?? "free",
        mood_tag: data.moodTag ?? null,
        favorite: data.favorite ?? false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    let xpAwarded = 0;
    if (inserted) {
      try {
        const result = await awardXp({
          data: { amount: 20, sourceType: "journal", sourceId: inserted.id, description: "Journal entry" },
        });
        xpAwarded = result.awarded ? 20 : 0;
      } catch {
        // A failed XP write must never lose the entry itself.
      }
      // Award the Journal Explorer badge once the user reaches 20 entries,
      // reusing the user_badges pattern from getMyBadges.
      const { count } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= 20) {
        const { data: badge } = await supabase
          .from("badges")
          .select("id")
          .eq("slug", "journal-explorer")
          .maybeSingle();
        if (badge) {
          const { data: owned } = await supabase
            .from("user_badges")
            .select("id")
            .eq("user_id", userId)
            .eq("badge_id", badge.id)
            .maybeSingle();
          if (!owned) {
            await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
          }
        }
      }
    }
    return { id: inserted?.id, xpAwarded };
  });

export const deleteJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleJournalFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; favorite: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("journal_entries")
      .update({ favorite: data.favorite })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, favorite: data.favorite };
  });

export const getMyJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("journal_entries")
      .select("id, title, content, journal_type, mood_tag, favorite, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });


// ---------------------------------------------------------------------------
// 7b. Journal streak & entry count
// ---------------------------------------------------------------------------

export const getMyJournalStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("journal_entries")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const dates = (data ?? []).map((e) => (e.created_at ?? "").slice(0, 10));
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const dateSet = new Set(dates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let current = 0;
    const cursor = new Date(today);
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const sorted = [...dateSet].sort();
    let longest = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]!);
      const curr = new Date(sorted[i]!);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        run++;
        longest = Math.max(longest, run);
      } else if (diff > 1) {
        run = 1;
      }
    }

    return { currentStreak: current, longestStreak: longest };
  });

export const getMyJournalEntryCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { totalEntries: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// 8. Notifications
// ---------------------------------------------------------------------------

export const getMyNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, emoji, read, action_type, action_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { ids?: string[] }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const query = supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (data.ids && data.ids.length > 0) query.in("id", data.ids);
    await query;
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 9. Community (Together) feed
// ---------------------------------------------------------------------------

export const getCommunityFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("community_posts")
      .select("id, user_id, content, category, emoji, anonymous, hidden, created_at")
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);
    const posts = data ?? [];

    // Resolve real display names + avatars from the profiles table so posts
    // show the user's actual name (nickname or first/last) instead of a raw id.
    const authorIds = [...new Set(posts.map((p) => p.user_id))];
    const { data: profiles } = authorIds.length
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, nickname, avatar")
          .in("id", authorIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const displayNameFor = (p: { user_id: string; anonymous: boolean }) => {
      if (p.anonymous) return "Anonymous";
      const prof = profileById.get(p.user_id);
      if (!prof) return "NuMind member";
      return (
        prof.nickname ??
        [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim() ??
        "NuMind member"
      );
    };

    const postIds = posts.map((p) => p.id);
    const { data: reactions } = postIds.length
      ? await supabase
          .from("community_reactions")
          .select("post_id, reaction, user_id")
          .in("post_id", postIds)
      : { data: [] };

    const counts = new Map<string, Record<string, number>>();
    for (const r of reactions ?? []) {
      const m = counts.get(r.post_id) ?? {};
      m[r.reaction] = (m[r.reaction] ?? 0) + 1;
      counts.set(r.post_id, m);
    }

    const myReactions = new Map<string, Set<string>>();
    for (const r of reactions ?? []) {
      if (r.user_id !== userId) continue;
      const set = myReactions.get(r.post_id) ?? new Set<string>();
      set.add(r.reaction);
      myReactions.set(r.post_id, set);
    }

    return posts.map((p) => {
      const prof = profileById.get(p.user_id);
      return {
        ...p,
        isMine: p.user_id === userId,
        authorName: displayNameFor(p),
        avatar: !p.anonymous ? (prof?.avatar ?? "Sprout") : "Bird",
        reactions: counts.get(p.id) ?? {},
        myReaction: [...(myReactions.get(p.id) ?? [])],
      };
    });
  });

export const createCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { content: string; category?: string; emoji?: string; anonymous?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: post, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        content: data.content.slice(0, 2000),
        category: data.category ?? "win",
        emoji: data.emoji ?? null,
        anonymous: data.anonymous ?? false,
      })
      .select("id, user_id, content, category, emoji, anonymous, created_at")
      .single();
    if (error) throw new Error(error.message);
    return post;
  });

export const toggleCommunityReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { postId: string; reaction: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("community_reactions")
      .select("id")
      .eq("post_id", data.postId)
      .eq("user_id", userId)
      .eq("reaction", data.reaction)
      .maybeSingle();

    if (existing) {
      await supabase.from("community_reactions").delete().eq("id", existing.id);
      return { active: false };
    }
    await supabase.from("community_reactions").insert({
      post_id: data.postId,
      user_id: userId,
      reaction: data.reaction,
    });
    return { active: true };
  });

export const reportCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { postId: string; reason?: string; details?: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: post } = await supabase
      .from("community_posts")
      .select("user_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("Post not found.");
    if (post.user_id === userId) throw new Error("You can't report your own post.");

    // Don't stack duplicate open reports from the same person on the same post.
    const { data: existing } = await (supabase as any)
      .from("community_reports")
      .select("id")
      .eq("post_id", data.postId)
      .eq("reporter_id", userId)
      .eq("status", "open")
      .maybeSingle();
    if (existing) return { reported: false, alreadyReported: true };

    const { error } = await (supabase as any).from("community_reports").insert({
      post_id: data.postId,
      reporter_id: userId,
      reason: data.reason ?? "other",
      details: data.details ?? null,
      status: "open",
    });
    if (error) throw new Error(error.message);
    return { reported: true, alreadyReported: false };
  });

export const getCommunityStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await (supabase as any).rpc("community_progress");
    if (error) throw new Error(error.message);
    return {
      totalFocusMinutes: data?.totalFocusMinutes ?? 0,
      totalResets: data?.totalResets ?? 0,
      totalGardenItems: data?.totalGardenItems ?? 0,
      totalJournals: data?.totalJournals ?? 0,
    };
  });

// ---------------------------------------------------------------------------
// 10. Badges
// ---------------------------------------------------------------------------

export const getMyBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("user_id", userId);

    const ownedIds = new Set((owned ?? []).map((b) => b.badge_id));
    const { data: catalog } = await supabase
      .from("badges")
      .select("id, slug, name, description, emoji, category, xp_reward")
      .eq("active", true)
      .order("created_at");

    return (catalog ?? []).map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      emoji: b.emoji,
      category: b.category,
      xpReward: b.xp_reward,
      earned: ownedIds.has(b.id),
    }));
  });

// ---------------------------------------------------------------------------
// 11. Garden
// ---------------------------------------------------------------------------

export const unlockGardenItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { itemId: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: garden } = await supabase
      .from("gardens")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!garden) throw new Error("No garden for user");

    const { data: item } = await supabase
      .from("garden_items")
      .select("id, xp_cost")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item) throw new Error("Item not found");

    const { data: already } = await supabase
      .from("user_garden_items")
      .select("id")
      .eq("user_id", userId)
      .eq("item_id", data.itemId)
      .maybeSingle();
    if (already) return { unlocked: true, cost: 0 };

    const { error } = await supabase.from("user_garden_items").insert({
      user_id: userId,
      garden_id: garden.id,
      item_id: data.itemId,
      placed: true,
    });
    if (error) throw new Error(error.message);

    return { unlocked: true, cost: item.xp_cost ?? 0 };
  });

export type MyGardenItem = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  itemType: string;
  placed: boolean;
};

export type MyGardenRecent = {
  id: string;
  emoji: string;
  title: string;
  gardenXp: number;
  createdAt: string;
};

export type MyGarden = {
  garden: {
    id: string;
    name: string;
    stage: number;
    growthPoints: number;
    theme: string;
  } | null;
  items: MyGardenItem[];
  placedIds: string[];
  recent: MyGardenRecent[];
};

export const getMyGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyGarden> => {
    const { supabase, userId } = context;

    const { data: garden } = await supabase
      .from("gardens")
      .select("id, name, stage, growth_points, theme")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: owned } = await supabase
      .from("user_garden_items")
      .select("item_id, placed, garden_items(id, slug, name, emoji, item_type)")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false });

    const items: MyGardenItem[] = (owned ?? []).map((p) => {
      const gi = p.garden_items;
      return {
        id: gi?.id ?? p.item_id,
        slug: gi?.slug ?? "",
        name: gi?.name ?? "Garden item",
        emoji: gi?.emoji ?? "Sprout",
        itemType: gi?.item_type ?? "decoration",
        placed: p.placed,
      };
    });

    // Recent garden growth = recent XP awards (every award grows the garden by
    // half the XP amount, matching the store).
    const { data: recentXp } = await supabase
      .from("xp_transactions")
      .select("id, description, amount, source_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);

    const sourceEmoji: Record<string, string> = {
      daily_reset: "Sun",
      mind_gym: "PersonStanding",
      focus: "Zap",
      habit_goal: "Droplets",
      journal: "BookOpen",
      quest: "Trophy",
      learning: "GraduationCap",
      daily_reward: "Gift",
    };

    const recent: MyGardenRecent[] = (recentXp ?? []).map((x) => ({
      id: x.id,
      emoji: sourceEmoji[x.source_type] ?? "Star",
      title: x.description ?? "Garden growth",
      gardenXp: Math.round((x.amount ?? 0) / 2),
      createdAt: x.created_at,
    }));

    return {
      garden: garden
        ? {
            id: garden.id,
            name: garden.name,
            stage: garden.stage,
            growthPoints: garden.growth_points,
            theme: garden.theme,
          }
        : null,
      items,
      placedIds: items.filter((i) => i.placed).map((i) => i.id),
      recent,
    };
  });

export const setGardenItemPlaced = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { itemId: string; placed: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: garden } = await supabase
      .from("gardens")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!garden) throw new Error("No garden for user");

    const { error } = await supabase
      .from("user_garden_items")
      .update({ placed: data.placed })
      .eq("user_id", userId)
      .eq("item_id", data.itemId)
      .eq("garden_id", garden.id);
    if (error) throw new Error(error.message);
    return { ok: true, placed: data.placed };
  });

// ---------------------------------------------------------------------------
// 12. Mind Gym catalog + Learning catalog
// ---------------------------------------------------------------------------

export const getMindGymActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("mind_gym_activities")
      .select(
        "id, slug, title, description, category, duration_minutes, difficulty, emoji, xp_reward, instructions, premium_required",
      )
      .eq("active", true)
      .order("created_at", { ascending: true });
    return (data ?? []).map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.title,
      description: a.description,
      category: a.category,
      minutes: a.duration_minutes,
      difficulty: a.difficulty,
      emoji: a.emoji,
      xp: a.xp_reward,
      instructions: (a.instructions ?? []) as string[],
      locked: a.premium_required,
    }));
  });

export const getLearningCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: lessons } = await supabase
      .from("learning_content")
      .select(
        "id, slug, title, summary, content_type, category, duration_minutes, emoji, xp_reward, premium_required",
      )
      .eq("active", true)
      .order("created_at", { ascending: true });

    const { data: progress } = await supabase
      .from("learning_progress")
      .select("content_id, status, progress_percent, xp_awarded")
      .eq("user_id", userId);

    const byId = new Map((progress ?? []).map((p) => [p.content_id, p]));
    return (lessons ?? []).map((l) => {
      const p = byId.get(l.id);
      return {
        id: l.id,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        type: l.content_type,
        category: l.category,
        minutes: l.duration_minutes,
        emoji: l.emoji,
        xp: l.xp_reward,
        locked: l.premium_required,
        progress: p?.progress_percent ?? 0,
        completed: p?.status === "completed",
      };
    });
  });

export type CompleteLessonInput = { contentId: string };

export const completeLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: CompleteLessonInput) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: lesson } = await supabase
      .from("learning_content")
      .select("xp_reward")
      .eq("id", data.contentId)
      .maybeSingle();
    const xp = lesson?.xp_reward ?? 0;

    const { error } = await supabase
      .from("learning_progress")
      .upsert(
        {
          user_id: userId,
          content_id: data.contentId,
          status: "completed",
          progress_percent: 100,
          xp_awarded: xp,
        },
        { onConflict: "user_id,content_id" },
      );
    if (error) throw new Error(error.message);

    await awardXp({
      data: { amount: xp, sourceType: "learning", sourceId: data.contentId, description: "Lesson completed" },
    });
    return { xp };
  });

// ---------------------------------------------------------------------------
// 13. Wellness Quests
// ---------------------------------------------------------------------------

function periodKeyFor(type: string): string {
  const now = new Date();
  if (type === "daily") return now.toISOString().slice(0, 10);
  if (type === "weekly") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7)); // back to Monday
    return d.toISOString().slice(0, 10);
  }
  if (type === "monthly") return now.toISOString().slice(0, 7);
  if (type === "seasonal") {
    const m = now.getMonth();
    if (m <= 1) return "winter";
    if (m <= 4) return "spring";
    if (m <= 7) return "summer";
    if (m <= 10) return "fall";
    return "winter";
  }
  return now.toISOString().slice(0, 10);
}

export type QuestView = {
  id: string;
  slug: string | null;
  name: string;
  desc: string | null;
  category: string | null;
  questType: string | null;
  emoji: string | null;
  xp: number;
  goal: number;
  progress: number;
  completed: boolean;
};

export const getMyQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QuestView[]> => {
    const { supabase, userId } = context;
    const { data: quests } = await (supabase as any)
      .from("quests")
      .select(
        "id, slug, title, description, category, quest_type, emoji, xp_reward, requirements, premium_required",
      )
      .eq("active", true)
      .order("created_at", { ascending: true });

    const { data: completions } = (quests ?? []).length
      ? await (supabase as any)
          .from("quest_completions")
          .select("quest_id, progress, completed, period_key, xp_awarded")
          .eq("user_id", userId)
      : { data: [] };

    return (quests ?? []).map((q: any) => {
      const key = periodKeyFor(q.quest_type);
      // Only completions belonging to THIS quest (in the current period) count,
      // otherwise finishing one quest marks every quest of its type as complete.
      const comps = (completions ?? []).filter(
        (c: any) => c.period_key === key && c.quest_id === q.id,
      ) as any[];
      const done = comps.some((c: any) => c.completed);
      const reqCount = Number(q.requirements?.count ?? 1);
      const progressSoFar = comps.reduce(
        (sum: number, c: any) => sum + (Number(c.progress?.count) || (c.xp_awarded > 0 ? 1 : 0)),
        0,
      );
      return {
        id: q.id,
        slug: q.slug,
        name: q.title,
        desc: q.description,
        category: q.category,
        questType: q.quest_type,
        emoji: q.emoji,
        xp: q.xp_reward,
        goal: reqCount,
        progress: Math.min(reqCount, done ? reqCount : progressSoFar),
        completed: done,
      };
    });
  });

export type CompleteQuestInput = { questId: string };
export type CompleteQuestResult = { completed: boolean; awarded: boolean };

export const completeQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: CompleteQuestInput) => d)
  .handler(async ({ context, data }): Promise<CompleteQuestResult> => {
    const { supabase, userId } = context;
    const { data: quest } = await supabase
      .from("quests")
      .select("xp_reward, quest_type, slug")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest) return { completed: false, awarded: false };

    const periodKey = periodKeyFor(quest.quest_type);
    const { data: existing } = await supabase
      .from("quest_completions")
      .select("id, completed")
      .eq("user_id", userId)
      .eq("quest_id", data.questId)
      .eq("period_key", periodKey)
      .maybeSingle();

    if (existing?.completed) return { completed: true, awarded: false };

    const { error } = await supabase
      .from("quest_completions")
      .upsert(
        {
          user_id: userId,
          quest_id: data.questId,
          progress: { count: 1 },
          completed: true,
          completed_at: new Date().toISOString(),
          xp_awarded: quest.xp_reward ?? 0,
          period_key: periodKey,
        },
        { onConflict: "user_id,quest_id,period_key" },
      );
    if (error) throw new Error(error.message);

    // Award XP once per quest per period. The idempotency key is scoped to
    // (quest, period) so recurring daily/weekly/monthly quests pay out again on
    // each new period instead of once in the user's lifetime.
    await awardXp({
      data: {
        amount: quest.xp_reward ?? 0,
        sourceType: "quest",
        sourceId: `${data.questId}:${periodKey}`,
        description: `Quest: ${quest.slug}`,
      },
    }).catch(() => {});
    return { completed: true, awarded: true };
  });

// ---------------------------------------------------------------------------
// 14. Mind / Worry / Focus checks (single daily check upsert)
// ---------------------------------------------------------------------------

export type SaveMindCheckInput = {
  checkType: "mood" | "worry" | "focus";
  mood?: number | null;
  energy?: number | null;
  stress?: number | null;
  focus?: number | null;
  note?: string | null;
};

export const saveMindCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SaveMindCheckInput) => d)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

    // Build only the fields relevant to this check type so all three
    // reflections share the day's row without clobbering each other. Worry and
    // Focus share the single note column; we only overwrite it when a
    // non-empty note is provided so one check type can't wipe the other's note.
    const patch: {
      mood?: number;
      energy?: number;
      stress?: number;
      focus?: number;
      note?: string;
    } = {};
    if (data.checkType === "mood") {
      if (data.mood != null) patch.mood = clamp(data.mood);
      if (data.energy != null) patch.energy = clamp(data.energy);
    } else if (data.checkType === "worry") {
      if (data.stress != null) patch.stress = clamp(data.stress);
      if (typeof data.note === "string" && data.note.trim()) patch.note = data.note.trim();
    } else if (data.checkType === "focus") {
      if (data.focus != null) patch.focus = clamp(data.focus);
      if (typeof data.note === "string" && data.note.trim()) patch.note = data.note.trim();
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    // Atomic upsert: one row per (user, day) thanks to the unique constraint
    // added in migrations/20260814010002_mind_checks_unique.sql.
    const { error } = await supabase
      .from("mind_checks")
      .upsert({ user_id: userId, date: today, ...patch } as any, {
        onConflict: "user_id,date",
      });
    if (error) throw new Error(error.message);

    // Re-read the row id to use as the XP idempotency key.
    const { data: row } = await supabase
      .from("mind_checks")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    if (!row) return { ok: true };

    // One XP reward per day. awardXp is idempotent (keyed on source_type +
    // source_id), so re-saving the same day never double-counts.
    await awardXp({
      data: { amount: 10, sourceType: "mind_check", sourceId: row.id, description: "Reflection" },
    }).catch(() => {});

    return { ok: true };
  });

export type MindCheckSnapshot = {
  date: string;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  focus: number | null;
  note: string | null;
};

// Returns the saved Mood / Worry / Focus reflections for a given day (today by
// default) so the Reset page can pre-fill and confirm what was persisted.
export const getMindChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { date?: string } | undefined) => d)
  .handler(async ({ context, data }): Promise<MindCheckSnapshot | null> => {
    const { supabase, userId } = context;
    const date = data?.date ?? toDateKey(new Date());
    const { data: row, error } = await supabase
      .from("mind_checks")
      .select("date, mood, energy, stress, focus, note")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as MindCheckSnapshot) ?? null;
  });

// ---------------------------------------------------------------------------
// 15. Memories (Memory Lane)

// Shared, dedup-safe creator so activity handlers can leave real keepsakes in
// Memory Lane without ever double-writing a given source.
type MemoryInput = {
  memoryType: string;
  title: string;
  description?: string | null;
  sourceType: string;
  sourceId?: string | null;
  emoji: string;
};

async function insertMemoryIfAbsent(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: MemoryInput,
) {
  const filter = () =>
    supabase
      .from("memories")
      .select("id")
      .eq("user_id", userId)
      .eq("source_type", input.sourceType);
  const { data: existing } = input.sourceId
    ? await filter().eq("source_id", input.sourceId).limit(1)
    : await filter().limit(1);
  if ((existing ?? []).length > 0) return;
  await supabase.from("memories").insert({
    user_id: userId,
    memory_type: input.memoryType,
    title: input.title,
    description: input.description ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    emoji: input.emoji,
  });
}

// ---------------------------------------------------------------------------

export const getMyMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("memories")
      .select(
        "id, memory_type, title, description, source_type, source_id, emoji, favorite, pinned, created_at",
      )
      .eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const toggleMemoryFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { memoryId: string; favorite: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("memories")
      .update({ favorite: data.favorite })
      .eq("id", data.memoryId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleMemoryPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { memoryId: string; pinned: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("memories")
      .update({ pinned: data.pinned })
      .eq("id", data.memoryId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 16. Wellness habit favorites
// ---------------------------------------------------------------------------

export const toggleHabitFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { habitId: string; favorite: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("wellness_habits")
      .update({ favorite: data.favorite })
      .eq("id", data.habitId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 17. Daily reward (home) - claim once per day
// ---------------------------------------------------------------------------

export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    // Reward is claimable once per calendar day. source_id is a uuid column, so
    // we key off created_at instead of awardXp's (source_id) idempotency.
    const { data: existing } = await supabase
      .from("xp_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("source_type", "daily_reward")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);
    if ((existing ?? []).length > 0) return { claimed: true, awarded: false };

    const { error } = await supabase.from("xp_transactions").insert({
      user_id: userId,
      amount: 50,
      source_type: "daily_reward",
      source_id: null,
      description: "Daily reward",
    });
    if (error) throw new Error(error.message);

    // Garden grows at half the XP rate, matching the client store.
    const { data: garden } = await supabase
      .from("gardens")
      .select("id, growth_points")
      .eq("user_id", userId)
      .maybeSingle();
    if (garden) {
      await supabase
        .from("gardens")
        .update({ growth_points: (garden.growth_points ?? 0) + 25 })
        .eq("user_id", userId);
    }

    // Grant the "Butterfly Flock" garden item so the reward is genuinely owned
    // (idempotent — the same item is never granted twice).
    if (garden) {
      const { data: butterfly } = await supabase
        .from("garden_items")
        .select("id")
        .eq("slug", "butterfly")
        .maybeSingle();
      if (butterfly) {
        const { data: owned } = await supabase
          .from("user_garden_items")
          .select("id")
          .eq("user_id", userId)
          .eq("item_id", butterfly.id)
          .maybeSingle();
        if (!owned) {
          await supabase.from("user_garden_items").insert({
            user_id: userId,
            garden_id: garden.id,
            item_id: butterfly.id,
            placed: true,
          });
        }
      }
    }

    return { claimed: true, awarded: true };
  });

// ---------------------------------------------------------------------------
// 18. Healthy Play - catalogue + recorded sessions (XP once per game per day)
// ---------------------------------------------------------------------------

export type MyGame = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  category: string | null;
  xpReward: number;
  premiumRequired: boolean;
  playedToday: boolean;
};

export type MyGamesResult = {
  games: MyGame[];
  isPremium: boolean;
  playedTodayCount: number;
};

export const getMyGames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyGamesResult> => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    const [gamesRes, playsRes, subRes] = await Promise.all([
      supabase
        .from("games")
        .select("id, slug, name, description, emoji, category, xp_reward, premium_required")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("game_plays").select("game").eq("user_id", userId).eq("played_date", today),
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .maybeSingle(),
    ]);

    if (gamesRes.error) throw new Error(gamesRes.error.message);
    if (playsRes.error) throw new Error(playsRes.error.message);
    if (subRes.error) throw new Error(subRes.error.message);

    const playedSet = new Set((playsRes.data ?? []).map((p) => p.game));

    return {
      games: (gamesRes.data ?? []).map((g) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        description: g.description,
        emoji: g.emoji,
        category: g.category,
        xpReward: g.xp_reward,
        premiumRequired: g.premium_required,
        playedToday: playedSet.has(g.slug),
      })),
      isPremium: !!subRes.data,
      playedTodayCount: playedSet.size,
    };
  });

export type RecordGamePlayResult = {
  awarded: boolean;
  playedToday: boolean;
};

export const recordGamePlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { game: string; xp?: number }) => d)
  .handler(async ({ context, data }): Promise<RecordGamePlayResult> => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    // Only active catalogue games can award XP (keeps slugs canonical so a
    // future FK/mapping to `games.id` stays clean).
    const { data: game } = await supabase
      .from("games")
      .select("slug, xp_reward")
      .eq("slug", data.game)
      .eq("active", true)
      .maybeSingle();
    if (!game) return { awarded: false, playedToday: false };

    const xp = Math.round(data.xp ?? game.xp_reward ?? 20);

    const { data: existing } = await supabase
      .from("game_plays")
      .select("id")
      .eq("user_id", userId)
      .eq("game", data.game)
      .eq("played_date", today)
      .maybeSingle();

    if (existing) return { awarded: false, playedToday: true };

    const { data: created, error } = await supabase
      .from("game_plays")
      .insert({ user_id: userId, game: data.game, xp_awarded: xp, played_date: today })
      .select("id")
      .single();

    if (error || !created) return { awarded: false, playedToday: false };

    try {
      const result = await awardXp({
        data: {
          amount: xp,
          sourceType: "healthy_play",
          sourceId: created.id,
          description: `Played ${game.slug}`,
        },
      });
      if (!result.awarded) {
        // awardXp idempotently skipped (unexpected for a fresh source id) — the
        // play is recorded but no XP was credited; report it truthfully.
        return { awarded: false, playedToday: true };
      }
    } catch {
      // XP award failed after the play row was written — remove the row so a
      // retry can award instead of silently being capped for the day.
      await supabase.from("game_plays").delete().eq("id", created.id);
      return { awarded: false, playedToday: false };
    }

    return { awarded: true, playedToday: true };
  });

// ---------------------------------------------------------------------------
// 15. Onboarding
// ---------------------------------------------------------------------------

export type CompleteOnboardingInput = {
  avatar?: string;
  goals?: string[];
};

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: CompleteOnboardingInput) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { avatar, goals } = data;

    // Save the chosen avatar and flip the onboarding flag. The profile row is
    // normally created by the signup trigger, but upsert keeps this safe even
    // if the row is missing for some reason.
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        ...(avatar ? { avatar } : {}),
        onboarding_completed: true,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);

    // Persist the selected success goals (max 3) into the goals table.
    // This is a nice-to-have, so a failure here never blocks onboarding.
    if (goals && goals.length > 0) {
      const { data: existing } = await supabase.from("goals").select("title").eq("user_id", userId);
      const existingTitles = new Set((existing ?? []).map((g) => g.title as string));
      const rows = goals
        .slice(0, 3)
        .filter((title) => !!title && !existingTitles.has(title))
        .map((title) => ({ user_id: userId, title, category: "wellbeing", status: "active" }));
      if (rows.length > 0) {
        const { error: goalsError } = await supabase.from("goals").insert(rows);
        if (goalsError) console.error("Failed to save onboarding goals", goalsError.message);
      }
    }

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 19. Numi AI companion (conversations, persistence, personalization)
// ---------------------------------------------------------------------------

export type NumiConversation = {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
};

export type NumiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata: Json;
};

export type SendNumiMessageInput = {
  conversationId?: string | null;
  message: string;
  intent?: string | null;
};

export type SendNumiMessageResult = {
  conversationId: string;
  reply: string;
  replySource: "ai" | "fallback" | "safety";
  xpAwarded: number;
};

// A compact snapshot of the user's real NuMind data, assembled server-side and
// used to personalize Numi's system prompt. Never shipped to the client bundle.
type NumiContext = {
  firstName: string | null;
  motivationalStyle: string;
  levelNumber: number;
  levelName: string;
  levelEmoji: string | null;
  xpTotal: number;
  currentStreak: number;
  gardenStage: number | null;
  gardenTheme: string | null;
  todayCompleted: boolean;
  journalThemes: string[];
  goals: string[];
  habitsProgress: string[];
};

function computeCurrentStreak(dateSet: Set<string>, today: string): number {
  const todayDate = new Date(today);
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);

  const walked = dateSet.has(today)
    ? todayDate
    : dateSet.has(toDateKey(yesterday))
      ? yesterday
      : null;

  let streak = 0;
  let cursor = walked;
  while (cursor) {
    if (!dateSet.has(toDateKey(cursor))) break;
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function buildNumiContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NumiContext> {
  const today = toDateKey(new Date());

  const [
    profileRes,
    xpRes,
    levelsRes,
    resetRes,
    gardenRes,
    journalRes,
    goalsRes,
    habitsRes,
    logsRes,
    resetDatesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, preferred_motivational_style")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("xp_transactions").select("amount").eq("user_id", userId),
    supabase.from("levels").select("level_number, name, emoji, xp_required").order("xp_required"),
    supabase
      .from("daily_resets")
      .select("completed")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabase.from("gardens").select("stage, theme").eq("user_id", userId).maybeSingle(),
    supabase
      .from("journal_entries")
      .select("title, content, journal_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("goals")
      .select("title")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(5),
    supabase
      .from("wellness_habits")
      .select("id, title, emoji")
      .eq("user_id", userId)
      .order("created_at"),
    supabase.from("habit_logs").select("habit_id, value").eq("user_id", userId).eq("date", today),
    supabase
      .from("daily_resets")
      .select("date")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("date", { ascending: false })
      .limit(400),
  ]);

  const xpTotal = (xpRes.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const levelRows = levelsRes.data ?? [];
  let currentLevel = levelRows[0] ?? {
    level_number: 1,
    name: "Explorer",
    emoji: null as string | null,
    xp_required: 0,
  };
  for (const lvl of levelRows) {
    if (xpTotal >= lvl.xp_required) currentLevel = lvl;
  }

  const dateSet = new Set((resetDatesRes.data ?? []).map((r) => r.date));
  const currentStreak = computeCurrentStreak(dateSet, today);

  const journalThemes = (journalRes.data ?? []).map((j) => {
    const title = j.title?.trim();
    if (title) return title;
    switch (j.journal_type) {
      case "todays_win":
        return "a win";
      case "gratitude":
        return "gratitude";
      case "brain_dump":
        return "a brain dump";
      case "letter_to_future_me":
        return "a letter to future me";
      default:
        return "a journal reflection";
    }
  });

  const goals = (goalsRes.data ?? []).map((g) => g.title).filter(Boolean).slice(0, 5) as string[];

  const habitMap = new Map<string, { title: string; emoji: string | null }>();
  for (const h of habitsRes.data ?? []) {
    habitMap.set(h.id, { title: h.title ?? "Habit", emoji: h.emoji });
  }
  const totals = new Map<string, number>();
  for (const log of logsRes.data ?? []) {
    totals.set(log.habit_id, (totals.get(log.habit_id) ?? 0) + (log.value ?? 0));
  }
  const habitsProgress = [...habitMap.entries()].slice(0, 4).map(
    ([id, h]) => `${h.emoji ?? "•"} ${h.title}: ${totals.get(id) ?? 0}`,
  );

  return {
    firstName: profileRes.data?.first_name ?? null,
    motivationalStyle: profileRes.data?.preferred_motivational_style ?? "encouraging",
    levelNumber: currentLevel.level_number,
    levelName: currentLevel.name,
    levelEmoji: currentLevel.emoji,
    xpTotal,
    currentStreak,
    gardenStage: gardenRes.data?.stage ?? null,
    gardenTheme: gardenRes.data?.theme ?? null,
    todayCompleted: resetRes.data?.completed ?? false,
    journalThemes,
    goals,
    habitsProgress,
  };
}

export const getMyNumiConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NumiConversation[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, title, last_message_at, created_at")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      lastMessageAt: c.last_message_at,
      createdAt: c.created_at,
    }));
  });

export const newNumiConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const getNumiConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ context, data }): Promise<NumiMessage[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("ai_conversation_messages")
      .select("id, role, content, metadata, created_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((m) => ({
      id: m.id,
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
      createdAt: m.created_at,
      metadata: m.metadata,
    }));
  });

export const archiveNumiConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_conversations")
      .update({ archived: true })
      .eq("id", data.conversationId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendNumiMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SendNumiMessageInput) => d)
  .handler(async ({ context, data }): Promise<SendNumiMessageResult> => {
    const { supabase, userId } = context;
    const text = (data.message ?? "").trim();
    const intent = data.intent?.trim() || null;
    if (!text) throw new Error("Numi message cannot be empty");

    // 1. Resolve the conversation (a new one is created on the first message).
    let conversationId: string | null = data.conversationId ?? null;
    if (conversationId) {
      const { data: owned } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!owned) conversationId = null;
    }
    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title: text.slice(0, 60) })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      conversationId = created.id;
    }

    // 2. Persist the user's message.
    const { error: userError } = await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: text,
      metadata: intent ? { intent } : {},
    });
    if (userError) throw new Error(userError.message);

    // 3. Personalization context from real user data.
    const ctx = await buildNumiContext(supabase, userId);

    // 4. Recent history gives the AI conversational memory.
    const { data: historyRows } = await supabase
      .from("ai_conversation_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);
    const history = (historyRows ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // 5. Safety first, then the AI, then a canned fallback responder.
    let reply: string;
    let replySource: SendNumiMessageResult["replySource"] = "fallback";

    const safetyReply = numiCrisisReply(text);
    if (safetyReply) {
      reply = safetyReply;
      replySource = "safety";
    } else {
      try {
        // Dynamic import keeps the provider helper out of the client bundle.
        const { chatCompletion } = await import("@/lib/numi-ai");
        const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: buildNumiSystemPrompt(ctx, intent) },
          ...history,
          { role: "user", content: text },
        ];
        reply = (await chatCompletion(aiMessages)).reply;
        replySource = "ai";
      } catch (err) {
        console.error("[Numi] AI request failed, using fallback responder:", err);
        reply = numiKeywordReply(text) ?? numiFallbackReply(ctx, intent);
      }
    }

    // 6. Persist the assistant's reply.
    const { error: assistantError } = await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: reply,
      metadata: { source: replySource },
    });
    if (assistantError) throw new Error(assistantError.message);

    // 7. Touch the conversation's recency marker.
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", userId);

    // 8. Small daily reward — idempotent via awardXp's source key, non-blocking.
    let xpAwarded = 0;
    try {
      const { awarded } = await awardXp({
        data: {
          amount: 5,
          sourceType: "numi_chat",
          sourceId: toDateKey(new Date()),
          description: "Checked in with Numi",
        },
      });
      xpAwarded = awarded ? 5 : 0;
    } catch (err) {
      console.error("[Numi] XP award skipped:", err);
    }

    return { conversationId, reply, replySource, xpAwarded };
  });

// ---------------------------------------------------------------------------
// Numi reply builders (system prompt + offline fallback responder)
// ---------------------------------------------------------------------------

function buildNumiSystemPrompt(ctx: NumiContext, intent: string | null): string {
  const lines = [
    "You are Numi, the warm and encouraging AI wellness companion inside the NuMind app. You help with everyday wellness and personal growth: motivation, focus, relaxation, goal setting, planning, journaling prompts, celebrating progress and winding down.",
    "Tone: warm, concise, specific and non-clinical. Keep replies to 2-4 short sentences unless the user asks for more. Use emoji sparingly.",
    "You are an AI companion, not a doctor, therapist or healthcare professional. Never diagnose, prescribe or treat. If the user mentions self-harm or a crisis, respond with care and gently encourage professional support.",
    "Ground your reply in the user's real NuMind data whenever it is relevant. Current snapshot:",
    `- Name: ${ctx.firstName ?? "the user"}`,
    `- Preferred motivational style: ${ctx.motivationalStyle}`,
    `- Level ${ctx.levelNumber} — ${ctx.levelName}${ctx.levelEmoji ? ` ${ctx.levelEmoji}` : ""}`,
    `- Total XP: ${ctx.xpTotal}`,
    `- Current streak: ${ctx.currentStreak} day${ctx.currentStreak === 1 ? "" : "s"}`,
    ctx.gardenStage != null
      ? `- Wellness garden stage: ${ctx.gardenStage}${ctx.gardenTheme ? ` (${ctx.gardenTheme})` : ""}`
      : "",
    `- Daily Reset completed today: ${ctx.todayCompleted ? "yes" : "not yet"}`,
    ctx.journalThemes.length ? `- Recent journal themes: ${ctx.journalThemes.join("; ")}` : "",
    ctx.goals.length ? `- Active goals: ${ctx.goals.join("; ")}` : "",
    ctx.habitsProgress.length ? `- Today's habit progress: ${ctx.habitsProgress.join("; ")}` : "",
    "",
    "Do not fabricate user data. If the snapshot is sparse, keep the reply general and supportive.",
  ];
  if (intent) {
    lines.push(`The user tapped a quick action labelled "${intent}". Match your reply to that intent.`);
  }
  return lines.filter(Boolean).join("\n");
}

// Gentle, safe response for crisis-related messages — always takes priority.
function numiCrisisReply(message: string): string | null {
  const lower = message.toLowerCase();
  if (/(kill myself|end my life|suicide|suicidal|self-?harm|hurt myself|want to die)/.test(lower)) {
    return "I'm really glad you told me, and I care about your safety. I'm not equipped to be your crisis support, so please reach out to someone who can help right now. If you're in the US, call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741. If you're elsewhere, contact your local emergency services or crisis line. You matter, and help is available.";
  }
  return null;
}

// Light keyword responder used when the AI is unavailable.
function numiKeywordReply(message: string): string | null {
  const lower = message.toLowerCase();
  if (/(sad|down|low|depress|hopeless|miserable)/.test(lower)) {
    return "Thanks for telling me — that takes courage. You don't have to solve it all today. What's one small thing that usually brings you a little comfort?";
  }
  if (/(stress|stressed|overwhelm|anxious|anxiety|worried|panic)/.test(lower)) {
    return "That sounds heavy. Let's bring it down a notch: name the smallest next step, then breathe out slowly for six seconds. Want me to walk you through a quick wind-down?";
  }
  if (/(tired|exhausted|fatigue|sleep|insomnia)/.test(lower)) {
    return "Rest counts as progress. Is tonight a night to wrap up a little earlier and protect your sleep?";
  }
  if (/(grateful|gratitude|thankful)/.test(lower)) {
    return "I love that. Gratitude is a small daily reset for the mind — want to capture it in your journal so you can look back on it?";
  }
  if (/(workout|exercise|run|gym|walk|yoga|stretch)/.test(lower)) {
    return "Movement is self-respect in action. If a full session feels like too much, a 10-minute walk still counts — and so does showing up at all.";
  }
  if (/(procrastinat|avoid|can't start|cant start|stuck)/.test(lower)) {
    return "Starting is the hard part, not the work. Try a 5-minute timer on just the first tiny step — you're allowed to stop after that.";
  }
  return null;
}

// Canned, personalized replies for the quick actions and any other message.
function numiFallbackReply(ctx: NumiContext, intent: string | null): string {
  const name = ctx.firstName ?? null;
  const greet = name ?? "friend";
  switch (intent) {
    case "motivate":
      return ctx.currentStreak > 0
        ? `${greet}, you've shown up ${ctx.currentStreak} day${ctx.currentStreak === 1 ? "" : "s"} in a row. That's not luck — that's you choosing yourself, repeatedly. One small thing today is plenty.`
        : "One small thing today is plenty — and it counts. What's the easiest win you can grab in the next five minutes?";
    case "relax":
      return "Let's do 60 seconds of breathing together. In for 4, hold for 4, out for 6. I'll be right here when you're done.";
    case "focus":
      return "Try a 15-minute Focus Sprint. Pick one task, silence the rest, and I'll keep the timer. Want me to point you to Mind Gym?";
    case "goal":
      return "Let's make it small and specific: \"Walk 15 minutes after lunch, 4 days this week.\" Add it to your Quest and I'll keep you honest.";
    case "plan":
      return "Top 3 for today: 1) Daily Reset 2) One focus sprint on your main task 3) A short walk outside. Everything else is a bonus.";
    case "journal":
      return "Here's a prompt: what's one thing that went better than you expected this week?";
    case "celebrate":
      return ctx.gardenStage != null
        ? `Here's what you've built: ${ctx.xpTotal} XP, ${ctx.levelName} level ${ctx.levelNumber}, and a garden at stage ${ctx.gardenStage}. That's real progress.`
        : `Here's what you've built: ${ctx.xpTotal} XP and ${ctx.levelName} level ${ctx.levelNumber}. That's real progress.`;
    case "wind_down":
      return "Screens down, lights low. Try the Evening Wind Down in Mind Gym — six minutes and your brain gets the hint.";
    default:
      return `I hear you${name ? `, ${name}` : ""}. Let's keep it small: pick one thing from Today's Journey and I'll cheer you on.`;
  }
}

// ---------------------------------------------------------------------------
// 21. Focus Zone (daily plans, tasks, history, stats)
// ---------------------------------------------------------------------------

export type FocusTask = { id: string; title: string; done: boolean };

export type MyFocusPlan = {
  id: string | null;
  date: string;
  top3: string[];
  brainDump: string | null;
  tasks: FocusTask[];
};

export type SaveFocusPlanInput = {
  date?: string | null;
  top3?: string[] | null;
  brainDump?: string | null;
  tasks?: FocusTask[] | null;
};

// Normalize the raw jsonb task list into stable, typed tasks (assigning an id
// to any task that doesn't have one, e.g. legacy rows).
function normalizeFocusTasks(value: unknown): FocusTask[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const t = (raw ?? {}) as { id?: unknown; title?: unknown; done?: unknown };
    return {
      id: typeof t.id === "string" && t.id ? t.id : crypto.randomUUID(),
      title: typeof t.title === "string" ? t.title : "",
      done: t.done === true,
    };
  });
}

function top3FromJson(value: Json, size = 3): string[] {
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length: size }, (_, i) => String(raw[i] ?? ""));
}

export const getMyFocusPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { date?: string | null }) => d)
  .handler(async ({ context, data }): Promise<MyFocusPlan> => {
    const { supabase, userId } = context;
    const date = data.date ?? toDateKey(new Date());
    const { data: plan, error } = await supabase
      .from("focus_plans")
      .select("id, date, top_3, brain_dump, tasks")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plan) return { id: null, date, top3: ["", "", ""], brainDump: null, tasks: [] };
    return {
      id: plan.id,
      date: plan.date,
      top3: top3FromJson(plan.top_3),
      brainDump: plan.brain_dump,
      tasks: normalizeFocusTasks(plan.tasks),
    };
  });

export const saveFocusPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SaveFocusPlanInput) => d)
  .handler(async ({ context, data }): Promise<MyFocusPlan> => {
    const { supabase, userId } = context;
    const date = data.date ?? toDateKey(new Date());

    const { data: current } = await supabase
      .from("focus_plans")
      .select("top_3, brain_dump, tasks")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    // Merge semantics: only the fields the client sends are replaced; the rest
    // keep whatever was already saved for the day. `undefined` = keep current.
    const hasTop3 = Array.isArray(data.top3);
    const hasBrainDump = data.brainDump !== undefined;
    const hasTasks = Array.isArray(data.tasks);

    const patch = {
      top_3: hasTop3
        ? top3FromJson(data.top3 as string[])
        : Array.isArray(current?.top_3)
          ? current.top_3
          : [],
      brain_dump: hasBrainDump
        ? (data.brainDump as string).trim() || null
        : current?.brain_dump ?? null,
      tasks: hasTasks
        ? normalizeFocusTasks(data.tasks)
        : Array.isArray(current?.tasks)
          ? current.tasks
          : [],
    };

    const { data: saved, error } = await supabase
      .from("focus_plans")
      .upsert({ user_id: userId, date, ...patch }, { onConflict: "user_id,date" })
      .select("id, date, top_3, brain_dump, tasks")
      .single();
    if (error) throw new Error(error.message);

    return {
      id: saved.id,
      date: saved.date,
      top3: top3FromJson(saved.top_3),
      brainDump: saved.brain_dump,
      tasks: normalizeFocusTasks(saved.tasks),
    };
  });

export type ToggleFocusTaskInput = {
  planId?: string | null;
  taskId: string;
  done: boolean;
  tasks: FocusTask[];
};

export const toggleFocusTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: ToggleFocusTaskInput) => d)
  .handler(async ({ context, data }): Promise<{ planId: string; xpAwarded: number }> => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());
    const tasks = normalizeFocusTasks(data.tasks);

    // Resolve the plan (must belong to the caller); otherwise upsert a new one.
    let planId: string | null = data.planId ?? null;
    if (planId) {
      const { data: owned } = await supabase
        .from("focus_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!owned) planId = null;
    }

    let savedPlanId: string;
    if (planId) {
      const { data, error } = await supabase
        .from("focus_plans")
        .update({ tasks })
        .eq("id", planId)
        .eq("user_id", userId)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      savedPlanId = data.id;
    } else {
      const { data, error } = await supabase
        .from("focus_plans")
        .upsert({ user_id: userId, date: today, tasks }, { onConflict: "user_id,date" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      savedPlanId = data.id;
    }

    // Award XP once per completed task (idempotent via sourceId = task id).
    let xpAwarded = 0;
    if (data.done) {
      try {
        const { awarded } = await awardXp({
          data: {
            amount: 5,
            sourceType: "focus_task",
            sourceId: data.taskId,
            description: "Focus task complete",
          },
        });
        xpAwarded = awarded ? 5 : 0;
      } catch (err) {
        console.error("[Focus] task XP skipped:", err);
      }
    }
    return { planId: savedPlanId, xpAwarded };
  });

// Bonus paid once per day when a full Pomodoro cycle (all work blocks) finishes.
export const claimFocusCycleBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { awarded } = await awardXp({
        data: {
          amount: 10,
          sourceType: "focus_pomodoro",
          sourceId: toDateKey(new Date()),
          description: "Pomodoro cycle complete",
        },
      });
      return { xpAwarded: awarded ? 10 : 0 };
    } catch (err) {
      console.error("[Focus] cycle bonus skipped:", err);
      return { xpAwarded: 0 };
    }
  });

export type FocusHistoryPoint = { date: string; minutes: number };

export type MyFocusHistory = {
  sessions: Array<{
    id: string;
    task: string | null;
    durationMinutes: number;
    notes: string | null;
    distractions: number;
    completedAt: string;
  }>;
  todayMinutes: number;
  weekMinutes: number;
  sessionsToday: number;
  focusStreak: number;
  last7Days: FocusHistoryPoint[];
};

export const getMyFocusHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyFocusHistory> => {
    const { supabase, userId } = context;
    const todayKey = toDateKey(new Date());

    const { data: rows, error } = await supabase
      .from("focus_sessions")
      .select("id, task, duration_minutes, notes, distractions, completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const sessions = (rows ?? [])
      .filter((r) => r.completed_at != null)
      .map((r) => ({
        id: r.id,
        task: r.task,
        durationMinutes: r.duration_minutes,
        notes: r.notes,
        distractions: r.distractions,
        completedAt: r.completed_at as string,
      }));

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    let todayMinutes = 0;
    let weekMinutes = 0;
    let sessionsToday = 0;
    const last7Days = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7Days.set(toDateKey(d), 0);
    }

    const daySet = new Set<string>();
    for (const s of sessions) {
      const doneAt = new Date(s.completedAt);
      const dateKey = toDateKey(doneAt);
      daySet.add(dateKey);
      if (dateKey === todayKey) {
        todayMinutes += s.durationMinutes;
        sessionsToday += 1;
      }
      if (doneAt >= monday) weekMinutes += s.durationMinutes;
      if (last7Days.has(dateKey)) {
        last7Days.set(dateKey, (last7Days.get(dateKey) ?? 0) + s.durationMinutes);
      }
    }

    return {
      sessions: sessions.slice(0, 20),
      todayMinutes,
      weekMinutes,
      sessionsToday,
      focusStreak: computeCurrentStreak(daySet, todayKey),
      last7Days: [...last7Days.entries()].map(([date, minutes]) => ({ date, minutes })),
    };
  });
// ---------------------------------------------------------------------------
// 15c. My Analytics — per-user dashboard data, computed from existing tables
// ---------------------------------------------------------------------------

export type AnalyticsDatePoint = { date: string; value: number };
export type AnalyticsSourceSlice = { source: string; value: number; count: number };
export type AnalyticsCountSlice = { source: string; count: number };
export type AnalyticsWellbeingPoint = {
  date: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  stress: number | null;
};
export type AnalyticsFocusPoint = { date: string; minutes: number; sessions: number };

export type MyAnalytics = {
  summary: {
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    resetsCompleted: number;
    focusSessions: number;
    focusMinutes: number;
    journalEntries: number;
    habitsLogged: number;
    gamePlays: number;
    questsCompleted: number;
    badgesEarned: number;
    mindGymCompletions: number;
    lessonsCompleted: number;
    goalsAchieved: number;
  };
  xpDaily: AnalyticsDatePoint[];
  xpBySource: AnalyticsSourceSlice[];
  wellbeing: AnalyticsWellbeingPoint[];
  focusDaily: AnalyticsFocusPoint[];
  journalDaily: AnalyticsDatePoint[];
  journalTypeBreakdown: AnalyticsCountSlice[];
  habitDaily: AnalyticsDatePoint[];
  resetDaily: AnalyticsDatePoint[];
  games: AnalyticsCountSlice[];
};

export const getMyAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAnalytics> => {
    const { supabase, userId } = context;
    const todayKey = toDateKey(new Date());
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const since = toDateKey(cutoff);

    const [
      xpRes,
      resetsRes,
      mindRes,
      focusRes,
      journalRes,
      habitLogsRes,
      playsRes,
      questRes,
      badgesRes,
      mindGymRes,
      learningRes,
      goalsRes,
    ] = await Promise.all([
      supabase
        .from("xp_transactions")
        .select("amount, source_type, created_at")
        .eq("user_id", userId),
      supabase
        .from("daily_resets")
        .select("date, completed, mood, energy, focus")
        .eq("user_id", userId),
      supabase
        .from("mind_checks")
        .select("date, mood, energy, focus, stress")
        .eq("user_id", userId),
      supabase
        .from("focus_sessions")
        .select("duration_minutes, completed_at, status")
        .eq("user_id", userId)
        .eq("status", "completed")
        .not("completed_at", "is", null),
      supabase
        .from("journal_entries")
        .select("journal_type, created_at")
        .eq("user_id", userId),
      supabase.from("habit_logs").select("date").eq("user_id", userId),
      supabase.from("game_plays").select("game, played_at").eq("user_id", userId),
      supabase
        .from("quest_completions")
        .select("id")
        .eq("user_id", userId)
        .eq("completed", true),
      supabase.from("user_badges").select("id").eq("user_id", userId),
      supabase.from("mind_gym_completions").select("id").eq("user_id", userId),
      supabase
        .from("learning_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed"),
      supabase
        .from("goals")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed"),
    ]);

    const withinWindow = (date: string) => date >= since;

    // ---- XP -----------------------------------------------------------------
    const xpRows = xpRes.data ?? [];
    const totalXp = xpRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    const xpByDay = new Map<string, number>();
    const bySrc = new Map<string, { value: number; count: number }>();
    for (const r of xpRows) {
      const day = (r.created_at ?? "").slice(0, 10);
      if (day && withinWindow(day)) {
        xpByDay.set(day, (xpByDay.get(day) ?? 0) + (r.amount ?? 0));
      }
      const src = r.source_type || "other";
      const cur = bySrc.get(src) ?? { value: 0, count: 0 };
      cur.value += r.amount ?? 0;
      cur.count += 1;
      bySrc.set(src, cur);
    }
    const xpDaily = [...xpByDay.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const xpBySource = [...bySrc.entries()]
      .map(([source, v]) => ({ source, value: v.value, count: v.count }))
      .sort((a, b) => b.value - a.value);

    // ---- Wellbeing (mood / energy / focus / stress across days) -------------
    const wellbeingMap = new Map<string, AnalyticsWellbeingPoint>();
    for (const r of resetsRes.data ?? []) {
      if (!withinWindow(r.date)) continue;
      wellbeingMap.set(r.date, {
        date: r.date,
        mood: r.mood ?? null,
        energy: r.energy ?? null,
        focus: r.focus ?? null,
        stress: null,
      });
    }
    for (const r of mindRes.data ?? []) {
      if (!withinWindow(r.date)) continue;
      const existing = wellbeingMap.get(r.date);
      wellbeingMap.set(r.date, {
        date: r.date,
        mood: r.mood ?? existing?.mood ?? null,
        energy: r.energy ?? existing?.energy ?? null,
        focus: r.focus ?? existing?.focus ?? null,
        stress: r.stress ?? null,
      });
    }
    const wellbeing = [...wellbeingMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // ---- Focus --------------------------------------------------------------
    const focusRows = focusRes.data ?? [];
    const focusMap = new Map<string, { minutes: number; sessions: number }>();
    for (const r of focusRows) {
      if (!r.completed_at) continue;
      const day = r.completed_at.slice(0, 10);
      if (!withinWindow(day)) continue;
      const cur = focusMap.get(day) ?? { minutes: 0, sessions: 0 };
      cur.minutes += r.duration_minutes ?? 0;
      cur.sessions += 1;
      focusMap.set(day, cur);
    }
    const focusDaily = [...focusMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ---- Journal ------------------------------------------------------------
    const journalRows = journalRes.data ?? [];
    const journalByDay = new Map<string, number>();
    const typeBy = new Map<string, number>();
    for (const r of journalRows) {
      const day = (r.created_at ?? "").slice(0, 10);
      if (day && withinWindow(day)) {
        journalByDay.set(day, (journalByDay.get(day) ?? 0) + 1);
      }
      const type = r.journal_type || "journal";
      typeBy.set(type, (typeBy.get(type) ?? 0) + 1);
    }
    const journalDaily = [...journalByDay.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const journalTypeBreakdown = [...typeBy.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Habits -------------------------------------------------------------
    const habitRows = habitLogsRes.data ?? [];
    const habitByDay = new Map<string, number>();
    for (const r of habitRows) {
      if (!withinWindow(r.date)) continue;
      habitByDay.set(r.date, (habitByDay.get(r.date) ?? 0) + 1);
    }
    const habitDaily = [...habitByDay.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ---- Daily Reset + streak -----------------------------------------------
    const resetRows = resetsRes.data ?? [];
    const resetByDay = new Map<string, number>();
    for (const r of resetRows) {
      if (!withinWindow(r.date)) continue;
      if (r.completed) {
        resetByDay.set(r.date, 1);
      } else if (!resetByDay.has(r.date)) {
        resetByDay.set(r.date, 0);
      }
    }
    const resetDaily = [...resetByDay.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Streak is computed on completed resets across all time (not just a year).
    const allDone = new Set(resetRows.filter((r) => r.completed).map((r) => r.date));
    const currentStreak = computeCurrentStreak(allDone, todayKey);
    const sortedDone = [...allDone].sort();
    let longestStreak = 0;
    let run = 0;
    let prevDate: string | null = null;
    for (const d of sortedDone) {
      const diff =
        prevDate === null
          ? 0
          : Math.round(
              (new Date(d).getTime() - new Date(prevDate).getTime()) / 86400000,
            );
      run = diff === 1 ? run + 1 : 1;
      if (run > longestStreak) longestStreak = run;
      prevDate = d;
    }

    // ---- Games --------------------------------------------------------------
    const playsRows = playsRes.data ?? [];
    const gameMap = new Map<string, number>();
    for (const r of playsRows) {
      const game = r.game || "game";
      gameMap.set(game, (gameMap.get(game) ?? 0) + 1);
    }
    const games = [...gameMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Active days --------------------------------------------------------
    const activeSet = new Set<string>([...xpByDay.keys(), ...resetByDay.keys()]);
    for (const p of wellbeing) activeSet.add(p.date);
    for (const p of focusDaily) activeSet.add(p.date);
    for (const p of journalDaily) activeSet.add(p.date);
    for (const p of habitDaily) activeSet.add(p.date);
    for (const r of playsRows) {
      const day = (r.played_at ?? "").slice(0, 10);
      if (day) activeSet.add(day);
    }

    return {
      summary: {
        totalXp,
        currentStreak,
        longestStreak,
        activeDays: activeSet.size,
        resetsCompleted: resetRows.filter((r) => r.completed).length,
        focusSessions: focusRows.length,
        focusMinutes: focusRows.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0),
        journalEntries: journalRows.length,
        habitsLogged: habitRows.length,
        gamePlays: playsRows.length,
        questsCompleted: questRes.data?.length ?? 0,
        badgesEarned: badgesRes.data?.length ?? 0,
        mindGymCompletions: mindGymRes.data?.length ?? 0,
        lessonsCompleted: learningRes.data?.length ?? 0,
        goalsAchieved: goalsRes.data?.length ?? 0,
      },
      xpDaily,
      xpBySource,
      wellbeing,
      focusDaily,
      journalDaily,
      journalTypeBreakdown,
      habitDaily,
      resetDaily,
      games,
    };
  });


// ---------------------------------------------------------------------------
// 22. Settings, security & data (preferences, password, export, delete)
// ---------------------------------------------------------------------------

export type UserSettings = {
  theme: "light" | "dark" | "system";
  fontScale: number;
  reduceMotion: boolean;
  highContrast: boolean;
  dailyResetReminder: boolean;
  streakNudges: boolean;
  gardenRewards: boolean;
  communityActivity: boolean;
  reminderTime: "Morning" | "Afternoon" | "Evening" | "Custom";
  privateJournal: boolean;
  numiPersonalization: boolean;
  numiMemory: boolean;
  showNickname: boolean;
  appearInMilestones: boolean;
};

type UserPreferencesRow = Database["public"]["Tables"]["user_preferences"]["Row"];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "light",
  fontScale: 100,
  reduceMotion: false,
  highContrast: false,
  dailyResetReminder: true,
  streakNudges: true,
  gardenRewards: true,
  communityActivity: false,
  reminderTime: "Morning",
  privateJournal: true,
  numiPersonalization: true,
  numiMemory: true,
  showNickname: true,
  appearInMilestones: true,
};

const REMINDER_TIMES: readonly UserSettings["reminderTime"][] = [
  "Morning",
  "Afternoon",
  "Evening",
  "Custom",
];

const SETTINGS_FIELD_MAP: Record<keyof UserSettings, keyof UserPreferencesRow> = {
  theme: "theme",
  fontScale: "font_scale",
  reduceMotion: "reduce_motion",
  highContrast: "high_contrast",
  dailyResetReminder: "daily_reset_reminder",
  streakNudges: "streak_nudges",
  gardenRewards: "garden_rewards",
  communityActivity: "community_activity",
  reminderTime: "reminder_time",
  privateJournal: "private_journal",
  numiPersonalization: "numi_personalization",
  numiMemory: "numi_memory",
  showNickname: "show_nickname",
  appearInMilestones: "appear_in_milestones",
};

function mapSettingsRow(row: UserPreferencesRow): UserSettings {
  return {
    theme: row.theme === "dark" || row.theme === "system" ? row.theme : "light",
    fontScale: row.font_scale,
    reduceMotion: row.reduce_motion,
    highContrast: row.high_contrast,
    dailyResetReminder: row.daily_reset_reminder,
    streakNudges: row.streak_nudges,
    gardenRewards: row.garden_rewards,
    communityActivity: row.community_activity,
    reminderTime: REMINDER_TIMES.includes(row.reminder_time as UserSettings["reminderTime"])
      ? (row.reminder_time as UserSettings["reminderTime"])
      : "Morning",
    privateJournal: row.private_journal,
    numiPersonalization: row.numi_personalization,
    numiMemory: row.numi_memory,
    showNickname: row.show_nickname,
    appearInMilestones: row.appear_in_milestones,
  };
}

export const getMySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserSettings> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULT_SETTINGS;
    return mapSettingsRow(data);
  });

export type SaveSettingsInput = { patch: Partial<UserSettings> };

export const saveMySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SaveSettingsInput) => d)
  .handler(async ({ context, data }): Promise<UserSettings> => {
    const { supabase, userId } = context;
    const row: Record<string, unknown> = { id: userId };
    for (const key of Object.keys(data.patch) as (keyof UserSettings)[]) {
      const value = data.patch[key];
      if (value === undefined) continue;
      row[SETTINGS_FIELD_MAP[key]] = value;
    }
    const { data: saved, error } = await supabase
      .from("user_preferences")
      .upsert(row as UserPreferencesRow, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapSettingsRow(saved);
  });



export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { newPassword: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    if (!data.newPassword || data.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }
    const { error } = await context.supabase.auth.updateUser({ password: data.newPassword });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type MyDataExport = {
  exportedAt: string;
  app: string;
  [table: string]: Json | Json[] | undefined;
};

// Owned tables keyed by user_id (plus the id-keyed profiles/preferences below).
const USER_TABLES_BY_USER_ID = [
  "goals",
  "daily_resets",
  "wellness_habits",
  "habit_logs",
  "mind_checks",
  "mind_gym_completions",
  "focus_sessions",
  "quest_completions",
  "journal_entries",
  "learning_progress",
  "xp_transactions",
  "user_badges",
  "gardens",
  "user_garden_items",
  "memories",
  "user_rewards",
  "ai_conversations",
  "ai_conversation_messages",
  "ai_memories",
  "notifications",
  "subscriptions",
  "game_plays",
  "focus_plans",
  "community_posts",
  "community_reactions",
  "user_roles",
] as const;

const USER_TABLES_BY_ID = ["profiles", "user_preferences"] as const;

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyDataExport> => {
    const { supabase, userId } = context;
    const payload: MyDataExport = {
      exportedAt: new Date().toISOString(),
      app: "NuMind Wellness Hub",
    };

    for (const table of USER_TABLES_BY_ID) {
      const { data, error } = await supabase.from(table).select("*").eq("id", userId);
      if (error) throw new Error(error.message);
      payload[table] = data ?? [];
    }
    for (const table of USER_TABLES_BY_USER_ID) {
      const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
      if (error) throw new Error(error.message);
      payload[table] = data ?? [];
    }
    return payload;
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { userId } = context;
    // Deleting the auth user cascades to every owned row (all owned tables
    // reference auth.users(id) on delete cascade), so a single admin call is
    // the complete, race-free account deletion.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 23. Rewards marketplace (catalog, spendable XP balance, redeem, equip)
// ---------------------------------------------------------------------------

export type RewardCategory = {
  id: string;
  label: string;
  emoji: string;
};

export const REWARD_CATEGORIES: RewardCategory[] = [
  { id: "garden_decoration", label: "Garden Decorations", emoji: "Flower2" },
  { id: "numi_accessory", label: "Numi Accessories", emoji: "Bot" },
  { id: "theme", label: "Themes", emoji: "Palette" },
  { id: "avatar_accessory", label: "Avatar Accessories", emoji: "UserRound" },
  { id: "badge_frame", label: "Badge Frames", emoji: "Medal" },
  { id: "sticker", label: "Stickers", emoji: "Sparkles" },
  { id: "relaxation_content", label: "Relaxation Content", emoji: "Moon" },
  { id: "seasonal", label: "Seasonal Items", emoji: "Gift" },
];

export type MarketplaceReward = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rewardType: string;
  categoryLabel: string;
  categoryEmoji: string;
  emoji: string | null;
  xpCost: number;
  unlockLevel: number;
  premiumRequired: boolean;
  limited: boolean;
  owned: boolean;
  equipped: boolean;
};

export type RewardsMarketplace = {
  balance: number;
  lifetimeXp: number;
  level: { number: number; name: string };
  isPremium: boolean;
  equippedId: string | null;
  rewards: MarketplaceReward[];
};

// Spendable balance = lifetime XP earned minus XP spent on rewards. Lifetime XP
// (and therefore levels) never decreases — purchases only consume the balance.
async function getRewardsMarketplaceSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RewardsMarketplace> {
  const [catalogRes, ownedRes, xpRes, spentRes, levelRes, subRes] = await Promise.all([
    supabase.from("rewards").select("*").eq("active", true).order("xp_cost"),
    supabase.from("user_rewards").select("reward_id, equipped").eq("user_id", userId),
    supabase.from("xp_transactions").select("amount").eq("user_id", userId),
    supabase.from("user_rewards").select("xp_spent").eq("user_id", userId),
    supabase
      .from("levels")
      .select("level_number, name, xp_required")
      .order("xp_required"),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .maybeSingle(),
  ]);

  if (catalogRes.error) throw new Error(catalogRes.error.message);
  if (ownedRes.error) throw new Error(ownedRes.error.message);
  if (xpRes.error) throw new Error(xpRes.error.message);
  if (spentRes.error) throw new Error(spentRes.error.message);
  if (levelRes.error) throw new Error(levelRes.error.message);
  if (subRes.error) throw new Error(subRes.error.message);

  const lifetimeXp = (xpRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  const spent = (spentRes.data ?? []).reduce((s, r) => s + (r.xp_spent ?? 0), 0);

  const ownedMap = new Map((ownedRes.data ?? []).map((r) => [r.reward_id, r.equipped]));
  let equippedId: string | null = null;
  for (const [id, isEquipped] of ownedMap) {
    if (isEquipped) equippedId = id;
  }

  let currentLevel = (levelRes.data ?? [])[0] ?? { level_number: 1, name: "Explorer" };
  for (const l of levelRes.data ?? []) {
    if (lifetimeXp >= (l.xp_required ?? 0)) currentLevel = l;
  }

  const rewards: MarketplaceReward[] = (catalogRes.data ?? []).map((r) => {
    const cat = REWARD_CATEGORIES.find((c) => c.id === r.reward_type);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      rewardType: r.reward_type,
      categoryLabel: cat?.label ?? r.reward_type,
      categoryEmoji: cat?.emoji ?? "Gift",
      emoji: r.emoji,
      xpCost: r.xp_cost,
      unlockLevel: r.unlock_level,
      premiumRequired: r.premium_required,
      limited: r.reward_type === "seasonal",
      owned: ownedMap.has(r.id),
      equipped: ownedMap.get(r.id) === true,
    };
  });

  return {
    balance: Math.max(0, lifetimeXp - spent),
    lifetimeXp,
    level: { number: currentLevel.level_number, name: currentLevel.name },
    isPremium: !!subRes.data,
    equippedId,
    rewards,
  };
}


export const getRewardsMarketplace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RewardsMarketplace> => {
    return getRewardsMarketplaceSummary(context.supabase, context.userId);
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { rewardId: string }) => d)
  .handler(async ({ context, data }): Promise<RewardsMarketplace> => {
    const { supabase, userId } = context;
    const { rewardId } = data;

    const { data: reward } = await supabase
      .from("rewards")
      .select("id, xp_cost, unlock_level, premium_required, active")
      .eq("id", rewardId)
      .eq("active", true)
      .maybeSingle();
    if (!reward) throw new Error("That reward isn't available right now.");

    // Idempotency guard: already owned → just return the current state.
    const { data: existing } = await supabase
      .from("user_rewards")
      .select("id")
      .eq("user_id", userId)
      .eq("reward_id", rewardId)
      .maybeSingle();
    if (existing) return getRewardsMarketplaceSummary(supabase, userId);

    const [xpRes, spentRes, levelRes, subRes] = await Promise.all([
      supabase.from("xp_transactions").select("amount").eq("user_id", userId),
      supabase.from("user_rewards").select("xp_spent").eq("user_id", userId),
      supabase.from("levels").select("level_number, xp_required").order("xp_required"),
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .maybeSingle(),
    ]);

    const lifetimeXp = (xpRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
    const spent = (spentRes.data ?? []).reduce((s, r) => s + (r.xp_spent ?? 0), 0);
    if (lifetimeXp - spent < reward.xp_cost) {
      throw new Error("Not enough XP for this reward yet.");
    }

    let currentLevel = 1;
    for (const l of levelRes.data ?? []) {
      if (lifetimeXp >= (l.xp_required ?? 0)) currentLevel = l.level_number;
    }
    if (currentLevel < reward.unlock_level) {
      throw new Error(`Reach Level ${reward.unlock_level} to unlock this reward.`);
    }

    const isPremium = !!subRes.data;
    if (reward.premium_required && !isPremium) {
      throw new Error("This reward is part of NuMind Plus.");
    }

    const { error } = await supabase.from("user_rewards").insert({
      user_id: userId,
      reward_id: rewardId,
      xp_spent: reward.xp_cost,
      equipped: false,
    });
    if (error) {
      // 23505 = unique (user_id, reward_id); a concurrent redeem won the race.
      if (error.code !== "23505") throw new Error(error.message);
    }

    return getRewardsMarketplaceSummary(supabase, userId);
  });

export const equipReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { rewardId: string | null }) => d)
  .handler(async ({ context, data }): Promise<RewardsMarketplace> => {
    const { supabase, userId } = context;
    const { rewardId } = data;

    if (rewardId) {
      const { data: owned } = await supabase
        .from("user_rewards")
        .select("id")
        .eq("user_id", userId)
        .eq("reward_id", rewardId)
        .maybeSingle();
      if (!owned) throw new Error("Unlock this reward before equipping it.");
    }

    // One equipped reward at a time: clear first, then set the new one.
    const { error: clearError } = await supabase
      .from("user_rewards")
      .update({ equipped: false })
      .eq("user_id", userId);
    if (clearError) throw new Error(clearError.message);

    if (rewardId) {
      const { error: equipError } = await supabase
        .from("user_rewards")
        .update({ equipped: true })
        .eq("user_id", userId)
        .eq("reward_id", rewardId);
      if (equipError) throw new Error(equipError.message);
    }

    return getRewardsMarketplaceSummary(supabase, userId);
  });

