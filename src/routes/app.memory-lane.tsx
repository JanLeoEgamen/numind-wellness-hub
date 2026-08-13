import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MEMORIES } from "@/lib/mock-data";
import { PageHeader, SoftCard, CTALink, ToneIcon, SectionTitle } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/memory-lane")({
  head: () => ({
    meta: [
      { title: "Memory Lane — NuMind" },
      { name: "description", content: "Look how far you've come: milestones, first streaks and the day you planted your first seed." },
      { property: "og:title", content: "Memory Lane — NuMind" },
      { property: "og:description", content: "Look how far you've come: milestones, first streaks and the day you planted your first seed." },
    ],
  }),
  component: MemoryLane,
});

function MemoryLane() {
  const [favs, setFavs] = useState<string[]>(["m1"]);
  const [pins, setPins] = useState<string[]>([]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader emoji="🌸" title="Look How Far You've Come" subtitle="Your milestones, gathered in one warm place." />

      <SoftCard className="bg-hero">
        <SectionTitle hint="13 August">On This Day</SectionTitle>
        <p className="text-sm">
          One year ago you wrote: <em>&ldquo;I just want a week where I feel like myself.&rdquo;</em> You've had 28 of them since.
        </p>
      </SoftCard>

      <ul className="mt-6 grid gap-3">
        {MEMORIES.map((m) => (
          <li key={m.id}>
            <SoftCard className="flex flex-wrap items-center gap-4">
              <ToneIcon emoji={m.emoji} tone={m.tone} size="lg" />
              <div className="min-w-[200px] flex-1">
                <p className="font-semibold">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.date}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFavs((f) => (f.includes(m.id) ? f.filter((x) => x !== m.id) : [...f, m.id]))}
                  aria-pressed={favs.includes(m.id)}
                  className={cn("focus-ring rounded-full px-3 py-2 text-sm", favs.includes(m.id) ? "bg-coral/25 font-semibold" : "bg-muted")}
                >
                  ❤️ Favourite
                </button>
                <button
                  onClick={() => setPins((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                  aria-pressed={pins.includes(m.id)}
                  className={cn("focus-ring rounded-full px-3 py-2 text-sm", pins.includes(m.id) ? "bg-lavender/40 font-semibold" : "bg-muted")}
                >
                  📌 Pin
                </button>
              </div>
            </SoftCard>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <CTALink to="/app/journey">➡️ View Journey</CTALink>
      </div>
    </div>
  );
}
