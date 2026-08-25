import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GARDEN_STAGES } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { setGardenItemPlaced } from "@/lib/server-functions";
import type { MyGardenItem } from "@/lib/server-functions";
import { useMyGarden } from "@/lib/server-data";
import {
  PageHeader,
  SoftCard,
  ProgressBar,
  NumiAvatar,
  SectionTitle,
  EmptyState,
} from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/numind/icon";

export const Route = createFileRoute("/app/garden")({
  head: () => ({
    meta: [
      { title: "My Garden — NuMind" },
      {
        name: "description",
        content: "Your Wellness Garden grows from seed to sanctuary as you show up for yourself.",
      },
      { property: "og:title", content: "My Garden — NuMind" },
      {
        property: "og:description",
        content: "Your Wellness Garden grows from seed to sanctuary as you show up for yourself.",
      },
    ],
  }),
  component: GardenPage,
});

function dateLabel(iso: string) {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function GardenPage() {
  const { gardenXp, gardenStage, gardenNext } = useNuMind();
  const { data: gardenData, refetch } = useMyGarden();
  const [tab, setTab] = useState<"garden" | "items">("garden");
  const [placing, setPlacing] = useState<string | null>(null);

  const items: MyGardenItem[] = gardenData?.items ?? [];
  const placedItems = items.filter((i) => i.placed);
  const placedCount = placedItems.length;
  const theme = gardenData?.garden?.theme ?? null;
  const stageIdx = GARDEN_STAGES.findIndex((s) => s.name === gardenStage.name);

  const togglePlaced = (item: MyGardenItem) => {
    const next = !item.placed;
    setPlacing(item.id);
    setGardenItemPlaced({ data: { itemId: item.id, placed: next } })
      .then(() => refetch())
      .catch(() => {})
      .finally(() => setPlacing(null));
  };

  // Decorative fallback only while the user has nothing placed yet.
  const gardenEmojis =
    placedItems.length > 0
      ? placedItems.map((i) => ({ key: i.id, emoji: i.emoji ?? "Sprout" }))
      : [
          { key: "seed", emoji: "Flower2" },
          { key: "young", emoji: "Trees" },
          { key: "butterfly", emoji: "Flower2" },
          { key: "bench", emoji: "Armchair" },
          { key: "herb", emoji: "Sprout" },
        ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="Sprout"
        title="My Garden"
        subtitle="Every activity you finish helps something here grow."
      />

      <div className="relative overflow-hidden rounded-4xl bg-garden p-6 sm:p-10">
        <div className="absolute right-6 top-6 hidden sm:block">
          <NumiAvatar size={48} className="animate-float" />
        </div>
        {theme ? (
          <span className="absolute left-6 top-6 rounded-full bg-background/60 px-3 py-1 text-xs font-semibold capitalize">
            {theme.replace(/_/g, " ")}
          </span>
        ) : null}
        <div className="grid place-items-center gap-3 py-8 text-center">
          <span className="animate-float text-8xl" aria-hidden>
            <Icon symbol={gardenStage.emoji} size={64} className="text-mint" />
          </span>
          <h2 className="text-2xl font-bold">{gardenStage.name}</h2>
          <p className="text-sm text-muted-foreground">{gardenXp.toLocaleString()} Garden XP</p>
          {gardenNext ? (
            <div className="w-full max-w-sm">
              <ProgressBar
                tone="mint"
                value={gardenXp - gardenStage.threshold}
                max={gardenNext.threshold - gardenStage.threshold}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.max(0, gardenNext.threshold - gardenXp)} XP until {gardenNext.name}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold">Your Wellness Sanctuary is complete!</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {GARDEN_STAGES.map((s, i) => (
            <span
              key={s.name}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                i <= stageIdx ? "bg-surface" : "bg-surface/40 text-muted-foreground",
              )}
            >
              <Icon symbol={s.emoji} size={13} className="mr-1 inline-block align-[-2px]" /> {s.name}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-center gap-6" aria-hidden>
          {gardenEmojis.map((g, i) => (
            <span
              key={g.key}
              className="animate-float grid h-10 w-10 place-items-center rounded-full bg-garden"
              style={{ animationDelay: `${(i % 4) * 0.3}s` }}
            >
              <Icon symbol={g.emoji} size={22} />
            </span>
          ))}
        </div>
      </div>


      <div className="mt-6 flex gap-2">
        {(["garden", "items"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "focus-ring rounded-full px-4 py-2 text-sm font-medium",
              tab === t ? "bg-brand font-bold text-navy" : "bg-muted",
            )}
          >
            {t === "garden" ? "Recent growth" : "Customize"}
          </button>
        ))}
      </div>

      {tab === "garden" ? (
        <SoftCard className="mt-4">
          <SectionTitle>Recent growth</SectionTitle>
          {gardenData?.recent && gardenData.recent.length ? (
            <ul className="grid gap-2 text-sm">
              {gardenData.recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3"
                >
                  <span aria-hidden>
                  <Icon symbol={r.emoji} size={18} />
                </span>
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <span className="shrink-0 font-semibold">+{r.gardenXp} Garden XP</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {dateLabel(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Every XP you earn grows your garden. Finish something today and watch it grow.
            </p>
          )}
        </SoftCard>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            <Icon symbol="Sprout" size={16} className="mr-1 inline-block align-[-2px] text-mint" />
            {placedCount} item{placedCount === 1 ? "" : "s"} placed in your garden
          </p>
          {items.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((i) => (
                <li key={i.id}>
                  <div className={cn("card-soft p-4 text-center", !i.placed && "opacity-80")}>
                    <p className="text-3xl" aria-hidden>
                      <Icon symbol={i.emoji ?? "Sprout"} size={32} className="text-garden" />
                    </p>
                    <p className="mt-2 text-sm font-semibold">{i.name}</p>
                    <button
                      onClick={() => togglePlaced(i)}
                      disabled={placing === i.id}
                      className={cn(
                        "focus-ring mt-2 w-full rounded-full px-3 py-1.5 text-xs font-semibold",
                        i.placed
                          ? "bg-muted hover:bg-accent"
                          : "bg-brand text-navy hover:brightness-105",
                      )}
                    >
                      {placing === i.id ? "…" : i.placed ? "Remove" : "Place"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                emoji="Sprout"
                title="No garden items yet"
                message="Claim today's daily reward to add your first item."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
