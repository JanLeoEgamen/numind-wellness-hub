import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { REWARDS } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, EmptyState } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — NuMind" },
      { name: "description", content: "Spend the XP you've earned on garden decorations, themes, Numi accessories and more." },
      { property: "og:title", content: "Rewards — NuMind" },
      { property: "og:description", content: "Spend the XP you've earned on garden decorations, themes, Numi accessories and more." },
    ],
  }),
  component: RewardsPage,
});

const CATEGORIES = ["All", ...Array.from(new Set(REWARDS.map((r) => r.category)))];

function RewardsPage() {
  const { xp, celebrate } = useNuMind();
  const [cat, setCat] = useState("All");
  const [owned, setOwned] = useState<string[]>(REWARDS.filter((r) => r.owned).map((r) => r.id));
  const list = REWARDS.filter((r) => cat === "All" || r.category === cat);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="🎁"
        title="Rewards"
        subtitle="Earn XP to unlock something special."
        action={<span className="rounded-full bg-sun/25 px-4 py-2 text-sm font-bold">⭐ {xp.toLocaleString()} XP</span>}
      />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {CATEGORIES.map((c) => (
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
        <EmptyState emoji="🎁" title="Nothing here yet" message="Earn XP to unlock something special." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((r) => {
            const isOwned = owned.includes(r.id);
            const affordable = xp >= r.cost;
            return (
              <li key={r.id}>
                <SoftCard interactive className="flex h-full flex-col text-center">
                  {r.limited ? (
                    <span className="mx-auto mb-2 rounded-full bg-coral/20 px-3 py-1 text-[11px] font-semibold">Limited time</span>
                  ) : null}
                  <p className="text-4xl" aria-hidden>{isOwned ? r.emoji : affordable ? r.emoji : "🔒"}</p>
                  <p className="mt-2 font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.category}</p>
                  <p className="mt-2 text-sm font-bold">⭐ {r.cost} XP</p>
                  <button
                    disabled={isOwned || !affordable}
                    onClick={() => {
                      setOwned((o) => [...o, r.id]);
                      celebrate({ emoji: r.emoji, title: `${r.name} unlocked!`, message: "It's waiting in your collection.", chain: ["XP spent", "Collection updated", "Garden refreshed"] });
                    }}
                    className={cn(
                      "focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold",
                      isOwned ? "bg-mint/40" : affordable ? "bg-brand text-navy" : "cursor-not-allowed bg-muted text-muted-foreground",
                    )}
                  >
                    {isOwned ? "Unlocked ✓" : affordable ? "Unlock" : "Not enough XP"}
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
