import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNuMind } from "@/lib/numind-store";
import { recordGamePlay } from "@/lib/server-functions";
import { useMyGames } from "@/lib/server-data";
import { PageHeader, SoftCard, XPBadge, LockedPill, LoadingState, EmptyState } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/play")({
  head: () => ({
    meta: [
      { title: "Healthy Play — NuMind" },
      { name: "description", content: "Trivia, breathing bubbles, memory games, bingo and a wellness wheel. Fun that counts." },
      { property: "og:title", content: "Healthy Play — NuMind" },
      { property: "og:description", content: "Trivia, breathing bubbles, memory games, bingo and a wellness wheel. Fun that counts." },
    ],
  }),
  component: PlayPage,
});

const TRIVIA = {
  q: "Roughly how long does it take for slow breathing to start calming your body?",
  options: ["About 60 seconds", "About 30 minutes", "Two hours", "It doesn't"],
  correct: 0,
};

const BINGO = ["💧 8 glasses", "🚶 Walk", "😴 7h sleep", "🧘 Mindful min", "😊 Gratitude", "🌞 Outside", "📖 Read", "❤️ Kind act", "⚡ Focus"];

const SENSES = ["5 things you can see", "4 things you can feel", "3 things you can hear", "2 things you can smell", "1 thing you can taste"];

