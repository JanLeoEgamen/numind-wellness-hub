import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNuMind } from "@/lib/numind-store";
import { submitDailyReset, saveMindCheck, getMindChecks } from "@/lib/server-functions";
import type { MindCheckSnapshot } from "@/lib/server-functions";
import { PageHeader, SoftCard, DisclaimerNote, XPBadge, ToneIcon } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reset")({
  head: () => ({
    meta: [
      { title: "Daily Reset — NuMind" },
      { name: "description", content: "A one-minute daily ritual: mood, energy, focus, sleep and today's intention." },
      { property: "og:title", content: "Daily Reset — NuMind" },
      { property: "og:description", content: "Take one minute for yourself with the NuMind Daily Reset." },
    ],
  }),
  component: ResetPage,
});

const MOODS = [
  { emoji: "😁", label: "Amazing" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Tough Day" },
];

const INTENTIONS = [
  { emoji: "🎯", label: "Productivity" },
  { emoji: "🧘", label: "Calm" },
  { emoji: "🏃", label: "Movement" },
  { emoji: "💧", label: "Hydration" },
  { emoji: "😊", label: "Positivity" },
  { emoji: "❤️", label: "Self-Care" },
  { emoji: "📖", label: "Learning" },
];

const CHECKS = [
  { checkType: "mood" as const, emoji: "💙", name: "Mood Check", desc: "Notice how today actually feels.", tone: "cyan" },
  { checkType: "worry" as const, emoji: "🌿", name: "Worry Check", desc: "Name what's on your mind.", tone: "mint" },
  { checkType: "focus" as const, emoji: "⚡", name: "Focus Check", desc: "See where your attention is.", tone: "lavender" },
];

type CheckType = "mood" | "worry" | "focus";

function ResetPage() {
  const { completeTask, isComplete } = useNuMind();
  const done = isComplete("reset");
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState(6);
  const [focus, setFocus] = useState(5);
  const [sleep, setSleep] = useState(3);
  const [intention, setIntention] = useState<string | null>(null);

  // Mind / Worry / Focus Check reflection
  const [checkOpen, setCheckOpen] = useState<CheckType | null>(null);
  const [rating, setRating] = useState(3);
  const [note, setNote] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [savedChecks, setSavedChecks] = useState<MindCheckSnapshot | null>(null);
  const activeCheck = CHECKS.find((c) => c.checkType === checkOpen);

  // Load today's saved Mood / Worry / Focus reflections so returning users see
  // what was persisted and the modals pre-fill. Ignored when signed out/offline.
  useEffect(() => {
    let cancelled = false;
    getMindChecks()
      .then((snap) => {
        if (!cancelled) setSavedChecks(snap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const savedValueFor = (checkType: CheckType): number | null =>
    savedChecks
      ? checkType === "mood"
        ? savedChecks.mood
        : checkType === "worry"
          ? savedChecks.stress
          : savedChecks.focus
      : null;

  const openCheck = (checkType: CheckType) => {
    const saved = savedValueFor(checkType);
    setRating(saved ?? 3);
    setNote(checkType === "mood" ? "" : (savedChecks?.note ?? ""));
    setCheckOpen(checkType);
  };

  const saveReflection = async () => {
    if (!checkOpen) return;
    setSavingReflection(true);
    const payload =
      checkOpen === "mood"
        ? { checkType: "mood" as const, mood: rating }
        : checkOpen === "worry"
          ? { checkType: "worry" as const, stress: rating, note: note || null }
          : { checkType: "focus" as const, focus: rating, note: note || null };
    try {
      await saveMindCheck({ data: payload });
      toast.success("Reflection saved 🌱");
      setSavedChecks((cur) => {
        const base = cur ?? { date: "", mood: null, energy: null, stress: null, focus: null, note: null };
        if (checkOpen === "mood") return { ...base, mood: rating };
        if (checkOpen === "worry") return { ...base, stress: rating, note: note || null };
        return { ...base, focus: rating, note: note || null };
      });
    } catch {
      toast.error("Couldn't save right now");
    }
    setSavingReflection(false);
    setRating(3);
    setNote("");
    setCheckOpen(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        emoji="🌞"
        title="Daily Reset"
        subtitle="Take one minute for yourself."
        action={<XPBadge xp={20} />}
      />

      {done ? (
        <SoftCard className="animate-pop bg-hero text-center">
          <p className="text-5xl" aria-hidden>
            🎉
          </p>
          <h2 className="mt-3 text-xl font-bold">Reset complete!</h2>
          <p className="mt-1 text-sm text-muted-foreground">You showed up for yourself today.</p>
          <p className="mt-4 inline-flex rounded-full bg-sun/25 px-4 py-1.5 text-sm font-bold">+20 XP</p>
          <p className="mt-4 text-sm text-muted-foreground">
            See you tomorrow morning — your streak is safe. 🌱
          </p>
        </SoftCard>
      ) : (
        <div className="grid gap-4">
          <SoftCard>
            <h2 className="font-bold">How are you feeling?</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setMood(m.label)}
                  aria-pressed={mood === m.label}
                  className={cn(
                    "focus-ring rounded-3xl border p-4 text-center transition hover:-translate-y-0.5",
                    mood === m.label ? "border-teal bg-teal/15 shadow-soft" : "border-border bg-muted/40",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {m.emoji}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{m.label}</p>
                  {mood === m.label ? <p className="text-[11px] text-muted-foreground">Selected ✓</p> : null}
                </button>
              ))}
            </div>
          </SoftCard>

          <SoftCard>
            <label htmlFor="energy" className="font-bold">
              Energy
            </label>
            <input
              id="energy"
              type="range"
              min={1}
              max={10}
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="focus-ring mt-4 w-full accent-[var(--color-teal)]"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span className="font-semibold text-foreground">{energy}/10</span>
              <span>High</span>
            </div>
          </SoftCard>

          <SoftCard>
            <label htmlFor="focus" className="font-bold">
              Focus
            </label>
            <input
              id="focus"
              type="range"
              min={1}
              max={10}
              value={focus}
              onChange={(e) => setFocus(Number(e.target.value))}
              className="focus-ring mt-4 w-full accent-[var(--color-lavender)]"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Foggy</span>
              <span className="font-semibold text-foreground">{focus}/10</span>
              <span>Focused</span>
            </div>
          </SoftCard>

          <SoftCard>
            <p className="font-bold">Sleep</p>
            <div className="mt-3 flex gap-2" role="group" aria-label="Sleep rating out of five">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSleep(n)}
                  aria-label={`${n} of 5 stars`}
                  aria-pressed={sleep === n}
                  className="focus-ring text-3xl transition hover:scale-110"
                >
                  <span aria-hidden>{n <= sleep ? "⭐" : "☆"}</span>
                </button>
              ))}
            </div>
          </SoftCard>

          <SoftCard>
            <h2 className="font-bold">Today's Intention</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {INTENTIONS.map((i) => (
                <button
                  key={i.label}
                  onClick={() => setIntention(i.label)}
                  aria-pressed={intention === i.label}
                  className={cn(
                    "focus-ring rounded-full border px-4 py-2 text-sm font-medium transition",
                    intention === i.label
                      ? "border-teal bg-teal/15 font-semibold"
                      : "border-border bg-muted/40 hover:bg-accent",
                  )}
                >
                  <span aria-hidden>{i.emoji}</span> {i.label}
                </button>
              ))}
            </div>
          </SoftCard>

          <button
            onClick={() => {
              const moodNum = MOODS.findIndex((m) => m.label === mood) + 1;
              submitDailyReset({
                data: {
                  mood: moodNum > 0 ? moodNum : null,
                  energy: Math.min(5, Math.max(1, Math.round(energy / 2))),
                  focus: Math.min(5, Math.max(1, Math.round(focus / 2))),
                  sleepRating: sleep,
                  intention,
                  completed: true,
                },
              }).catch(() => {
                // Offline or not authenticated — the local Daily Reset still completes.
              });
              completeTask("reset");
            }}
            disabled={!mood}
            className="focus-ring rounded-full bg-brand px-6 py-4 text-base font-bold text-navy shadow-glow transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {mood ? "Complete Daily Reset" : "Pick a mood to continue"}
          </button>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-bold">Mind Check</h2>
        <p className="mt-1 text-sm text-muted-foreground">Optional reflections, whenever you want them.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {CHECKS.map((c) => (
            <SoftCard key={c.name} interactive>
              <ToneIcon emoji={c.emoji} tone={c.tone} />
              <p className="mt-3 font-semibold">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
              {savedValueFor(c.checkType) != null ? (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-semibold text-teal">
                  ✓ {savedValueFor(c.checkType)}/5 saved today
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground/70">Not saved yet</p>
              )}
              <button
                onClick={() => openCheck(c.checkType)}
                className="focus-ring mt-4 w-full rounded-full bg-muted py-2 text-sm font-semibold hover:bg-accent"
              >
                Reflect
              </button>
            </SoftCard>
          ))}
        </div>
        <div className="mt-4">
          <DisclaimerNote>
            Your responses can help you notice patterns over time. NuMind does not provide a diagnosis.
          </DisclaimerNote>
        </div>
      </section>

      {checkOpen && activeCheck ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeCheck.name}
          onClick={() => setCheckOpen(null)}
        >
          <div
            className="card-soft animate-pop w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ToneIcon emoji={activeCheck.emoji} tone={activeCheck.tone} />
              <div>
                <h2 className="text-lg font-bold">{activeCheck.name}</h2>
                <p className="text-sm text-muted-foreground">{activeCheck.desc}</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold">Rate it 1–5</label>
            <div className="mt-2 flex gap-2" role="group" aria-label="Rating out of five">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-pressed={rating === n}
                  aria-label={`${n} of 5`}
                  className={cn(
                    "focus-ring h-12 w-12 rounded-2xl text-lg font-bold transition",
                    rating === n ? "bg-teal/30 ring-1 ring-teal" : "bg-muted/60 hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {checkOpen !== "mood" ? (
              <div className="mt-4">
                <label htmlFor="check-note" className="text-xs font-semibold text-muted-foreground">
                  {checkOpen === "worry" ? "What's on your mind? (optional)" : "Where is your attention? (optional)"}
                </label>
                <textarea
                  id="check-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="A quiet note for yourself…"
                  className="focus-ring mt-1 w-full rounded-2xl border border-border bg-background p-3 text-sm"
                />
              </div>
            ) : null}

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setCheckOpen(null)}
                className="focus-ring flex-1 rounded-full bg-muted py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveReflection}
                disabled={savingReflection}
                className="focus-ring flex-1 rounded-full bg-brand py-3 text-sm font-bold text-navy disabled:opacity-60"
              >
                {savingReflection ? "Saving…" : "Save +10 XP"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
