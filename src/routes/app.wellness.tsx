import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HABITS } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { logHabit, toggleHabitFavorite } from "@/lib/server-functions";
import { useMyHabits, isUuid } from "@/lib/server-data";
import {
  PageHeader,
  SoftCard,
  ProgressBar,
  ToneIcon,
  XPBadge,
  DisclaimerNote,
} from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/wellness")({
  head: () => ({
    meta: [
      { title: "My Wellness — NuMind" },
      {
        name: "description",
        content: "Track water, sleep, movement, eating, mindfulness, self-care and outdoor time.",
      },
      { property: "og:title", content: "My Wellness — NuMind" },
      {
        property: "og:description",
        content: "Gentle lifestyle habit tracking with personal goals and XP.",
      },
    ],
  }),
  component: WellnessPage,
});

type HabitView = {
  key: string;
  id: string;
  name: string;
  unit: string;
  emoji: string;
  tone: string;
  value: number;
  goal: number;
  favorite: boolean;
};

// The backend seeds habits by habit_type; mock-data uses shorter keys.
const HABIT_TYPE_TO_MOCK: Record<string, string> = {
  water: "water",
  sleep: "sleep",
  movement: "movement",
  healthy_eating: "eating",
  mindfulness: "mindfulness",
  self_care: "selfcare",
  outdoor_time: "outdoor",
};

