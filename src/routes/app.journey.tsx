import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNuMind } from "@/lib/numind-store";
import { useMyAnalytics, useMyBadges } from "@/lib/server-data";
import { PageHeader, SoftCard, StatTile, ProgressBar, SectionTitle, ProgressRing, EmptyState, LoadingState } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/journey")({
  head: () => ({
    meta: [
      { title: "My Journey — NuMind" },
      { name: "description", content: "Levels, streaks, badges and a Wrapped-style monthly recap of your growth." },
      { property: "og:title", content: "My Journey — NuMind" },
      { property: "og:description", content: "Levels, streaks, badges and a Wrapped-style monthly recap of your growth." },
    ],
  }),
  component: JourneyPage,
});

function JourneyPage() {
  const { levelName, levelEmoji, levelIndex, xpInLevel, xpForLevel } = useNuMind();
  const { data: analytics, isLoading, isError, refetch } = useMyAnalytics();
  const { data: serverBadges } = useMyBadges();
  const [slide, setSlide] = useState(0);

  const badges = serverBadges ?? [];
  const earnedCount = badges.filter((b) => b.earned).length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader emoji="Sparkles" title="My Journey" subtitle="Sifting through your story…" />
        <LoadingState rows={5} />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader emoji="Sparkles" title="My Journey" />
        <EmptyState emoji="Sparkles" title="Can't reach your journey" message="We had trouble loading your progress." />
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => refetch()}
            className="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const s = analytics.summary;
  const hasData = s.activeDays > 0 || s.totalXp > 0;

  const stats: { emoji: string; label: string; value: string; tone: string }[] = [
    { emoji: "Star", label: "Total XP", value: s.totalXp.toLocaleString(), tone: "sun" },
    { emoji: "Flame", label: "Current streak", value: `${s.currentStreak} days`, tone: "coral" },
    { emoji: "Medal", label: "Longest streak", value: `${s.longestStreak} days`, tone: "coral" },
    { emoji: "Calendar", label: "Days active", value: `${s.activeDays}`, tone: "lavender" },
    { emoji: "Sun", label: "Daily Resets", value: `${s.resetsCompleted}`, tone: "sun" },
    { emoji: "PersonStanding", label: "Mind Gym activities", value: `${s.mindGymCompletions}`, tone: "teal" },
    { emoji: "Zap", label: "Focus sessions", value: `${s.focusSessions}`, tone: "lavender" },
    { emoji: "BookOpen", label: "Journal entries", value: `${s.journalEntries}`, tone: "mint" },
    { emoji: "GraduationCap", label: "Lessons completed", value: `${s.lessonsCompleted}`, tone: "cyan" },
    { emoji: "Trophy", label: "Quests completed", value: `${s.questsCompleted}`, tone: "sun" },
    { emoji: "Target", label: "Goals achieved", value: `${s.goalsAchieved}`, tone: "mint" },
    { emoji: "Award", label: "Badges earned", value: `${s.badgesEarned}`, tone: "coral" },
  ];

  // Data-driven "Wrapped-style" recap, built only from the user's real numbers.
  const recap: { emoji: string; title: string; value: string; sub: string }[] = [];
  if (s.activeDays > 0)
    recap.push({ emoji: "Sparkles", title: "Your Story", value: `${s.activeDays} active days`, sub: "A season of showing up for yourself" });
  if (s.longestStreak > 0)
    recap.push({ emoji: "Flame", title: "Longest Streak", value: `${s.longestStreak} days`, sub: "Your personal best" });
  if (s.totalXp > 0)
    recap.push({ emoji: "Star", title: "XP Earned", value: `${s.totalXp.toLocaleString()} XP`, sub: "From resets, journal, focus and more" });
  if (s.resetsCompleted > 0)
    recap.push({ emoji: "Sun", title: "Daily Resets", value: `${s.resetsCompleted}`, sub: "Small, steady mornings" });
  if (s.mindGymCompletions > 0)
    recap.push({ emoji: "PersonStanding", title: "Mind Gym Sessions", value: `${s.mindGymCompletions}`, sub: "Little steps toward staying present" });
  if (s.focusSessions > 0)
    recap.push({ emoji: "Zap", title: "Focus Sessions", value: `${s.focusSessions}`, sub: `${Math.round(s.focusMinutes)} min of deep work` });
  if (s.journalEntries > 0)
    recap.push({ emoji: "BookOpen", title: "Journal Entries", value: `${s.journalEntries}`, sub: "Thoughts worth keeping" });
  if (s.lessonsCompleted > 0)
    recap.push({ emoji: "GraduationCap", title: "Lessons Completed", value: `${s.lessonsCompleted}`, sub: "Learning at your own pace" });
  if (s.badgesEarned > 0)
    recap.push({ emoji: "Trophy", title: "Badges Earned", value: `${s.badgesEarned}`, sub: "Milestones along the way" });
  if (recap.length === 0) {
    recap.push({ emoji: "Sprout", title: "Your Journey", value: "It begins here", sub: "Complete your first Daily Reset and your story will start to unfold." });
  }

  const card = recap[slide]!;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="Sparkles" title="My Journey" subtitle="Look how far you've come." />

      <SoftCard className="bg-hero flex flex-wrap items-center gap-6">
        <ProgressRing value={xpInLevel} max={xpForLevel} size={150}>
          <div>
            <p className="text-3xl" aria-hidden>{levelEmoji}</p>
            <p className="text-xs font-semibold">Level {levelIndex + 1}</p>
          </div>
        </ProgressRing>
        <div className="min-w-[220px] flex-1">
          <h2 className="text-xl font-bold">{levelName}</h2>
          <p className="text-sm text-muted-foreground">{xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP to the next level</p>
          <ProgressBar className="mt-3" value={xpInLevel} max={xpForLevel} />
        </div>
      </SoftCard>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((t) => (
          <StatTile key={t.label} emoji={t.emoji} label={t.label} value={t.value} tone={t.tone} />
        ))}
      </div>

      <section className="mt-8">
        <SectionTitle hint="Swipe through">Monthly Journey</SectionTitle>
        <SoftCard className="bg-hero text-center">
          <div className="animate-pop" key={slide}>
            <p className="text-5xl" aria-hidden>{card.emoji}</p>
            <p className="mt-3 text-sm text-muted-foreground">{card.title}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.sub}</p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setSlide((prev) => Math.max(0, prev - 1))}
              disabled={slide === 0}
              className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Back
            </button>
            <div className="flex gap-1" aria-hidden>
              {recap.map((_, i) => (
                <span key={i} className={cn("h-1.5 w-4 rounded-full", i === slide ? "bg-teal" : "bg-muted")} />
              ))}
            </div>
            <button
              onClick={() => setSlide((prev) => Math.min(recap.length - 1, prev + 1))}
              className="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy"
            >
              {slide === recap.length - 1 ? (
                  <>
                    <Icon symbol="PartyPopper" size={15} className="mr-1 inline-block align-[-1px]" /> Finish
                  </>
                ) : "Next"}
            </button>
          </div>
        </SoftCard>
      </section>

      <section className="mt-8">
        <SectionTitle {...(hasData ? { hint: `${earnedCount} of ${badges.length} earned` } : {})}>Badges</SectionTitle>
        {badges.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {badges.map((b) => (
              <li key={b.id}>
                <div className={cn("card-soft p-4 text-center", !b.earned && "opacity-60")}>
                  <p className="text-3xl" aria-hidden>
                    <Icon symbol={b.earned ? b.emoji : "Lock"} size={32} />
                  </p>
                  <p className="mt-2 text-sm font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState emoji="Medal" title="No badges yet" message="Complete activities to start earning badges." />
        )}
      </section>
    </div>
  );
}