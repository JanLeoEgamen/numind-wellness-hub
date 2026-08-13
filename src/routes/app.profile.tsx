import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BADGES, MEMORIES, USER } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, StatTile, SectionTitle, CTALink } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — NuMind" },
      { name: "description", content: "Your avatar, level, streaks, badges, goals and favourite memories." },
      { property: "og:title", content: "Profile — NuMind" },
      { property: "og:description", content: "Your avatar, level, streaks, badges, goals and favourite memories." },
    ],
  }),
  component: ProfilePage,
});

const AVATARS = ["🌷", "🌻", "🦊", "🐢", "🌊", "🍀", "🐦", "🌙"];

function ProfilePage() {
  const { xp, streak, longestStreak, levelName, levelEmoji, levelIndex, gardenStage } = useNuMind();
  const [avatar, setAvatar] = useState(USER.avatar);
  const [nickname, setNickname] = useState(USER.nickname);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader emoji="👤" title="Profile" subtitle="Make it feel like yours." />

      <SoftCard className="bg-hero flex flex-wrap items-center gap-5">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-surface text-5xl shadow-soft" aria-hidden>{avatar}</span>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="nick" className="text-xs text-muted-foreground">Nickname</label>
          <input id="nick" value={nickname} onChange={(e) => setNickname(e.target.value)} className="focus-ring mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm" />
          <p className="mt-3 text-sm font-semibold">{levelEmoji} Level {levelIndex + 1} — {levelName} · Joined {USER.joined}</p>
        </div>
      </SoftCard>

      <SoftCard className="mt-4">
        <SectionTitle>Choose your avatar</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => setAvatar(a)} aria-pressed={avatar === a} className={cn("focus-ring grid h-14 w-14 place-items-center rounded-2xl text-2xl", avatar === a ? "bg-brand" : "bg-muted hover:bg-accent")}>
              <span aria-hidden>{a}</span>
            </button>
          ))}
        </div>
      </SoftCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile emoji="⭐" label="Total XP" value={xp.toLocaleString()} tone="sun" />
        <StatTile emoji="🔥" label="Current streak" value={`${streak} days`} tone="coral" />
        <StatTile emoji="🏅" label="Longest streak" value={`${longestStreak} days`} tone="coral" />
        <StatTile emoji="🌳" label="Garden" value={gardenStage.name} tone="mint" />
      </div>

      <section className="mt-6">
        <SectionTitle>Badges</SectionTitle>
        <ul className="flex flex-wrap gap-2">
          {BADGES.filter((b) => b.earned).map((b) => (
            <li key={b.id} className="rounded-full bg-muted px-4 py-2 text-sm font-semibold">{b.emoji} {b.name}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <SectionTitle>Favourite memories</SectionTitle>
        <ul className="grid gap-2">
          {MEMORIES.slice(0, 2).map((m) => (
            <li key={m.id} className="card-soft p-4 text-sm">{m.emoji} {m.title}</li>
          ))}
        </ul>
        <CTALink to="/app/memory-lane" variant="soft" className="mt-4">Open Memory Lane</CTALink>
      </section>
    </div>
  );
}