function WellnessPage() {
  const { awardXp } = useNuMind();
  const { data: srvHabits } = useMyHabits();
  const [habits, setHabits] = useState<HabitView[]>(() =>
    HABITS.map((h) => ({
      key: h.id,
      id: h.id,
      name: h.name,
      unit: h.unit,
      emoji: h.emoji,
      tone: h.tone,
      value: h.value,
      goal: h.goal,
      favorite: false,
    })),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState(false);

  // Seed/refresh from the backend once the habit list loads. Merges today's
  // totals + goals from the server, keeping mock tone/emoji for display.
  useEffect(() => {
    if (!srvHabits?.length) return;
    setHabits((prev) => {
      const current = new Map(prev.map((h) => [h.key, h.value]));
      return HABITS.map((m) => {
        const s = srvHabits.find((h: any) => HABIT_TYPE_TO_MOCK[h.type] === m.id);
        return {
          key: m.id,
          id: s?.id ?? m.id,
          name: s?.title ?? m.name,
          unit: s?.unit ?? m.unit,
          emoji: s?.emoji ?? m.emoji,
          tone: m.tone,
          value: s?.today ?? current.get(m.id) ?? m.value,
          goal: Number(s?.goal ?? m.goal),
          favorite: s?.favorite ?? false,
        };
      });
    });
  }, [srvHabits]);

  const toggleFav = (item: HabitView) => {
    const next = !item.favorite;
    setHabits((list) => list.map((h) => (h.key === item.key ? { ...h, favorite: next } : h)));
    if (isUuid(item.id)) toggleHabitFavorite({ data: { habitId: item.id, favorite: next } }).catch(() => {});
  };

  const visible = habits.filter((h) => (showFavs ? h.favorite : true));
  const completed = visible.filter((h) => h.value >= h.goal).length;

  const bump = (item: HabitView, delta: number) => {
    setHabits((list) =>
      list.map((h) => (h.key === item.key ? { ...h, value: Math.max(0, h.value + delta) } : h)),
    );
    if (delta < 0) return;
    const next = item.value + delta;

    // With a real server habit, the backend owns the goal reward: it banks XP
    // once per day (keyed on "<habitId>:<date>") and reports how much it
    // actually awarded. We mirror that into the live store so the +20 only
    // shows up when it has been persisted — keeping the number honest after a
    // refresh.
    if (isUuid(item.id)) {
      logHabit({ data: { habitId: item.id, value: 1 } })
        .then((result) => {
          if (result.xpAwarded > 0) {
            awardXp(result.xpAwarded, `${item.name} goal reached`);
          }
        })
        .catch(() => {});
      return;
    }

    // Mock habit (no server row yet): keep the old client-side behaviour.
    if (next === item.goal) {
      awardXp(20, `${item.name} goal reached`);
    }
  };

  const setGoal = (key: string, value: number) => {
    setHabits((list) => list.map((h) => (h.key === key ? { ...h, goal: Math.max(1, value) } : h)));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="Droplets"
        title="My Wellness"
        subtitle="Your everyday habits, your own goals. No pressure, just patterns."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-mint/40 px-4 py-2 text-sm font-semibold">
              {completed}/{visible.length} goals met
            </span>
            <button
              onClick={() => setShowFavs((f) => !f)}
              aria-pressed={showFavs}
              className={cn(
                "focus-ring rounded-full px-4 py-2 text-sm font-semibold",
                showFavs ? "bg-coral/25" : "bg-muted hover:bg-accent",
              )}
            >
              {showFavs ? (
                  <>
                    <Icon symbol="Star" size={13} fill className="mr-1 inline-block align-[-2px] text-sun" /> Favourites on
                  </>
                ) : (
                  <>
                    <Icon symbol="Star" size={13} className="mr-1 inline-block align-[-2px]" /> Favourites
                  </>
                )}
            </button>
          </div>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((h) => {
          const v = h.value;
          const g = h.goal;
          const done = v >= g;
          return (
            <li key={h.key}>
              <SoftCard className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <ToneIcon emoji={h.emoji} tone={h.tone} />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFav(h)}
                      aria-pressed={h.favorite}
                      aria-label={`${h.favorite ? "Remove" : "Add"} ${h.name} to favourites`}
                      className={cn(
                        "focus-ring grid h-8 w-8 place-items-center rounded-full text-sm",
                        h.favorite ? "bg-coral/25" : "bg-muted hover:bg-accent",
                      )}
                    >
                      <Icon symbol="Star" size={16} fill={h.favorite} className={h.favorite ? "text-sun" : "text-muted-foreground"} />
                    </button>
                    {done ? (
                      <span className="rounded-full bg-mint/40 px-2.5 py-1 text-[11px] font-semibold">
                        Goal met
                      </span>
                    ) : (
                      <XPBadge xp={20} />
                    )}
                  </div>
                </div>
                <p className="mt-3 font-semibold">{h.name}</p>
                <p className="text-sm text-muted-foreground">
                  {v} / {g} {h.unit}
                </p>
                <ProgressBar className="mt-3" tone={done ? "mint" : "cyan"} value={v} max={g} />
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => bump(h, -1)}
                    aria-label={`Decrease ${h.name}`}
                    className="focus-ring h-9 w-9 rounded-full bg-muted text-lg font-bold"
                  >
                    −
                  </button>
                  <button
                    onClick={() => bump(h, 1)}
                    aria-label={`Increase ${h.name}`}
                    className="focus-ring h-9 w-9 rounded-full bg-brand text-lg font-bold text-navy"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setEditing(editing === h.key ? null : h.key)}
                    className="focus-ring ml-auto rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"
                  >
                    Set goal
                  </button>
                </div>
                {editing === h.key ? (
                  <div className="mt-3 flex items-center gap-2">
                    <label htmlFor={`goal-${h.key}`} className="text-xs text-muted-foreground">
                      Goal
                    </label>
                    <input
                      id={`goal-${h.key}`}
                      type="number"
                      min={1}
                      value={g}
                      onChange={(e) => setGoal(h.key, Number(e.target.value))}
                      className="focus-ring w-20 rounded-xl border border-border bg-background px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">{h.unit}</span>
                  </div>
                ) : null}
              </SoftCard>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <DisclaimerNote>
          NuMind is a consumer wellness app for everyday habits. It is not a medical tool and does
          not track medication or clinical information.
        </DisclaimerNote>
      </div>
    </div>
  );
}
