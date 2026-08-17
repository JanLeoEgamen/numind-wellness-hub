import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { GARDEN_STAGES, LEVELS, TODAYS_JOURNEY } from "./mock-data";
import {
  getMyStats,
  getMyJournalStreak,
  getMyJournalEntryCount,
  claimDailyReward as serverClaimDailyReward,
} from "./server-functions";

export type Celebration = {
  emoji: string;
  title: string;
  message: string;
  xp?: number;
  chain?: string[];
};

type State = {
  xp: number;
  levelIndex: number;
  streak: number;
  longestStreak: number;
  gardenXp: number;
  completed: string[];
  claimedReward: boolean;
  theme: "light" | "dark" | "system";
  fontScale: number;
  celebration: Celebration | null;
  journalStreak: { currentStreak: number; longestStreak: number };
  journalEntryCount: number;
};

type Ctx = State & {
  levelName: string;
  levelEmoji: string;
  xpInLevel: number;
  xpForLevel: number;
  gardenStage: (typeof GARDEN_STAGES)[number];
  gardenNext: (typeof GARDEN_STAGES)[number] | null;
  totalTasks: number;
  completeTask: (id: string, opts?: { title?: string; xp?: number; chain?: string[] }) => void;
  awardXp: (xp: number, label: string) => void;
  claimDailyReward: () => void;
  setTheme: (t: State["theme"]) => void;
  setFontScale: (n: number) => void;
  celebrate: (c: Celebration) => void;
  dismissCelebration: () => void;
  isComplete: (id: string) => boolean;
};

const XP_PER_LEVEL = 2000;

const NuMindContext = createContext<Ctx | null>(null);

export function NuMindProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    xp: 1240,
    levelIndex: 2,
    streak: 12,
    longestStreak: 18,
    gardenXp: 1340,
    completed: ["reset", "mindgym", "hydration"],
    claimedReward: false,
    theme: "light",
    fontScale: 100,
    celebration: null,
    journalStreak: { currentStreak: 0, longestStreak: 0 },
    journalEntryCount: 0,
  });

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const dark = state.theme === "dark" || (state.theme === "system" && prefersDark);
    root.classList.toggle("dark", !!dark);
  }, [state.theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.fontScale}%`;
  }, [state.fontScale]);

  // Hydrate the mock store from real backend stats (XP, level, streaks,
  // garden) once on mount. Ignored when not signed in / offline. Server totals
  // are the source of truth here — the warm mock defaults are only a placeholder
  // and must NOT mask real (smaller) persisted XP after a refresh.
  useEffect(() => {
    let cancelled = false;
    getMyStats()
      .then((stats) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          xp: stats.xpTotal,
          levelIndex: Math.max(0, stats.level.number - 1),
          streak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          gardenXp: stats.garden ? stats.garden.growthPoints : s.gardenXp,
          completed: stats.todayCompleted
            ? s.completed.includes("reset")
              ? s.completed
              : [...s.completed, "reset"]
            : s.completed,
        }));
      })
      .catch(() => {
        // Not authenticated or offline — keep the warm mock defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate journal streak + entry count from the backend once on mount,
  // reusing the same guarded hydration pattern as getMyStats above.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyJournalStreak(), getMyJournalEntryCount()])
      .then(([streak, count]) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          journalStreak: { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak },
          journalEntryCount: count.totalEntries,
        }));
      })
      .catch(() => {
        // Not authenticated or offline — keep the warm mock defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const celebrate = useCallback((c: Celebration) => {
    setState((s) => ({ ...s, celebration: c }));
  }, []);

  const awardXp = useCallback((xp: number, label: string) => {
    setState((s) => ({ ...s, xp: s.xp + xp, gardenXp: s.gardenXp + Math.round(xp / 2) }));
    toast.success(`+${xp} XP`, { description: label });
  }, []);

  const completeTask = useCallback<Ctx["completeTask"]>(
    (id, opts = {}) => {
      const task = TODAYS_JOURNEY.find((t) => t.id === id);
      const xp = opts.xp ?? task?.xp ?? 20;
      const title = opts.title ?? task?.title ?? "Activity complete";
      let already = false;
      setState((s) => {
        already = s.completed.includes(id);
        if (already) return s;
        return {
          ...s,
          completed: [...s.completed, id],
          xp: s.xp + xp,
          gardenXp: s.gardenXp + Math.round(xp / 2),
        };
      });
      if (already) return;
      toast.success(`+${xp} XP`, { description: `${title} complete 🎉` });
      celebrate({
        emoji: "🎉",
        title: `${title} complete!`,
        message: "You showed up for yourself today.",
        xp,
        chain: opts.chain ?? [
          `+${xp} XP earned`,
          "Today's Journey updated",
          "Quest progress updated",
          "Garden growth updated",
          "Badge progress updated",
          "Numi is celebrating 🤖",
        ],
      });
    },
    [celebrate],
  );

  const claimDailyReward = useCallback(() => {
    setState((s) => (s.claimedReward ? s : { ...s, claimedReward: true, xp: s.xp + 50 }));
    // Persist the reward server-side (idempotent, once per day).
    serverClaimDailyReward().catch(() => {});
    toast.success("+50 XP", { description: "Daily reward claimed 🎁" });
    celebrate({
      emoji: "🎁",
      title: "Daily reward claimed!",
      message: "A Butterfly Flock landed in your garden.",
      xp: 50,
      chain: ["+50 XP earned", "Garden item unlocked", "Rewards balance updated"],
    });
  }, [celebrate]);

  const value = useMemo<Ctx>(() => {
    const level = LEVELS[Math.min(state.levelIndex, LEVELS.length - 1)] ?? LEVELS[0]!;
    const stageIndex = Math.max(
      0,
      GARDEN_STAGES.filter((g) => state.gardenXp >= g.threshold).length - 1,
    );
    return {
      ...state,
      levelName: level.name,
      levelEmoji: level.emoji,
      xpInLevel: state.xp % XP_PER_LEVEL,
      xpForLevel: XP_PER_LEVEL,
      gardenStage: GARDEN_STAGES[stageIndex] ?? GARDEN_STAGES[0]!,
      gardenNext: GARDEN_STAGES[stageIndex + 1] ?? null,
      totalTasks: TODAYS_JOURNEY.length,
      completeTask,
      awardXp,
      claimDailyReward,
      celebrate,
      dismissCelebration: () => setState((s) => ({ ...s, celebration: null })),
      setTheme: (theme) => setState((s) => ({ ...s, theme })),
      setFontScale: (fontScale) => setState((s) => ({ ...s, fontScale })),
      isComplete: (id: string) => state.completed.includes(id),
    };
  }, [state, completeTask, awardXp, claimDailyReward, celebrate]);

  return <NuMindContext.Provider value={value}>{children}</NuMindContext.Provider>;
}

export function useNuMind() {
  const ctx = useContext(NuMindContext);
  if (!ctx) throw new Error("useNuMind must be used inside NuMindProvider");
  return ctx;
}
