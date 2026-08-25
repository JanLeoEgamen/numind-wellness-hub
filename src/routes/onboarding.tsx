import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Confetti, NumiAvatar, ProgressBar, DisclaimerNote } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/lib/server-functions";
import { getAuthenticatedUser, getOnboardingCompleted } from "@/lib/auth-guard";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    // Onboarding runs after email verification or first login, so it requires
    // a session. Users who already finished onboarding are sent straight to app.
    const user = await getAuthenticatedUser();
    if (!user) throw redirect({ to: "/login" });
    const completed = await getOnboardingCompleted(user.id);
    if (completed) throw redirect({ to: "/app" });
    return { user };
  },
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

const FOCUS_AREAS = [
  { icon: "Brain", label: "Focus" },
  { icon: "Sprout", label: "Everyday Stress" },
  { icon: "Moon", label: "Better Sleep" },
  { icon: "Dumbbell", label: "Healthy Habits" },
  { icon: "Smile", label: "Positive Mindset" },
  { icon: "PersonStanding", label: "Mindfulness" },
  { icon: "Target", label: "Goals" },
  { icon: "BookOpen", label: "Personal Growth" },
  { icon: "Droplets", label: "Hydration" },
  { icon: "Footprints", label: "Movement" },
  { icon: "Zap", label: "Productivity" },
];
const GOALS = ["Feel calmer most days","Sleep through the night","Move every day","Write more often","Drink more water","Finish what I start"];
const AVATARS = ["Flower2","Sun","Cat","Turtle","Waves","Clover","Bird","Moon"];
const TIMES = ["Morning","Afternoon","Evening","Custom"];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("Flower2");
  const [time, setTime] = useState("Morning");
  const total = 7;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await completeOnboarding({ data: { avatar, goals } });
      // Reflect the fresh avatar / completion flag immediately in the app.
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

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
              <span className="animate-float text-6xl" aria-hidden>
                <Icon symbol="Sprout" size={56} className="text-mint" />
              </span>
              <h1 className="mt-4 text-3xl font-extrabold">Welcome to NuMind</h1>
              <p className="mt-2 text-muted-foreground">Small steps can create meaningful change.</p>
            </div>
          )}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold">What would you like to work on?</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {FOCUS_AREAS.map((a) => (
                  <button key={a.label} onClick={() => toggle(areas, setAreas, a.label)} aria-pressed={areas.includes(a.label)} className={cn("focus-ring flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm", areas.includes(a.label) ? "border-teal bg-teal/15 font-semibold" : "border-border bg-muted/40")}>
                    <Icon symbol={a.icon} size={14} />
                    {a.label}
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
                      {goals.includes(g) ? (
                        <Icon symbol="Check" size={14} strokeWidth={2.5} className="mr-1 inline-block align-[-2px] text-teal" />
                      ) : null}
                      {g}
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
                  <button key={a} onClick={() => setAvatar(a)} aria-pressed={avatar === a} className={cn("focus-ring grid h-16 w-16 place-items-center rounded-3xl", avatar === a ? "bg-brand" : "bg-muted")}>
                    <span aria-hidden>
                      <Icon symbol={a} size={28} className={avatar === a ? "text-navy" : undefined} />
                    </span>
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
              <span className="animate-float text-6xl" aria-hidden>
                <Icon symbol="Sprout" size={56} className="text-mint" />
              </span>
              <h1 className="mt-4 text-2xl font-bold">Your first seed is planted!</h1>
              <p className="mt-2 text-sm text-muted-foreground">Welcome to your Wellness Garden, {avatar}</p>
              <p className="mt-4 rounded-full bg-sun/25 px-5 py-2 text-sm font-bold">+100 XP</p>
              <p className="mt-2 rounded-full bg-mint/40 px-5 py-2 text-sm font-semibold">
                <Icon symbol="Award" size={14} className="mr-1 inline-block align-[-2px]" /> Badge unlocked — First Step
              </p>
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
            <button
              onClick={finish}
              disabled={saving}
              className="focus-ring flex-1 rounded-full bg-brand px-5 py-3 text-center text-sm font-bold text-navy disabled:opacity-60"
            >
              {saving ? "Planting your seed…" : "Enter NuMind"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
