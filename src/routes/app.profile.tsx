import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BADGES, USER } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { useMyStats, useMyBadges, useMyMemories } from "@/lib/server-data";
import { PageHeader, SoftCard, StatTile, SectionTitle, CTALink } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — NuMind" },
      {
        name: "description",
        content: "Your avatar, level, streaks, badges, goals and favourite memories.",
      },
      { property: "og:title", content: "Profile — NuMind" },
      {
        property: "og:description",
        content: "Your avatar, level, streaks, badges, goals and favourite memories.",
      },
    ],
  }),
  component: ProfilePage,
});

const AVATARS = ["Flower2", "Sun", "Cat", "Turtle", "Waves", "Clover", "Bird", "Moon"];

function ProfilePage() {
  const { xp, streak, longestStreak, levelName, levelEmoji, levelIndex, gardenStage } = useNuMind();
  const { data: stats } = useMyStats();
  const { data: serverBadges } = useMyBadges();
  const { data: myMemories } = useMyMemories();
  const [avatar, setAvatar] = useState(USER.avatar);
  const [nickname, setNickname] = useState(USER.nickname);

  // Once the real profile has loaded, prefer its avatar + nickname.
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current || !stats?.profile) return;
    synced.current = true;
    if (stats.profile.nickname) setNickname(stats.profile.nickname);
    if (stats.profile.avatar) setAvatar(stats.profile.avatar);
  }, [stats]);

  const badges = serverBadges?.length
    ? serverBadges.map((b) => ({
        emoji: b.emoji,
        name: b.name,
        earned: b.earned,
        slug: b.slug,
      }))
    : BADGES.map((b) => ({ emoji: b.emoji, name: b.name, earned: b.earned, slug: b.id }));

  const favMemories = (myMemories ?? []).filter((m) => m.favorite).slice(0, 2);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader emoji="UserRound" title="Profile" subtitle="Make it feel like yours." />

      <SoftCard className="bg-hero flex flex-wrap items-center gap-5">
        <span
          className="grid h-24 w-24 place-items-center rounded-full bg-surface shadow-soft"
          aria-hidden
        >
          <Icon symbol={avatar} size={48} />
        </span>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="nick" className="text-xs text-muted-foreground">
            Nickname
          </label>
          <input
            id="nick"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="focus-ring mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
          />
          <p className="mt-3 text-sm font-semibold">
            <Icon symbol={levelEmoji} size={15} className="mr-1 inline-block align-[-2px]" />
            Level {levelIndex + 1} — {levelName} · Joined {USER.joined}
          </p>
        </div>
      </SoftCard>

      <SoftCard className="mt-4">
        <SectionTitle>Choose your avatar</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              aria-pressed={avatar === a}
              className={cn(
                "focus-ring grid h-14 w-14 place-items-center rounded-2xl",
                avatar === a ? "bg-brand" : "bg-muted hover:bg-accent",
              )}
            >
              <span aria-hidden>
                <Icon symbol={a} size={24} className={avatar === a ? "text-navy" : undefined} />
              </span>
            </button>
          ))}
        </div>
      </SoftCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile emoji="Star" label="Total XP" value={xp.toLocaleString()} tone="sun" />
        <StatTile emoji="Flame" label="Current streak" value={`${streak} days`} tone="coral" />
        <StatTile emoji="Medal" label="Longest streak" value={`${longestStreak} days`} tone="coral" />
        <StatTile emoji="Trees" label="Garden" value={gardenStage.name} tone="mint" />
      </div>

      <section className="mt-6">
        <SectionTitle>Badges</SectionTitle>
        <ul className="flex flex-wrap gap-2">
          {badges
            .filter((b) => b.earned)
            .map((b) => (
              <li key={b.slug} className="rounded-full bg-muted px-4 py-2 text-sm font-semibold">
                <Icon symbol={b.emoji} size={14} className="mr-1 inline-block align-[-2px]" /> {b.name}
              </li>
            ))}
        </ul>
      </section>

      <section className="mt-6">
        <SectionTitle>Favourite memories</SectionTitle>
        {favMemories.length ? (
          <ul className="grid gap-2">
            {favMemories.map((m) => (
              <li key={m.id} className="card-soft p-4 text-sm">
                <Icon symbol={m.emoji ?? "Flower2"} size={16} className="mr-1 inline-block align-[-2px]" />
                {m.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card-soft p-4 text-sm text-muted-foreground">
            Pin or favourite a memory on Memory Lane and it'll live here.
          </p>
        )}
        <CTALink to="/app/memory-lane" variant="soft" className="mt-4">
          Open Memory Lane
        </CTALink>
      </section>
    </div>
  );
}