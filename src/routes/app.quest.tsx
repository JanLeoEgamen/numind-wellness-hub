import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUESTS } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { completeQuest } from "@/lib/server-functions";
import { useMyQuests, isUuid } from "@/lib/server-data";
import { PageHeader, SoftCard, ProgressBar, XPBadge, ToneIcon } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/quest")({
  head: () => ({
    meta: [
      { title: "Wellness Quest — NuMind" },
      {
        name: "description",
        content:
          "Daily missions, weekly challenges and seasonal adventures with XP and treasure chests.",
      },
      { property: "og:title", content: "Wellness Quest — NuMind" },
      {
        property: "og:description",
        content: "Fun missions that turn everyday wellness into progress.",
      },
    ],
  }),
  component: QuestPage,
});

const TABS = [
  { id: "daily", label: "Daily Missions" },
  { id: "weekly", label: "Weekly Challenge" },
  { id: "monthly", label: "Monthly Adventure" },
  { id: "seasonal", label: "Seasonal Challenges" },
] as const;

const CHEST_REWARDS = ["Bonus XP", "Badge", "Garden item", "Theme", "Avatar item", "Streak Saver"];

function QuestPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("daily");
  const { completeTask, isComplete, celebrate } = useNuMind();
  const queryClient = useQueryClient();
  const { data: srvQuests } = useMyQuests();
  // Prefer the server-catalogued quests for this tab; fall back to mock data.
  const srvList = (srvQuests ?? []).filter((q) => q.questType === tab);
  const list = srvList.length ? srvList : QUESTS[tab];

  // A quest counts as done if it's in the local store, meets its goal, or the
  // server marks it completed.
  const isQuestDone = (q: { id: string; progress: number; goal: number; completed?: boolean }) =>
    isComplete(q.id) || q.progress >= q.goal || Boolean((q as { completed?: boolean }).completed);

  // The treasure chest is a DAILY chest, so it always counts Daily Missions
  // regardless of which tab is active.
  const srvDaily = (srvQuests ?? []).filter((q) => q.questType === "daily");
  const dailyList = srvDaily.length ? srvDaily : QUESTS.daily;
  const dailyCompleted = dailyList.filter(isQuestDone).length;
  const [chestOpened, setChestOpened] = useState(false);
  const chestReady = dailyCompleted >= 3;

  const handleComplete = async (q: { id: string; name: string; xp: number; progress: number; goal: number }) => {
    completeTask(q.id, { title: q.name, xp: q.xp });
    // Persist the quest completion (idempotent) when we hold a real server
    // quest uuid from the quest catalog, then refresh the server-backed list.
    if (isUuid(q.id)) {
      try {
        await completeQuest({ data: { questId: q.id } });
      } catch {
        // Offline or not authenticated — the local completion still stands.
      }
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="Trophy"
        title="Wellness Quest"
        subtitle="Little missions that add up to good days."
      />

      <div
        className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1"
        role="tablist"
        aria-label="Quest types"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-brand font-bold text-navy shadow-soft"
                : "bg-muted hover:bg-accent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((q) => {
          const done = isQuestDone(q);
          return (
            <li key={q.id}>
              <SoftCard className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ToneIcon emoji={q.emoji ?? "Trophy"} tone={done ? "mint" : "lavender"} />
                    <div>
                      <p className="font-semibold">{q.name}</p>
                      <p className="text-sm text-muted-foreground">{q.desc}</p>
                    </div>
                  </div>
                  <XPBadge xp={q.xp} />
                </div>
                <div className="mt-4">
                  <ProgressBar
                    tone={done ? "mint" : "teal"}
                    value={done ? q.goal : q.progress}
                    max={q.goal}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {done ? q.goal : q.progress} / {q.goal}
                  </p>
                </div>
                <button
                  disabled={done}
                  onClick={() => handleComplete(q)}
                  className={cn(
                    "focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold transition",
                    done ? "bg-mint/40 text-foreground" : "bg-brand text-navy hover:brightness-105",
                  )}
                >
                  {done ? (
                  <>
                    <Icon symbol="Check" size={14} className="mr-1 inline-block align-[-1px]" /> Complete
                  </>
                ) : "Mark complete"}
                </button>
              </SoftCard>
            </li>
          );
        })}
      </ul>

      <SoftCard className="mt-6 bg-hero text-center">
        <p className={cn("text-5xl", chestReady && !chestOpened && "animate-float")} aria-hidden>
          <Icon symbol={chestReady && !chestOpened ? "Gift" : "Lock"} size={48} />
        </p>
        <h2 className="mt-3 text-lg font-bold">Daily Treasure Chest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {chestReady
            ? chestOpened
              ? "Chest opened — come back tomorrow for a new one."
              : "Three missions done — your chest is ready to open."
            : `Complete ${3 - dailyCompleted} more Daily Mission${3 - dailyCompleted === 1 ? "" : "s"} to unlock.`}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          {CHEST_REWARDS.map((r) => (
            <span key={r} className="rounded-full bg-muted px-3 py-1">
              {r}
            </span>
          ))}
        </div>
        <button
          disabled={!chestReady || chestOpened}
          onClick={() => {
            setChestOpened(true);
            celebrate({
              emoji: "Gift",
              title: "Treasure chest opened!",
              message: "You found a Streak Saver and 80 bonus XP.",
              xp: 80,
              chain: ["+80 XP earned", "Streak Saver added", "Garden growth updated"],
            });
          }}
          className="focus-ring mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-navy disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {chestOpened ? "Opened" : chestReady ? "Open chest" : "Locked"}
        </button>
      </SoftCard>
    </div>
  );
}
