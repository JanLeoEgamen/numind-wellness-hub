import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Confetti, NumiAvatar, ProgressBar, DisclaimerNote } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — NuMind" },
      { name: "description", content: "A friendly seven-step welcome: your goals, your avatar, your reminders and your first seed." },
      { property: "og:title", content: "Get started — NuMind" },
      { property: "og:description", content: "A friendly seven-step welcome: your goals, your avatar, your reminders and your first seed." },
    ],
  }),
  component: Onboarding,
});

const FOCUS_AREAS = ["🧠 Focus","🌿 Everyday Stress","😴 Better Sleep","💪 Healthy Habits","😊 Positive Mindset","🧘 Mindfulness","🎯 Goals","📖 Personal Growth","💧 Hydration","🏃 Movement","⚡ Productivity"];
const GOALS = ["Feel calmer most days","Sleep through the night","Move every day","Write more often","Drink more water","Finish what I start"];
const AVATARS = ["🌷","🌻","🦊","🐢","🌊","🍀","🐦","🌙"];
const TIMES = ["Morning","Afternoon","Evening","Custom"];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("🌷");
  const [time, setTime] = useState("Morning");
  const total = 7;

  const toggle = (list: string[], set: (v: string[]) => void, v: string, max?: number) => {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else if (!max || list.length < max) set([...list, v]);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-hero p-4">
      <div className="card-soft w-full max-w-lg p-7">
        <ProgressBar value={step + 1} max={total} />
        <p className="mt-2 text-xs text-muted-foreground">Step {step + 1} of {total}</p>

        <div className="mt-6 min-h-[320px]">
          {step === 0 && (
            <div className="grid place-items-center text-center">
              <span className="animate-float text-6xl" aria-hidden>🌱</span>
              <h1 className="mt-4 text-3xl font-extrabold">Welcome to NuMind</h1>
              <p className="mt-2 text-muted-foreground">Small steps can create meaningful change.</p>
            </div>
          )}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold">What would you like to work on?</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {FOCUS_AREAS.map((a) => (
                  <button key={a} onClick={() => toggle(areas, setAreas, a)} aria-pressed={areas.includes(a)} className={cn("focus-ring rounded-full border px-4 py-2 text-sm", areas.includes(a) ? "border-teal bg-teal/15 font-semibold" : "border-border bg-muted/40")}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold">What would make you feel successful?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Pick 1–3.</p>
              <ul className="mt-4 grid gap-2">
                {GOALS.map((g) => (
                  <li key={g}>
                    <button onClick={() => toggle(goals, setGoals, g, 3)} aria-pressed={goals.includes(g)} className={cn("focus-ring w-full rounded-2xl border px-4 py-3 text-left text-sm transition", goals.includes(g) ? "border-teal bg-teal/15 font-semibold shadow-soft" : "border-border bg-muted/40")}>
                      {goals.includes(g) ? "✓ " : ""}{g}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold">Choose your avatar</h1>
              <div className="mt-4 flex flex-wrap gap-3">
                {AVATARS.map((a) => (
                  <button key={a} onClick={() => setAvatar(a)} aria-pressed={avatar === a} className={cn("focus-ring grid h-16 w-16 place-items-center rounded-3xl text-3xl", avatar === a ? "bg-brand" : "bg-muted")}>
                    <span aria-hidden>{a}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div>
              <h1 className="text-2xl font-bold">When should NuMind remind you?</h1>
              <div className="mt-4 grid gap-2">
                {TIMES.map((t) => (
                  <button key={t} onClick={() => setTime(t)} aria-pressed={time === t} className={cn("focus-ring rounded-2xl border px-4 py-3 text-left text-sm", time === t ? "border-teal bg-teal/15 font-semibold" : "border-border bg-muted/40")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="text-center">
              <NumiAvatar size={110} className="animate-float mx-auto" />
              <h1 className="mt-4 text-2xl font-bold">Hi! I'm Numi</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your AI wellness companion. I'm here to motivate you, help you build healthy habits, organize your
                goals, and celebrate your progress.
              </p>
              <div className="mt-4 text-left"><DisclaimerNote>Numi is an AI wellness companion, not a healthcare professional.</DisclaimerNote></div>
            </div>
          )}
          {step === 6 && (
            <div className="grid place-items-center text-center">
              <Confetti count={40} />
              <span className="animate-float text-6xl" aria-hidden>🌱</span>
              <h1 className="mt-4 text-2xl font-bold">Your first seed is planted!</h1>
              <p className="mt-2 text-sm text-muted-foreground">Welcome to your Wellness Garden, {avatar}</p>
              <p className="mt-4 rounded-full bg-sun/25 px-5 py-2 text-sm font-bold">+100 XP</p>
              <p className="mt-2 rounded-full bg-mint/40 px-5 py-2 text-sm font-semibold">🎖 Badge unlocked — First Step</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {step > 0 ? (
            <button onClick={() => setStep((s) => s - 1)} className="focus-ring rounded-full bg-muted px-5 py-3 text-sm font-semibold">Back</button>
          ) : null}
          {step < total - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="focus-ring flex-1 rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy">
              {step === 0 ? "Start My Journey" : "Continue"}
            </button>
          ) : (
            <Link to="/app" className="focus-ring flex-1 rounded-full bg-brand px-5 py-3 text-center text-sm font-bold text-navy">Enter NuMind</Link>
          )}
        </div>
      </div>
    </div>
  );
}
