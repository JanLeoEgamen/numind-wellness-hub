import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MEMORIES } from "@/lib/mock-data";
import {
  toggleMemoryFavorite,
  toggleMemoryPin,
} from "@/lib/server-functions";
import { useMyMemories, isUuid } from "@/lib/server-data";
import { PageHeader, SoftCard, CTALink, ToneIcon, EmptyState } from "@/components/numind/ui-kit";
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

type MemoryView = {
  id: string;
  emoji: string;
  title: string;
  description?: string | undefined;
  date: string;
  tone: string;
  favorite: boolean;
  pinned: boolean;
};

const toneFor = (type?: string | null, i = 0): string => {
  const tones = ["teal", "lavender", "mint", "sun", "coral"];
  if (type === "milestone") return "sun";
  if (type === "streak") return "coral";
  if (type === "garden") return "mint";
  if (type === "journal") return "lavender";
  return tones[i % tones.length] ?? "teal";
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

function MemoryLane() {
  const { data: srvMemories } = useMyMemories();

  const toView = (m: (typeof MEMORIES)[number], i: number): MemoryView => ({
    id: m.id,
    emoji: m.emoji,
    title: m.title,
    date: m.date,
    tone: m.tone,
    favorite: false,
    pinned: false,
  });

  const [favs, setFavs] = useState<string[]>(() =>
    (srvMemories ?? []).filter((m) => m.favorite).map((m) => m.id),
  );
  const [pins, setPins] = useState<string[]>(() =>
    (srvMemories ?? []).filter((m) => m.pinned).map((m) => m.id),
  );

  // Sync favourite/pin flags once the live memories arrive.
  useEffect(() => {
    if (!srvMemories?.length) return;
    setFavs(srvMemories.filter((m) => m.favorite).map((m) => m.id));
    setPins(srvMemories.filter((m) => m.pinned).map((m) => m.id));
  }, [srvMemories]);

  // Prefer live memories; keep the warm mock fallback so the page is non-empty.
  const list: MemoryView[] =
    srvMemories && srvMemories.length
      ? srvMemories.map((m, i) => ({
          id: m.id,
          emoji: m.emoji ?? "🌸",
          title: m.title,
          description: m.description ?? undefined,
          date: formatDate(m.created_at),
          tone: toneFor(m.memory_type, i),
          favorite: m.favorite ?? false,
          pinned: m.pinned ?? false,
        }))
      : MEMORIES.map(toView);

  const toggleFav = (m: MemoryView) => {
    const on = !favs.includes(m.id);
    setFavs((f) => (on ? [...f, m.id] : f.filter((x) => x !== m.id)));
    if (isUuid(m.id)) toggleMemoryFavorite({ data: { memoryId: m.id, favorite: on } }).catch(() => {});
  };

  const togglePin = (m: MemoryView) => {
    const on = !pins.includes(m.id);
    setPins((p) => (on ? [...p, m.id] : p.filter((x) => x !== m.id)));
    if (isUuid(m.id)) toggleMemoryPin({ data: { memoryId: m.id, pinned: on } }).catch(() => {});
  };

  const ordered = [...list].sort((a, b) =>
    pins.includes(b.id) === pins.includes(a.id) ? 0 : pins.includes(a.id) ? -1 : 1,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader emoji="🌸" title="Look How Far You've Come" subtitle="Your milestones, gathered in one warm place." />

      <ul className="mt-6 grid gap-3">
        {ordered.length === 0 ? (
          <EmptyState emoji="🌱" title="No memories yet" message="Complete your first Daily Reset and your first milestone will appear here." />
        ) : (
          ordered.map((m) => (
            <li key={m.id}>
              <SoftCard className="flex flex-wrap items-center gap-4">
                <ToneIcon emoji={m.emoji} tone={m.tone} size="lg" />
                <div className="min-w-[200px] flex-1">
                  <p className="font-semibold">{m.title}</p>
                  {m.description ? <p className="text-sm text-muted-foreground">{m.description}</p> : null}
                  <p className="text-xs text-muted-foreground">{m.date}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFav(m)}
                    aria-pressed={favs.includes(m.id)}
                    className={cn("focus-ring rounded-full px-3 py-2 text-sm", favs.includes(m.id) ? "bg-coral/25 font-semibold" : "bg-muted")}
                  >
                    ❤️ Favourite
                  </button>
                  <button
                    onClick={() => togglePin(m)}
                    aria-pressed={pins.includes(m.id)}
                    className={cn("focus-ring rounded-full px-3 py-2 text-sm", pins.includes(m.id) ? "bg-lavender/40 font-semibold" : "bg-muted")}
                  >
                    📌 Pin
                  </button>
                </div>
              </SoftCard>
            </li>
          ))
        )}
      </ul>

      <div className="mt-6 flex justify-center">
        <CTALink to="/app/journey">➡️ View Journey</CTALink>
      </div>
    </div>
  );
}
