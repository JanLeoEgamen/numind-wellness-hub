import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LESSONS } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { completeLesson } from "@/lib/server-functions";
import { useLearningCatalog, isUuid } from "@/lib/server-data";
import { PageHeader, SoftCard, ProgressBar, XPBadge, EmptyState } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/learning")({
  head: () => ({
    meta: [
      { title: "Learning Lounge — NuMind" },
      { name: "description", content: "Bite-sized wellness lessons on focus, sleep, stress, habits and personal growth." },
      { property: "og:title", content: "Learning Lounge — NuMind" },
      { property: "og:description", content: "Bite-sized wellness lessons on focus, sleep, stress, habits and personal growth." },
    ],
  }),
  component: LearningPage,
});

function LearningPage() {
  const { awardXp } = useNuMind();
  const { data: srvCatalog } = useLearningCatalog();
  const [cat, setCat] = useState<string | null>("All");
  const [done, setDone] = useState<string[]>(LESSONS.filter((l) => l.progress === 100).map((l) => l.id));
  // Prefer the server catalog (real uuids + per-user progress) with a mock fallback.
  const library = srvCatalog && srvCatalog.length ? srvCatalog : LESSONS;
  const CATS = ["All", ...Array.from(new Set(library.map((l) => l.category))).filter(Boolean)] as string[];
  const list = library.filter((l) => cat === "All" || l.category === cat);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="GraduationCap" title="Learning Lounge" subtitle="Your next lesson is waiting — most take under five minutes." />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={cn("focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium", cat === c ? "bg-brand font-bold text-navy" : "bg-muted")}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState emoji="GraduationCap" title="Nothing here yet" message="Your next lesson is waiting." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((l) => {
            const complete = done.includes(l.id) || Boolean((l as any).completed);
            return (
              <li key={l.id}>
                <SoftCard interactive className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl" aria-hidden>
                      <Icon symbol={l.emoji} size={32} />
                    </span>
                    <XPBadge xp={l.xp} />
                  </div>
                  <p className="mt-3 font-semibold">{l.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{(l as any).summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">{l.type}</span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      <Icon symbol="Timer" size={11} className="mr-1 inline-block align-[-1px]" /> {l.minutes} min
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">{l.category}</span>
                  </div>
                  <ProgressBar className="mt-3" tone="cyan" value={complete ? 100 : l.progress} max={100} />
                  <button
                    onClick={() => {
                      if (complete) return;
                      setDone((d) => [...d, l.id]);
                      awardXp(l.xp, `${l.title} completed`);
                      // Persist completion + XP when we hold a real server uuid.
                      if (isUuid(l.id)) {
                        completeLesson({ data: { contentId: l.id } }).catch(() => {});
                      }
                    }}
                    className={cn("focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold", complete ? "bg-mint/40" : "bg-brand text-navy")}
                  >
                    {complete ? (
                      <>
                        <Icon symbol="Check" size={13} className="mr-1 inline-block align-[-1px]" /> Completed
                      </>
                    ) : l.progress > 0 ? "Continue" : "Start lesson"}
                  </button>
                </SoftCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
