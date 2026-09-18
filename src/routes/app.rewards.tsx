import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, EmptyState, LoadingState } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";
import { REWARD_CATEGORIES } from "@/lib/server-functions";
import { useRewardsMarketplace, useRedeemReward, useEquipReward } from "@/lib/server-data";

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

// Rewards that make sense to "wear" — exactly one can be equipped at a time.
const EQUIPPABLE = new Set(["numi_accessory", "avatar_accessory", "badge_frame", "theme"]);

function RewardsPage() {
  const { celebrate } = useNuMind();
  const { data, isLoading, isError, refetch } = useRewardsMarketplace();
  const redeem = useRedeemReward();
  const equip = useEquipReward();
  const [cat, setCat] = useState<string>("All");

  if (isError && !data) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader emoji="Gift" title="Rewards" subtitle="Earn XP to unlock something special." />
        <EmptyState
          emoji="CloudFog"
          title="That didn't load"
          message="No worries — let's try that again."
          action={
            <button onClick={() => refetch()} className="focus-ring rounded-full bg-brand px-5 py-2 text-sm font-bold text-navy">
              Try again
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader emoji="Gift" title="Rewards" subtitle="Earn XP to unlock something special." />
        <LoadingState rows={4} />
      </div>
    );
  }

  const categories = ["All", ...REWARD_CATEGORIES.map((c) => c.label)];
  const list = data.rewards.filter((r) => cat === "All" || r.categoryLabel === cat);

  const handleRedeem = (id: string) => {
    redeem.mutate(id, {
      onSuccess: (next) => {
        const reward = next.rewards.find((r) => r.id === id);
        if (reward) {
          celebrate({
            emoji: reward.emoji ?? "Gift",
            title: `${reward.name} unlocked!`,
            message: "It's now in your collection.",
            chain: [`-${reward.xpCost.toLocaleString()} XP`, "Collection updated", "Rewards refreshed"],
          });
        }
        toast.success("Reward unlocked!");
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not unlock this reward."),
    });
  };

  const handleEquip = (id: string | null) => {
    equip.mutate(id, {
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update your equipped reward."),
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="Gift"
        title="Rewards"
        subtitle="Earn XP to unlock something special."
        action={
          <div className="text-right">
            <span className="rounded-full bg-sun/25 px-4 py-2 text-sm font-bold">
              <Icon symbol="Star" size={14} fill className="mr-1 inline-block align-[-2px] text-sun" />
              {data.balance.toLocaleString()} XP
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.lifetimeXp.toLocaleString()} XP earned · Level {data.level.number}
            </p>
          </div>
        }
      />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={cn(
              "focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              cat === c ? "bg-brand font-bold text-navy" : "bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState emoji="Gift" title="Nothing here yet" message="Earn XP to unlock something special." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((r) => {
            const affordable = data.balance >= r.xpCost;
            const levelLocked = data.level.number < r.unlockLevel;
            const premiumLocked = r.premiumRequired && !data.isPremium;
            const locked = levelLocked || premiumLocked;
            const equippable = EQUIPPABLE.has(r.rewardType);
            const pending = redeem.isPending || equip.isPending;
            return (
              <li key={r.id}>
                <SoftCard interactive className="flex h-full flex-col text-center">
                  {r.limited ? (
                    <span className="mx-auto mb-2 rounded-full bg-coral/20 px-3 py-1 text-[11px] font-semibold">Limited time</span>
                  ) : null}
                  <p className="text-4xl" aria-hidden>
                    <Icon symbol={r.owned || (affordable && !locked) ? r.emoji ?? "Gift" : "Lock"} size={40} />
                  </p>
                  <p className="mt-2 font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.categoryLabel}</p>
                  {r.description ? <p className="mt-1 text-xs text-muted-foreground">{r.description}</p> : null}
                  <p className="mt-2 text-sm font-bold">
                    <Icon symbol="Star" size={14} fill className="mr-1 inline-block align-[-2px] text-sun" />
                    {r.xpCost.toLocaleString()} XP
                  </p>
                  {r.premiumRequired ? (
                    <span className="mx-auto mt-1 rounded-full bg-grape/15 px-3 py-1 text-[11px] font-semibold text-grape">NuMind Plus</span>
                  ) : null}

                  {r.owned && equippable ? (
                    <button
                      onClick={() => handleEquip(r.equipped ? null : r.id)}
                      disabled={pending}
                      className={cn(
                        "focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold",
                        r.equipped ? "bg-mint/40" : "bg-muted hover:bg-accent",
                      )}
                    >
                      {r.equipped ? "Equipped" : "Equip"}
                    </button>
                  ) : r.owned ? (
                    <span className="focus-ring mt-4 rounded-full bg-mint/40 px-4 py-2.5 text-sm font-bold">Unlocked</span>
                  ) : premiumLocked ? (
                    <Link
                      to="/pricing"
                      className="focus-ring mt-4 block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-bold text-navy"
                    >
                      NuMind Plus
                    </Link>
                  ) : levelLocked ? (
                    <button
                      disabled
                      onClick={() => handleRedeem(r.id)}
                      className={cn(
                        "focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold",
                        "cursor-not-allowed bg-muted text-muted-foreground",
                      )}
                    >
                      {`Reach Level ${r.unlockLevel}`}
                    </button>
                  ) : affordable ? (
                    <button
                      disabled={pending}
                      onClick={() => handleRedeem(r.id)}
                      className="focus-ring mt-4 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-navy"
                    >
                      Unlock
                    </button>
                  ) : (
                    <button
                      disabled
                      onClick={() => handleRedeem(r.id)}
                      className={cn(
                        "focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold",
                        "cursor-not-allowed bg-muted text-muted-foreground",
                      )}
                    >
                      Not enough XP
                    </button>
                  )}
                </SoftCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
