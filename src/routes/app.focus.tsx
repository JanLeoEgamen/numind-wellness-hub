import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNuMind } from "@/lib/numind-store";
import { PageHeader, SoftCard, ProgressRing, SectionTitle, EmptyState } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/focus")({
  head: () => ({
    meta: [
      { title: "Focus Zone — NuMind" },
      { name: "description", content: "A focus timer, task breakdowns, today's top three and a brain dump — all in one calm space." },
      { property: "og:title", content: "Focus Zone — NuMind" },
      { property: "og:description", content: "Deep work made gentle: timer, top three and brain dump." },
    ],
  }),
  component: FocusPage,
});

const PRESETS = [5, 10, 15, 25, 45];

function FocusPage() {
  const { completeTask } = useNuMind();
  const [minutes, setMinutes] = useState(15);
  const [left, setLeft] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [top3, setTop3] = useState<string[]>(["Finish the report draft", "", ""]);
  const [dump, setDump] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [breakdownInput, setBreakdownInput] = useState("Clean my apartment");
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(t);
          setRunning(false);
          completeTask("focus", { title: "Focus Sprint", xp: 20 });
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, completeTask]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="⚡" title="Focus Zone" subtitle="One thing at a time. That's the whole trick." />

      <div className="grid gap-6 lg:grid-cols-2">
        <SoftCard className="bg-hero text-center">
          <SectionTitle>Focus Timer</SectionTitle>
          <div className="grid place-items-center py-2">
            <ProgressRing value={minutes * 60 - left} max={minutes * 60} size={220} stroke={16}>
              <div>
                <p className="font-display text-4xl font-bold tabular-nums">
                  {mm}:{ss}
                </p>
                <p className="text-xs text-muted-foreground">{running ? "In focus…" : "Ready when you are"}</p>
              </div>
            </ProgressRing>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setMinutes(p);
                  setLeft(p * 60);
                  setRunning(false);
                }}
                aria-pressed={minutes === p}
                className={cn(
                  "focus-ring rounded-full px-4 py-2 text-sm font-medium",
                  minutes === p ? "bg-brand font-bold text-navy" : "bg-muted hover:bg-accent",
                )}
              >
                {p} min
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="focus-ring rounded-full bg-brand px-6 py-3 text-sm font-bold text-navy"
            >
              {running ? "Pause" : "Start focus"}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setLeft(minutes * 60);
              }}
              className="focus-ring rounded-full bg-muted px-6 py-3 text-sm font-semibold"
            >
              Reset
            </button>
          </div>
        </SoftCard>

        <div className="grid gap-6">
          <SoftCard>
            <SectionTitle hint="Numi-style">Break It Down</SectionTitle>
            <div className="flex gap-2">
              <label htmlFor="breakdown" className="sr-only">
                What feels too big?
              </label>
              <input
                id="breakdown"
                value={breakdownInput}
                onChange={(e) => setBreakdownInput(e.target.value)}
                className="focus-ring flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm"
              />
              <button
                onClick={() =>
                  setSteps([
                    "Pick up visible clutter",
                    "Put clothes away",
                    "Clear surfaces",
                    "Take out trash",
                  ])
                }
                className="focus-ring rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-navy"
              >
                Break it down
              </button>
            </div>
            {steps.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Tell Numi what feels too big and it becomes four small things.
              </p>
            ) : (
              <ol className="mt-4 grid gap-2">
                {steps.map((s, i) => (
                  <li key={s} className="animate-rise flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-navy">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            )}
          </SoftCard>

          <SoftCard>
            <SectionTitle>Today's Top 3</SectionTitle>
            <div className="grid gap-2">
              {top3.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lavender/40 text-xs font-bold">
                    {i + 1}
                  </span>
                  <label htmlFor={`top-${i}`} className="sr-only">
                    Priority {i + 1}
                  </label>
                  <input
                    id={`top-${i}`}
                    value={t}
                    placeholder="What matters today?"
                    onChange={(e) => setTop3((s) => s.map((v, j) => (j === i ? e.target.value : v)))}
                    className="focus-ring flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </SoftCard>
        </div>
      </div>

      <SoftCard className="mt-6">
        <SectionTitle>Brain Dump</SectionTitle>
        <label htmlFor="dump" className="sr-only">
          Brain dump
        </label>
        <textarea
          id="dump"
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          rows={6}
          placeholder="Everything rattling around in your head. No order needed."
          className="focus-ring w-full rounded-3xl border border-border bg-background p-4 text-sm"
        />
        <button
          onClick={() => setTasks(dump.split("\n").map((l) => l.trim()).filter(Boolean))}
          className="focus-ring mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy"
        >
          Turn Into Tasks
        </button>
        {tasks.length > 0 ? (
          <ul className="mt-4 grid gap-2">
            {tasks.map((t, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                <input type="checkbox" className="focus-ring h-4 w-4 accent-[var(--color-teal)]" />
                {t}
              </li>
            ))}
          </ul>
        ) : dump.trim() === "" ? (
          <div className="mt-4">
            <EmptyState emoji="🧺" title="Nothing dumped yet" message="Write it down and it stops taking up space." />
          </div>
        ) : null}
      </SoftCard>
    </div>
  );
}
