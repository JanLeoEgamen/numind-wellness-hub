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
  } | null;
  xpTotal: number;
  level: { number: number; name: string; tagline: string | null; emoji: string | null };
  currentStreak: number;
  longestStreak: number;
  garden: { growthPoints: number; stage: number; theme: string } | null;
  todayCompleted: boolean;
};

export const getMyStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyStats> => {
    const { supabase, userId } = context;
    const today = toDateKey(new Date());

    const [profileRes, xpRes, resetRes, gardenRes, levelsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, nickname, avatar, preferred_motivational_style, onboarding_completed",
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
    };
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
    const ensureResetMemory = async () => {
      const { data: existing } = await supabase
        .from("memories")
        .select("id")
        .eq("user_id", userId)
        .eq("source_type", "daily_reset")
        .limit(1);
      if ((existing ?? []).length) return;
      await supabase.from("memories").insert({
        user_id: userId,
        memory_type: "milestone",
        title: "Your first Daily Reset",
        description: `You showed up on ${date} — that was the first step.`,
        source_type: "daily_reset",
        emoji: "🌞",
      });
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
      await ensureResetMemory().catch(() => {});
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
};

// Records progress for a habit on a given day. Multiple logs per day accumulate.
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
    return { totalToday: (logs ?? []).reduce((s, l) => s + (l.value ?? 0), 0) };
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
    }

    return { xp };
  });

// ---------------------------------------------------------------------------
// 6. Focus sessions
// ---------------------------------------------------------------------------

export type FocusSessionInput = {
  task?: string;
  durationMinutes: number;
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
        task: data.task ?? null,
        duration_minutes: minutes,
        started_at: now,
        completed_at: now,
        status: "completed",
        xp_awarded: xp,
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

    return { xp };
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
          favorite: data.favorite ?? false,
        })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
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

    if (inserted) {
      await awardXp({ data: { amount: 20, sourceType: "journal", sourceId: inserted.id, description: "Journal entry" } });
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
    return { id: inserted?.id };
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
        avatar: !p.anonymous ? (prof?.avatar ?? "🌿") : "🕊️",
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

export const getMyGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: garden } = await supabase
      .from("gardens")
      .select("id, name, stage, growth_points, theme")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: placed } = await supabase
      .from("user_garden_items")
      .select("item_id, placed")
      .eq("user_id", userId);

    return {
      garden,
      placedIds: (placed ?? []).filter((p) => p.placed).map((p) => p.item_id),
    };
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
      .select("growth_points")
      .eq("user_id", userId)
      .maybeSingle();
    if (garden) {
      await supabase
        .from("gardens")
        .update({ growth_points: (garden.growth_points ?? 0) + 25 })
        .eq("user_id", userId);
    }

    return { claimed: true, awarded: true };
  });

// ---------------------------------------------------------------------------
// 18. Healthy Play - record a game session (awards XP once per game per day)
// ---------------------------------------------------------------------------

export const recordGamePlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { game: string; xp?: number }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // NOTE: `game_plays` is a new table (see migrations/..._add_game_plays.sql);
    // it isn't in the generated types yet, so the queries are softly typed.
    const { data: existing } = await (supabase as any)
      .from("game_plays")
      .select("id")
      .eq("user_id", userId)
      .eq("game", data.game)
      .gte("played_at", toDateKey(new Date()))
      .maybeSingle();

    if (existing) {
      return { awarded: false };
    }

    const { data: created } = await (supabase as any)
      .from("game_plays")
      .insert({ user_id: userId, game: data.game, xp_awarded: data.xp ?? 20 })
      .select("id")
      .single();

    if (created?.id) {
      await awardXp({
        data: {
          amount: data.xp ?? 20,
          sourceType: "healthy_play",
          sourceId: created.id,
          description: `Played ${data.game}`,
        },
      }).catch(() => {});
      return { awarded: true };
    }
    return { awarded: false };
  });

