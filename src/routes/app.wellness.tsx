import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HABITS } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, ProgressBar, ToneIcon, XPBadge, DisclaimerNote } from "@/components/numind/ui-kit";

export const Route = createFileRoute("/app/wellness")({
  head: () => ({
    meta: [
      { title: "My Wellness — NuMind" },
      { name: "description", content: "Track water, sleep, movement, eating, mindfulness, self-care and outdoor time." },
      { property: "og:title", content: "My Wellness — NuMind" },
      { property: "og:description", content: "Gentle lifestyle habit tracking with personal goals and XP." },
    ],
  }),
  component: WellnessPage,
});

function WellnessPage() {
  const { awardXp } = useNuMind();
  const [values, setValues] = useState(() => Object.fromEntries(HABITS.map((h) => [h.id, h.value])) as Record<string, number>);
  const [goals, setGoals] = useState(() => Object.fromEntries(HABITS.map((h) => [h.id, h.goal])) as Record<string, number>);
  const [editing, setEditing] = useState<string | null>(null);

  const completed = HABITS.filter((h) => (values[h.id] ?? 0) >= (goals[h.id] ?? 1)).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="💧"
        title="My Wellness"
        subtitle="Your everyday habits, your own goals. No pressure, just patterns."
        action={<span className="rounded-full bg-mint/40 px-4 py-2 text-sm font-semibold">{completed}/{HABITS.length} goals met today</span>}
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HABITS.map((h) => {
          const v = values[h.id] ?? 0;
          const g = goals[h.id] ?? 1;
          const done = v >= g;
          return (
            <li key={h.id}>
              <SoftCard className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <ToneIcon emoji={h.emoji} tone={h.tone} />
                  {done ? (
                    <span className="rounded-full bg-mint/40 px-2.5 py-1 text-[11px] font-semibold">Goal met ✓</span>
                  ) : (
                    <XPBadge xp={20} />
                  )}
                </div>
                <p className="mt-3 font-semibold">{h.name}</p>
                <p className="text-sm text-muted-foreground">
                  {v} / {g} {h.unit}
                </p>
                <ProgressBar className="mt-3" tone={done ? "mint" : "cyan"} value={v} max={g} />
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setValues((s) => ({ ...s, [h.id]: Math.max(0, v - 1) }))}
                    aria-label={`Decrease ${h.name}`}
                    className="focus-ring h-9 w-9 rounded-full bg-muted text-lg font-bold"
                  >
                    −
                  </button>
                  <button
                    onClick={() => {
                      setValues((s) => ({ ...s, [h.id]: v + 1 }));
                      if (v + 1 === g) awardXp(20, `${h.name} goal reached`);
                    }}
                    aria-label={`Increase ${h.name}`}
                    className="focus-ring h-9 w-9 rounded-full bg-brand text-lg font-bold text-navy"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setEditing(editing === h.id ? null : h.id)}
                    className="focus-ring ml-auto rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"
                  >
                    Set goal
                  </button>
                </div>
                {editing === h.id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <label htmlFor={`goal-${h.id}`} className="text-xs text-muted-foreground">
                      Goal
                    </label>
                    <input
                      id={`goal-${h.id}`}
                      type="number"
                      min={1}
                      value={g}
                      onChange={(e) => setGoals((s) => ({ ...s, [h.id]: Number(e.target.value) }))}
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
          NuMind is a consumer wellness app for everyday habits. It is not a medical tool and does not track
          medication or clinical information.
        </DisclaimerNote>
      </div>
    </div>
  );
}
