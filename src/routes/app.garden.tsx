import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GARDEN_STAGES } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
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

const ITEMS = [
  { emoji: "🌷", name: "Tulip Patch", owned: true },
  { emoji: "🦋", name: "Butterfly Flock", owned: true },
  { emoji: "🌳", name: "Old Oak", owned: true },
  { emoji: "🪑", name: "Garden Bench", owned: true },
  { emoji: "🐦", name: "Songbirds", owned: false },
  { emoji: "⛲", name: "Stone Fountain", owned: false },
  { emoji: "🌸", name: "Cherry Blossom", owned: false },
  { emoji: "🏮", name: "Path Lanterns", owned: false },
];

function GardenPage() {
  const { gardenXp, gardenStage, gardenNext } = useNuMind();
  const { data: gardenData } = useMyGarden();
  const [tab, setTab] = useState<"garden" | "items">("garden");
  const stageIdx = GARDEN_STAGES.findIndex((s) => s.name === gardenStage.name);
  const placedCount = gardenData?.placedIds?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="🌱"
        title="My Garden"
        subtitle="Every activity you finish helps something here grow."
      />

      <div className="relative overflow-hidden rounded-4xl bg-garden p-6 sm:p-10">
        <div className="absolute right-6 top-6 hidden sm:block">
          <NumiAvatar size={48} className="animate-float" />
        </div>
        <div className="grid place-items-center gap-3 py-8 text-center">
          <span className="animate-float text-8xl" aria-hidden>
            {gardenStage.emoji}
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
                {gardenNext.threshold - gardenXp} XP until {gardenNext.name} {gardenNext.emoji}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold">Your Wellness Sanctuary is complete 🏡</p>
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
              {s.emoji} {s.name}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-center gap-6 text-4xl" aria-hidden>
          <span className="animate-float">🌷</span>
          <span className="animate-float" style={{ animationDelay: "0.6s" }}>
            🌳
          </span>
          <span className="animate-float" style={{ animationDelay: "1.2s" }}>
            🦋
          </span>
          <span className="animate-float" style={{ animationDelay: "0.3s" }}>
            🪑
          </span>
          <span className="animate-float" style={{ animationDelay: "0.9s" }}>
            🌿
          </span>
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
            {t === "garden" ? "Recent activity" : "Customize"}
          </button>
        ))}
      </div>

      {tab === "garden" ? (
        <SoftCard className="mt-4">
          <SectionTitle>Recent growth</SectionTitle>
          <ul className="grid gap-2 text-sm">
            <li className="rounded-2xl bg-muted/60 px-4 py-3">
              🌞 Daily Reset · +10 Garden XP · today
            </li>
            <li className="rounded-2xl bg-muted/60 px-4 py-3">
              🦋 Butterfly Flock unlocked · yesterday
            </li>
            <li className="rounded-2xl bg-muted/60 px-4 py-3">
              🧘 Mind Gym · +10 Garden XP · yesterday
            </li>
          </ul>
        </SoftCard>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            🌿 {placedCount} item{placedCount === 1 ? "" : "s"} placed in your garden
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ITEMS.map((i) => (
              <li key={i.name}>
                <div className={cn("card-soft p-4 text-center", !i.owned && "opacity-60")}>
                  <p className="text-3xl" aria-hidden>
                    {i.owned ? i.emoji : "🔒"}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.owned ? "Placed" : "Unlock in Rewards"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {gardenXp === 0 ? (
        <div className="mt-6">
          <EmptyState
            emoji="🌱"
            title="Your garden is waiting"
            message="Your garden is waiting for its first seed. 🌱"
          />
        </div>
      ) : null}
    </div>
  );
}