function PlayPage() {
  const { awardXp, celebrate } = useNuMind();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useMyGames();
  const [open, setOpen] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [bingo, setBingo] = useState<number[]>([0, 4]);
  const [spin, setSpin] = useState<string | null>(null);
  const [sense, setSense] = useState(0);

  const openGame = data?.games.find((g) => g.slug === open);

  const finish = async (game: string, xp: number) => {
    if (finishing) return;
    setFinishing(true);
    try {
      const res = await recordGamePlay({ data: { game, xp } });
      if (res.awarded) {
        awardXp(xp, "Play complete");
        celebrate({
          emoji: "🎮",
          title: "Nice play!",
          message: "That counts toward today's journey.",
          xp,
          chain: [`+${xp} XP earned`, "Quest progress updated", "Garden growth updated", "Numi is celebrating 🤖"],
        });
      } else if (res.playedToday) {
        toast.info("Already played today — nice revisit!");
      } else {
        toast.error("That game isn't available right now.");
      }

      const prev = queryClient.getQueryData<{
        games: Array<{ slug: string; playedToday: boolean }>;
        playedTodayCount: number;
      }>(["myGames"]);
      if (prev) {
        const already = prev.games.some((g) => g.slug === game && g.playedToday);
        queryClient.setQueryData(["myGames"], {
          ...prev,
          games: prev.games.map((g) => (g.slug === game ? { ...g, playedToday: true } : g)),
          playedTodayCount: already ? prev.playedTodayCount : prev.playedTodayCount + 1,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that play.");
    } finally {
      setFinishing(false);
      setOpen(null);
    }
  };

  if (isError && !data) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader emoji="🎮" title="Healthy Play" subtitle="Play a little. It still counts as showing up." />
        <EmptyState
          emoji="🌥"
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
        <PageHeader emoji="🎮" title="Healthy Play" subtitle="Play a little. It still counts as showing up." />
        <LoadingState rows={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="🎮" title="Healthy Play" subtitle="Play a little. It still counts as showing up." />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.games.map((g) => {
          const locked = g.premiumRequired && !data.isPremium;
          return (
            <li key={g.id}>
              <SoftCard interactive className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <span className="text-3xl" aria-hidden>{g.emoji ?? "🎮"}</span>
                  {locked ? (
                    <LockedPill label="Premium" />
                  ) : g.playedToday ? (
                    <span className="rounded-full bg-mint/40 px-2.5 py-1 text-[11px] font-semibold">Played ✓</span>
                  ) : (
                    <XPBadge xp={g.xpReward} />
                  )}
                </div>
                <p className="mt-3 font-semibold">{g.name}</p>
                <p className="text-sm text-muted-foreground">{g.description}</p>
                <button
                  disabled={locked || g.playedToday}
                  onClick={() => setOpen(g.slug)}
                  className={cn(
                    "focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold",
                    locked || g.playedToday ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-brand text-navy",
                  )}
                >
                  {locked ? "Premium" : g.playedToday ? "Played today" : "Play"}
                </button>
              </SoftCard>
            </li>
          );
        })}
      </ul>

      {open && openGame ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!finishing) setOpen(null);
          }}
        >
          <div className="card-soft animate-pop w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-3xl" aria-hidden>{openGame.emoji ?? "🎮"}</span>
              <h2 className="text-lg font-bold">{openGame.name}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{openGame.description}</p>

            {open === "trivia" || open === "myth" ? (
              <div>
                <p className="mt-4 text-sm">{TRIVIA.q}</p>
                <ul className="mt-3 grid gap-2">
                  {TRIVIA.options.map((o, i) => (
                    <li key={o}>
                      <button
                        onClick={() => setAnswer(i)}
                        className={cn(
                          "focus-ring w-full rounded-2xl border px-4 py-3 text-left text-sm",
                          answer === null
                            ? "border-border bg-muted/50"
                            : i === TRIVIA.correct
                              ? "border-teal bg-mint/40 font-semibold"
                              : answer === i
                                ? "border-coral bg-coral/15"
                                : "border-border bg-muted/40",
                        )}
                      >
                        {o}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : open === "bubble" ? (
              <div className="grid place-items-center py-6 text-center">
                <div className="animate-breathe my-8 grid h-40 w-40 place-items-center rounded-full bg-brand text-3xl">🫧</div>
                <p className="text-sm text-muted-foreground">In as it grows, out as it shrinks.</p>
              </div>
            ) : open === "bingo" ? (
              <div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {BINGO.map((b, i) => (
                    <button
                      key={b}
                      onClick={() => setBingo((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
                      aria-pressed={bingo.includes(i)}
                      className={cn("focus-ring rounded-2xl px-2 py-5 text-xs font-semibold", bingo.includes(i) ? "bg-mint/50" : "bg-muted/60")}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            ) : open === "wheel" ? (
              <div className="grid place-items-center py-4 text-center">
                <div className={cn("my-6 grid h-40 w-40 place-items-center rounded-full bg-brand text-4xl transition-transform duration-1000", spin && "rotate-[720deg]")}>🎡</div>
                <p className="text-sm">{spin ?? "Give it a spin for today's micro-challenge."}</p>
                <button onClick={() => setSpin("Drink a glass of water and step outside for 5 minutes 💧🌞")} className="focus-ring mt-4 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">
                  Spin
                </button>
              </div>
            ) : open === "match" ? (
              <div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {["🌱", "🌱", "🦋", "🦋", "🌞", "🌞", "💧", "💧"].map((e, i) => (
                    <button key={i} className="focus-ring grid h-16 place-items-center rounded-2xl bg-muted/60 text-2xl hover:bg-accent">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ) : open === "senses" ? (
              <div>
                <p className="mt-4 rounded-3xl bg-muted/60 p-6 text-center text-lg font-semibold">{SENSES[sense]}</p>
                <button onClick={() => setSense((s) => Math.min(SENSES.length - 1, s + 1))} className="focus-ring mt-4 w-full rounded-full bg-muted py-2.5 text-sm font-semibold">
                  Next
                </button>
              </div>
            ) : (
              <div>
                <p className="mt-4 rounded-3xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">
                  Take a minute for today's {openGame.name.toLowerCase()} — then finish to earn your XP.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={() => setOpen(null)} disabled={finishing} className="focus-ring flex-1 rounded-full bg-muted py-3 text-sm font-semibold disabled:opacity-50">
                Close
              </button>
              <button
                onClick={() => finish(openGame.slug, openGame.xpReward)}
                disabled={finishing}
                className="focus-ring flex-1 rounded-full bg-brand py-3 text-sm font-bold text-navy disabled:opacity-50"
              >
                {finishing ? "Finishing…" : `Finish +${openGame.xpReward} XP`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
