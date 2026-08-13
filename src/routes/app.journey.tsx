import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BADGES, MONTHLY_JOURNEY } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, StatTile, ProgressBar, SectionTitle, ProgressRing } from "@/components/numind/ui-kit";
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
  const { xp, streak, longestStreak, levelName, levelEmoji, levelIndex, xpInLevel, xpForLevel } = useNuMind();
  const [slide, setSlide] = useState(0);
  const card = MONTHLY_JOURNEY[slide]!;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="✨" title="My Journey" subtitle="Look how far you've come." />

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
        <StatTile emoji="⭐" label="Total XP" value={xp.toLocaleString()} tone="sun" />
        <StatTile emoji="🔥" label="Current streak" value={`${streak} days`} tone="coral" />
        <StatTile emoji="🏅" label="Longest streak" value={`${longestStreak} days`} tone="coral" />
        <StatTile emoji="📅" label="Days active" value={96} tone="lavender" />
        <StatTile emoji="🌞" label="Daily Resets" value={88} tone="sun" />
        <StatTile emoji="🧘" label="Mind Gym activities" value={112} tone="teal" />
        <StatTile emoji="⚡" label="Focus sessions" value={47} tone="lavender" />
        <StatTile emoji="📖" label="Journal entries" value={34} tone="mint" />
        <StatTile emoji="🎓" label="Lessons completed" value={18} tone="cyan" />
        <StatTile emoji="🏆" label="Quests completed" value={63} tone="sun" />
        <StatTile emoji="🎯" label="Goals achieved" value={9} tone="mint" />
        <StatTile emoji="🎖" label="Badges earned" value={BADGES.filter((b) => b.earned).length} tone="coral" />
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
              onClick={() => setSlide((s) => Math.max(0, s - 1))}
              disabled={slide === 0}
              className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Back
            </button>
            <div className="flex gap-1" aria-hidden>
              {MONTHLY_JOURNEY.map((_, i) => (
                <span key={i} className={cn("h-1.5 w-4 rounded-full", i === slide ? "bg-teal" : "bg-muted")} />
              ))}
            </div>
            <button
              onClick={() => setSlide((s) => Math.min(MONTHLY_JOURNEY.length - 1, s + 1))}
              className="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy"
            >
              {slide === MONTHLY_JOURNEY.length - 1 ? "🎉 Finish" : "Next"}
            </button>
          </div>
        </SoftCard>
      </section>

      <section className="mt-8">
        <SectionTitle hint={`${BADGES.filter((b) => b.earned).length} of ${BADGES.length} earned`}>Badges</SectionTitle>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BADGES.map((b) => (
            <li key={b.id}>
              <div className={cn("card-soft p-4 text-center", !b.earned && "opacity-60")}>
                <p className="text-3xl" aria-hidden>{b.earned ? b.emoji : "🔒"}</p>
                <p className="mt-2 text-sm font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
