import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PLAY_ACTIVITIES } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { recordGamePlay } from "@/lib/server-functions";
import { PageHeader, SoftCard, XPBadge, LockedPill } from "@/components/numind/ui-kit";
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

function PlayPage() {
  const { awardXp, celebrate } = useNuMind();
  const [open, setOpen] = useState<string | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [bingo, setBingo] = useState<number[]>([0, 4]);
  const [spin, setSpin] = useState<string | null>(null);
  const [sense, setSense] = useState(0);

  const SENSES = ["5 things you can see", "4 things you can feel", "3 things you can hear", "2 things you can smell", "1 thing you can taste"];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="🎮" title="Healthy Play" subtitle="Play a little. It still counts as showing up." />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLAY_ACTIVITIES.map((a) => (
          <li key={a.id}>
            <SoftCard interactive className="flex h-full flex-col">
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden>{a.emoji}</span>
                {a.locked ? <LockedPill label="Premium" /> : <XPBadge xp={a.xp} />}
              </div>
              <p className="mt-3 font-semibold">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
              <button
                disabled={a.locked}
                onClick={() => (a.playable ? setOpen(a.id) : awardXp(a.xp, `${a.name} complete`))}
                className={cn("focus-ring mt-4 rounded-full px-4 py-2.5 text-sm font-bold", a.locked ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-brand text-navy")}
              >
                {a.locked ? "Premium" : a.playable ? "Play" : "Mark done"}
              </button>
            </SoftCard>
          </li>
        ))}
      </ul>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="card-soft animate-pop w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            {open === "trivia" || open === "myth" ? (
              <div>
                <h2 className="text-lg font-bold">Wellness Trivia</h2>
                <p className="mt-2 text-sm">{TRIVIA.q}</p>
                <ul className="mt-4 grid gap-2">
                  {TRIVIA.options.map((o, i) => (
                    <li key={o}>
                      <button
                        onClick={() => setAnswer(i)}
                        className={cn(
                          "focus-ring w-full rounded-2xl border px-4 py-3 text-left text-sm",
                          answer === null ? "border-border bg-muted/50" : i === TRIVIA.correct ? "border-teal bg-mint/40 font-semibold" : answer === i ? "border-coral bg-coral/15" : "border-border bg-muted/40",
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
                <h2 className="text-lg font-bold">Breathing Bubble</h2>
                <div className="animate-breathe my-8 grid h-40 w-40 place-items-center rounded-full bg-brand text-3xl">🫧</div>
                <p className="text-sm text-muted-foreground">In as it grows, out as it shrinks.</p>
              </div>
            ) : open === "bingo" ? (
              <div>
                <h2 className="text-lg font-bold">Healthy Habit Bingo</h2>
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
                <h2 className="text-lg font-bold">Wellness Wheel</h2>
                <div className={cn("my-6 grid h-40 w-40 place-items-center rounded-full bg-brand text-4xl transition-transform duration-1000", spin && "rotate-[720deg]")}>🎡</div>
                <p className="text-sm">{spin ?? "Give it a spin for today's micro-challenge."}</p>
                <button onClick={() => setSpin("Drink a glass of water and step outside for 5 minutes 💧🌞")} className="focus-ring mt-4 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">
                  Spin
                </button>
              </div>
            ) : open === "match" ? (
              <div>
                <h2 className="text-lg font-bold">Focus Match</h2>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {["🌱","🌱","🦋","🦋","🌞","🌞","💧","💧"].map((e, i) => (
                    <button key={i} className="focus-ring grid h-16 place-items-center rounded-2xl bg-muted/60 text-2xl hover:bg-accent">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-bold">5-Senses Grounding</h2>
                <p className="mt-4 rounded-3xl bg-muted/60 p-6 text-center text-lg font-semibold">{SENSES[sense]}</p>
                <button onClick={() => setSense((s) => Math.min(SENSES.length - 1, s + 1))} className="focus-ring mt-4 w-full rounded-full bg-muted py-2.5 text-sm font-semibold">
                  Next
                </button>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <button onClick={() => setOpen(null)} className="focus-ring flex-1 rounded-full bg-muted py-3 text-sm font-semibold">Close</button>
              <button
                onClick={() => {
                  const gameId = open ?? "activity";
                  setOpen(null);
                  celebrate({ emoji: "🎮", title: "Nice play!", message: "That counts toward today's journey.", xp: 20, chain: ["+20 XP earned", "Quest progress updated", "Garden growth updated", "Numi is celebrating 🤖"] });
                  // Persist the play session (XP once per game per day).
                  recordGamePlay({ data: { game: gameId, xp: 20 } }).catch(() => {});
                }}
                className="focus-ring flex-1 rounded-full bg-brand py-3 text-sm font-bold text-navy"
              >
                Finish +20 XP
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
