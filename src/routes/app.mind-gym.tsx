import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MIND_GYM_ACTIVITIES, MIND_GYM_CATEGORIES } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import {
  PageHeader,
  SoftCard,
  XPBadge,
  LockedPill,
  EmptyState,
  ToneIcon,
} from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/mind-gym")({
  head: () => ({
    meta: [
      { title: "Mind Gym — NuMind" },
      { name: "description", content: "Short breathing, mindfulness, focus and wind-down activities you can finish today." },
      { property: "og:title", content: "Mind Gym — NuMind" },
      { property: "og:description", content: "Short guided activities for breath, focus, gratitude and rest." },
    ],
  }),
  component: MindGym,
});

function MindGym() {
  const { completeTask, isComplete } = useNuMind();
  const [cat, setCat] = useState<string>("all");
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      MIND_GYM_ACTIVITIES.filter(
        (a) =>
          (cat === "all" || a.category === cat) &&
          a.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [cat, q],
  );

  const activity = MIND_GYM_ACTIVITIES.find((a) => a.id === active);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="🧠"
        title="Mind Gym"
        subtitle="A library of short activities. Two minutes counts."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search activities"
          aria-label="Search activities"
          className="focus-ring w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm sm:max-w-xs"
        />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setCat("all")}
            aria-pressed={cat === "all"}
            className={cn(
              "focus-ring shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
              cat === "all" ? "border-teal bg-teal/15 font-semibold" : "border-border bg-card",
            )}
          >
            All
          </button>
          {MIND_GYM_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
              className={cn(
                "focus-ring shrink-0 rounded-full border px-4 py-2 text-sm font-medium",
                cat === c.id ? "border-teal bg-teal/15 font-semibold" : "border-border bg-card",
              )}
            >
              <span aria-hidden>{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            emoji="🧘"
            title="Nothing here yet"
            message="Try another category — there's always something short you can do."
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => {
            const done = isComplete(a.id);
            return (
              <li key={a.id}>
                <SoftCard interactive className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <ToneIcon emoji={a.emoji} tone={done ? "mint" : "teal"} />
                    {a.locked ? <LockedPill /> : <XPBadge xp={a.xp} />}
                  </div>
                  <p className="mt-3 font-semibold">{a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">⏱ {a.minutes} min</span>
                    <span className="rounded-full bg-muted px-2 py-1">{a.difficulty}</span>
                  </div>
                  <button
                    disabled={a.locked}
                    onClick={() => setActive(a.id)}
                    className={cn(
                      "focus-ring mt-4 w-full rounded-full px-4 py-2.5 text-sm font-bold transition",
                      done
                        ? "bg-mint/40 text-foreground"
                        : a.locked
                          ? "cursor-not-allowed bg-muted text-muted-foreground"
                          : "bg-brand text-navy hover:brightness-105",
                    )}
                  >
                    {a.locked ? "Unlock with NuMind+" : done ? "Completed ✓ Do it again" : "Start"}
                  </button>
                </SoftCard>
              </li>
            );
          })}
        </ul>
      )}

      {activity ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activity.name}
          onClick={() => setActive(null)}
        >
          <div
            className="card-soft animate-pop w-full max-w-md p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-44 w-44 place-items-center">
              <div className="animate-breathe grid h-40 w-40 place-items-center rounded-full bg-brand text-4xl">
                <span aria-hidden>{activity.emoji}</span>
              </div>
            </div>
            <h2 className="mt-5 text-xl font-bold">{activity.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Breathe in… hold… and out. {activity.minutes} min</p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setActive(null)}
                className="focus-ring flex-1 rounded-full bg-muted py-3 text-sm font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActive(null);
                  completeTask(activity.id, {
                    title: activity.name,
                    xp: activity.xp,
                    chain: [
                      `+${activity.xp} XP earned`,
                      "Today's Journey updated",
                      "Quest progress updated",
                      "Garden growth updated",
                      "Badge progress updated",
                      "My Journey updated",
                      "Numi is celebrating 🤖",
                    ],
                  });
                }}
                className="focus-ring flex-1 rounded-full bg-brand py-3 text-sm font-bold text-navy"
              >
                Finish +{activity.xp} XP
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
