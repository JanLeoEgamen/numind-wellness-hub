import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useNuMind } from "@/lib/numind-store";
import { LEVELS, GARDEN_STAGES } from "@/lib/mock-data";
import {
  useMyStats,
  useMyMemories,
  useMyGarden,
  useTodaysJourney,
} from "@/lib/server-data";
import {
  ProgressRing,
  ProgressBar,
  XPBadge,
  ToneIcon,
  SoftCard,
  SectionTitle,
  NumiAvatar,
  StreakBadge,
  CTALink,
} from "@/components/numind/ui-kit";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Home — NuMind" },
      { name: "description", content: "Your daily journey, streak, garden and Numi in one calm place." },
      { property: "og:title", content: "Home — NuMind" },
      { property: "og:description", content: "Your daily journey, streak, garden and Numi in one calm place." },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const { data: stats } = useMyStats();
  const { data: journey } = useTodaysJourney();
  const { data: memories } = useMyMemories();
  const { data: garden } = useMyGarden();
  const { claimDailyReward } = useNuMind();

  const profile = stats?.profile;
  // Real name, no fake fallback — greet warmly without inventing a user.
  const firstName =
    profile?.nickname || profile?.firstName || profile?.lastName || "";

  const tasks = journey ?? [];
  const done = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;

  const xp = stats?.xpTotal ?? 0;
  const streak = stats?.currentStreak ?? 0;
  const levelNumber = Math.max(1, stats?.level.number ?? 1);
  const levelName = stats?.level.name ?? "Explorer";
  const levelEmoji = stats?.level.emoji ?? LEVELS[Math.min(levelNumber - 1, LEVELS.length - 1)]?.emoji ?? "🌱";
  const xpRequired = stats?.level.xpRequired ?? 0;
  const nextLevelXp = stats?.level.nextLevelXpRequired ?? xpRequired + 2000;
  const xpInLevel = Math.max(0, xp - xpRequired);
  const xpForLevel = Math.max(1, nextLevelXp - xpRequired);

  const gardenData = stats?.garden;
  const gardenXp = gardenData?.growthPoints ?? 0;
  const gardenStageIndex = Math.max(
    0,
    GARDEN_STAGES.filter((g) => gardenXp >= g.threshold).length - 1,
  );
  const gardenStage = (GARDEN_STAGES[gardenStageIndex] ?? GARDEN_STAGES[0])!;
  const gardenNext = GARDEN_STAGES[gardenStageIndex + 1] ?? null;

  const claimedReward = stats?.dailyRewardClaimedToday ?? false;
  const latestMemory = memories?.[0];
  const gardenName = garden?.garden?.name || gardenData?.theme;

  const handleClaim = () => {
    claimDailyReward();
    // The claim is persisted server-side; refresh so the UI reflects it.
    queryClient.invalidateQueries({ queryKey: ["myStats"] });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-4xl bg-hero p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              <span aria-hidden>🌞</span> Good{" "}
              {firstName ? `${firstName}!` : "morning!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Small steps count. You have {totalTasks - done} things waiting whenever you're ready.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StreakBadge days={streak} />
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/25 px-3 py-1.5 text-xs font-semibold">
                <span aria-hidden>⭐</span> {xp.toLocaleString()} XP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <span aria-hidden>{levelEmoji}</span> Level {levelNumber} — {levelName}
              </span>
            </div>
          </div>
          <div className="grid place-items-center">
            <ProgressRing value={done} max={totalTasks} size={140} label={`${done} of ${totalTasks} complete`}>
              <div>
                <p className="text-2xl font-bold">
                  {done}/{totalTasks}
                </p>
                <p className="text-xs text-muted-foreground">complete</p>
              </div>
            </ProgressRing>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>Level progress</span>
            <span>
              {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
            </span>
          </div>
          <ProgressBar value={xpInLevel} max={xpForLevel} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="journey">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="journey" className="text-lg font-bold sm:text-xl">
              Today's Journey
            </h2>
            <span className="text-xs text-muted-foreground">{done} completed today</span>
          </div>
          <ul className="grid gap-3">
            {tasks.map((t) => {
              const isDone = t.done;
              return (
                <li key={t.id}>
                  <div className="card-soft hover-lift flex items-center gap-4 p-4">
                    <ToneIcon emoji={t.emoji} tone={t.tone} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {t.title}
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-mint/40 px-2 py-0.5 text-[11px] font-semibold">
                            ✓ Complete
                          </span>
                        ) : (
                          <XPBadge xp={t.xp} />
                        )}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{t.description}</p>
                    </div>
                    <Link
                      to={t.to}
                      className={`focus-ring rounded-full px-4 py-2 text-sm transition hover:brightness-105 ${isDone ? "bg-muted font-semibold" : "bg-brand font-bold text-navy"}`}
                    >
                      {isDone ? "View" : "Start"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <SoftCard className="bg-garden">
              <SectionTitle hint={`${gardenXp} Garden XP`}>My Garden</SectionTitle>
              <div className="flex items-center gap-4">
                <span className="animate-float text-5xl" aria-hidden>
                  {gardenStage.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{gardenStage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {gardenName ? `Currently: ${gardenName}` : "Your garden grows as you grow."}
                  </p>
                  {gardenNext ? (
                    <>
                      <ProgressBar
                        className="mt-2"
                        tone="mint"
                        value={gardenXp - gardenStage.threshold}
                        max={gardenNext.threshold - gardenStage.threshold}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {gardenNext.threshold - gardenXp} XP to {gardenNext.name} {gardenNext.emoji}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
              <CTALink to="/app/garden" variant="soft" className="mt-4 w-full">
                Visit My Garden
              </CTALink>
            </SoftCard>

            <SoftCard>
              <SectionTitle>Daily Reward</SectionTitle>
              <div className="flex items-center gap-4">
                <span className={claimedReward ? "text-5xl" : "animate-float text-5xl"} aria-hidden>
                  {claimedReward ? "🦋" : "🎁"}
                </span>
                <div>
                  <p className="font-semibold">
                    {claimedReward ? "Claimed — Butterfly Flock" : "Claim Today's Reward"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {claimedReward ? "Come back tomorrow for another." : "A garden surprise + 50 XP."}
                  </p>
                </div>
              </div>
              <button
                disabled={claimedReward}
                onClick={handleClaim}
                className="focus-ring mt-4 w-full rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {claimedReward ? "Claimed today ✓" : "Claim +50 XP"}
              </button>
            </SoftCard>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <SoftCard className="bg-hero">
            <div className="flex items-start gap-3">
              <NumiAvatar size={52} className="animate-float" />
              <div>
                <p className="text-sm font-semibold">Numi</p>
                <p className="mt-1 text-sm">
                  You're on a {streak}-day streak! One more Reset unlocks your next badge.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <CTALink to="/app/reset" className="focus-ring flex-1 rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy">
                Let's Go
              </CTALink>
              <CTALink to="/app/numi" variant="ghost" className="flex-1">
                Talk to Numi
              </CTALink>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Numi is an AI wellness companion, not a healthcare professional.
            </p>
          </SoftCard>

          <SoftCard>
            <SectionTitle>🌸 Memory Lane</SectionTitle>
            <p className="text-sm font-semibold">Look how far you've come!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {latestMemory ? `${latestMemory.emoji} ${latestMemory.title}` : "Your memories will appear here as you grow."}
            </p>
            <CTALink to="/app/memory-lane" variant="soft" className="mt-4 w-full">
              View Journey
            </CTALink>
          </SoftCard>

          <SoftCard>
            <SectionTitle>Quick jump</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: "/app/focus", emoji: "⚡", label: "Focus" },
                { to: "/app/journal", emoji: "📖", label: "Journal" },
                { to: "/app/play", emoji: "🎮", label: "Play" },
                { to: "/app/rewards", emoji: "🎁", label: "Rewards" },
              ].map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="focus-ring flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-3 text-sm font-medium hover:bg-accent"
                >
                  <span aria-hidden>{q.emoji}</span>
                  {q.label}
                </Link>
              ))}
            </div>
          </SoftCard>
        </aside>
      </div>
    </div>
  );
}
