import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNuMind } from "@/lib/numind-store";
import {
  claimFocusCycleBonus,
  recordFocusSession,
  saveFocusPlan,
  toggleFocusTask,
} from "@/lib/server-functions";
import type { FocusTask } from "@/lib/server-functions";
import { useMyFocusHistory, useMyFocusPlan } from "@/lib/server-data";
import { breakdownTask } from "@/lib/task-breakdown";
import { focusSoundPlayer, SOUND_LABELS } from "@/lib/focus-sounds";
import type { FocusSound } from "@/lib/focus-sounds";
import { PageHeader, SoftCard, ProgressRing, SectionTitle, EmptyState } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/focus")({
  head: () => ({
    meta: [
      { title: "Focus Zone — NuMind" },
      {
        name: "description",
        content:
          "A focus timer, Pomodoro cycles, task breakdowns, today's top three and a brain dump — all in one calm space.",
      },
      { property: "og:title", content: "Focus Zone — NuMind" },
      { property: "og:description", content: "Deep work made gentle: timer, top three and brain dump." },
    ],
  }),
  component: FocusPage,
});

const PRESETS = [5, 10, 15, 25, 45];
const WORK_OPTIONS = [15, 25, 45, 60];
const BREAK_OPTIONS = [3, 5, 10, 15];
const CYCLE_OPTIONS = [2, 4, 6];
const SOUND_OPTIONS: FocusSound[] = ["off", "rain", "waves", "white", "brown"];

function FocusPage() {
  const queryClient = useQueryClient();
  const { awardXp, celebrate } = useNuMind();

  // --- Daily plan (Top 3 / brain dump / task checklist) -------------------
  const { data: plan } = useMyFocusPlan();
  const [top3, setTop3] = useState<string[]>(["", "", ""]);
  const [brainDump, setBrainDump] = useState("");
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const planLoadedRef = useRef(false);
  const planId = plan?.id ?? null;

  // --- History / stats -----------------------------------------------------
  const { data: history } = useMyFocusHistory();
  const todayMinutes = history?.todayMinutes ?? 0;
  const weekMinutes = history?.weekMinutes ?? 0;
  const focusStreak = history?.focusStreak ?? 0;
  const sessionsToday = history?.sessionsToday ?? 0;

  // --- Timer ---------------------------------------------------------------
  const [mode, setMode] = useState<"sprint" | "pomodoro">("sprint");
  const [minutes, setMinutes] = useState(15);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [cycles, setCycles] = useState(4);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [workBlock, setWorkBlock] = useState(1);
  const [left, setLeft] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [sound, setSound] = useState<FocusSound>("off");
  const [selectedTask, setSelectedTask] = useState("");
  const [breakdownInput, setBreakdownInput] = useState("Clean my apartment");
  const [steps, setSteps] = useState<string[]>([]);
  // Guards the finish effect so a completed phase is recorded exactly once.
  const finishedRef = useRef(false);
  // Refs mirror distractions/task so the completion effect always sees fresh
  // values without being re-created on every change.
  const distractionsRef = useRef(0);
  const taskRef = useRef("");

  useEffect(() => {
    distractionsRef.current = distractions;
  }, [distractions]);
  useEffect(() => {
    taskRef.current = selectedTask;
  }, [selectedTask]);

  const totalSeconds =
    mode === "sprint" ? minutes * 60 : (phase === "work" ? workMinutes : breakMinutes) * 60;

  // Load the persisted plan into local state once (then local state is king).
  useEffect(() => {
    if (plan && !planLoadedRef.current) {
      planLoadedRef.current = true;
      setTop3(plan.top3 && plan.top3.length === 3 ? plan.top3 : ["", "", ""]);
      setBrainDump(plan.brainDump ?? "");
      setTasks(plan.tasks);
    }
  }, [plan]);

  // Debounced autosave for the Top 3 and brain dump.
  useEffect(() => {
    if (!planLoadedRef.current) return;
    const t = window.setTimeout(() => {
      saveFocusPlan({ data: { top3, brainDump } }).catch(() => {
        // Offline or not authenticated — local state still stands.
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [top3, brainDump]);

  // Tick the countdown once per second while running.
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(t);
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  // When a phase hits zero, finish it exactly once.
  useEffect(() => {
    if (running || left !== 0 || finishedRef.current) return;
    finishedRef.current = true;
    focusSoundPlayer.stop();

    const record = (duration: number, label: string) => {
      (async () => {
        let xp = 20;
        try {
          const res = await recordFocusSession({
            data: {
              task: taskRef.current.trim() ? taskRef.current.trim() : null,
              durationMinutes: duration,
              notes: null,
              distractions: distractionsRef.current,
            },
          });
          if (res) {
            xp = res.xp ?? 20;
            if (res.streakBonus > 0) awardXp(res.streakBonus, `${res.streakBonus}-day focus streak!`);
          }
        } catch {
          // Offline or not authenticated — the local reward still stands.
        }
        awardXp(xp, label);
        setDistractions(0);
        queryClient.invalidateQueries({ queryKey: ["myFocusHistory"] });
      })();
    };

    if (mode === "sprint") {
      record(minutes, "Focus Sprint");
      focusSoundPlayer.chime();
      setLeft(minutes * 60);
    } else if (phase === "work") {
      record(workMinutes, "Focus Sprint");
      focusSoundPlayer.chime();
      if (workBlock >= cycles) {
        // Full Pomodoro cycle complete.
        void claimFocusCycleBonus().then((res) => {
          if (res && res.xpAwarded > 0) awardXp(res.xpAwarded, "Focus cycle complete 🍅");
        });
        celebrate({
          emoji: "🍅",
          title: "Focus cycle complete!",
          message: "All sprints done — that's a full round of deep work.",
          xp: 10,
          chain: ["+10 XP cycle bonus", "Focus history updated", "Garden growth updated"],
        });
        setWorkBlock(1);
        setPhase("work");
        setLeft(workMinutes * 60);
      } else {
        setPhase("break");
        setLeft(breakMinutes * 60);
        setRunning(true);
      }
    } else {
      // Break finished → next work block.
      focusSoundPlayer.chime();
      setPhase("work");
      setWorkBlock((b) => b + 1);
      setLeft(workMinutes * 60);
      setRunning(true);
    }
  }, [
    running,
    left,
    mode,
    phase,
    workBlock,
    cycles,
    workMinutes,
    breakMinutes,
    minutes,
    celebrate,
    awardXp,
    queryClient,
  ]);

  const startTimer = () => {
    if (running) {
      setRunning(false);
      focusSoundPlayer.stop();
      return;
    }
    finishedRef.current = false;
    if (sound !== "off") focusSoundPlayer.play(sound);
    setRunning(true);
  };

  const resetTimer = () => {
    finishedRef.current = false;
    setRunning(false);
    focusSoundPlayer.stop();
    setWorkBlock(1);
    setPhase("work");
    setLeft(mode === "sprint" ? minutes * 60 : workMinutes * 60);
  };

  const setTimerMode = (m: "sprint" | "pomodoro") => {
    finishedRef.current = false;
    setRunning(false);
    focusSoundPlayer.stop();
    setMode(m);
    setWorkBlock(1);
    setPhase("work");
    setLeft(m === "sprint" ? minutes * 60 : workMinutes * 60);
  };

  const pickSound = (s: FocusSound) => {
    setSound(s);
    if (s === "off") {
      focusSoundPlayer.stop();
      return;
    }
    focusSoundPlayer.play(s);
  };

  // --- Plan actions --------------------------------------------------------

  const updateTop3 = (i: number, value: string) => {
    setTop3((prev) => prev.map((v, j) => (j === i ? value : v)));
  };

  const toggleTask = (task: FocusTask) => {
    const next = tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t));
    setTasks(next);
    const target = next.find((t) => t.id === task.id);
    if (!target) return;
    (async () => {
      try {
        const res = await toggleFocusTask({
          data: { planId, taskId: task.id, done: target.done, tasks: next },
        });
        if (res && res.xpAwarded > 0) awardXp(res.xpAwarded, "Focus task complete");
      } catch {
        setTasks(tasks); // revert on failure
      }
    })();
  };

  const removeTask = (task: FocusTask) => {
    const next = tasks.filter((t) => t.id !== task.id);
    setTasks(next);
    saveFocusPlan({ data: { tasks: next } }).catch(() => {});
  };

  const dumpToTasks = () => {
    const lines = brainDump
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const fresh: FocusTask[] = lines.map((title) => ({ id: crypto.randomUUID(), title, done: false }));
    const next = [...tasks, ...fresh];
    setTasks(next);
    setBrainDump("");
    saveFocusPlan({ data: { tasks: next, brainDump: null } }).catch(() => {});
  };

  const saveBreakdownAsTasks = () => {
    const fresh: FocusTask[] = steps
      .filter((s) => s.trim())
      .map((title) => ({ id: crypto.randomUUID(), title, done: false }));
    if (fresh.length === 0) return;
    const next = [...tasks, ...fresh];
    setTasks(next);
    saveFocusPlan({ data: { tasks: next } }).catch(() => {});
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader emoji="⚡" title="Focus Zone" subtitle="One thing at a time. That's the whole trick." />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard emoji="⏱" label="Focus today" value={`${todayMinutes} min`} />
        <StatCard emoji="📅" label="This week" value={`${weekMinutes} min`} />
        <StatCard
          emoji="🔥"
          label="Focus streak"
          value={focusStreak > 0 ? `${focusStreak} day${focusStreak === 1 ? "" : "s"}` : "Start today"}
        />
        <StatCard emoji="🎯" label="Sessions today" value={String(sessionsToday)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Focus Timer */}
        <SoftCard className="bg-hero">
          <SectionTitle>Focus Timer</SectionTitle>

          <div className="mb-3 flex gap-1 rounded-full bg-muted p-1">
            {(["sprint", "pomodoro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTimerMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "focus-ring flex-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                  mode === m ? "bg-brand text-navy" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {m === "sprint" ? "⚡ Sprint" : "🍅 Pomodoro"}
              </button>
            ))}
          </div>

          {mode === "sprint" ? (
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    finishedRef.current = false;
                    setRunning(false);
                    setMinutes(p);
                    setLeft(p * 60);
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
          ) : (
            <div className="mb-3 grid gap-2 text-sm sm:grid-cols-3">
              <Stepper label="Work" value={workMinutes} options={WORK_OPTIONS} onChange={setWorkMinutes} suffix="m" />
              <Stepper label="Break" value={breakMinutes} options={BREAK_OPTIONS} onChange={setBreakMinutes} suffix="m" />
              <Stepper label="Cycles" value={cycles} options={CYCLE_OPTIONS} onChange={setCycles} suffix="×" />
            </div>
          )}

          <div className="grid place-items-center py-2">
            <ProgressRing value={totalSeconds - left} max={totalSeconds} size={220} stroke={16}>
              <div>
                <p className="font-display text-4xl font-bold tabular-nums">
                  {mm}:{ss}
                </p>
                <p className="text-xs text-muted-foreground">
                  {running
                    ? mode === "pomodoro" && phase === "break"
                      ? "Break time ☕"
                      : "In focus…"
                    : mode === "pomodoro"
                      ? phase === "break"
                        ? "Break ready"
                        : `Sprint ${workBlock} of ${cycles}`
                      : "Ready when you are"}
                </p>
              </div>
            </ProgressRing>
          </div>
          <label htmlFor="focus-task" className="sr-only">
            Working on
          </label>
          <select
            id="focus-task"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="focus-ring w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm"
          >
            <option value="">Working on…</option>
            {top3.map((t, i) =>
              t.trim() ? (
                <option key={i} value={t}>
                  {t}
                </option>
              ) : null,
            )}
          </select>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={startTimer}
              className="focus-ring rounded-full bg-brand px-6 py-3 text-sm font-bold text-navy"
            >
              {running ? "Pause" : "Start focus"}
            </button>
            <button
              onClick={resetTimer}
              className="focus-ring rounded-full bg-muted px-6 py-3 text-sm font-semibold"
            >
              Reset
            </button>
            <button
              onClick={() => setDistractions((d) => d + 1)}
              disabled={!running}
              title="Log a distraction"
              className="focus-ring rounded-full bg-coral/20 px-4 py-3 text-sm font-semibold disabled:opacity-40"
            >
              🙈 Distracted
            </button>
          </div>

          {distractions > 0 ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              You logged {distractions} distraction{distractions === 1 ? "" : "s"} this session —
              noticing is half the battle.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SOUND_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => pickSound(s)}
                aria-pressed={sound === s}
                className={cn(
                  "focus-ring rounded-full border px-3.5 py-1.5 text-xs font-medium",
                  sound === s
                    ? "border-brand bg-brand/10 text-foreground"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                {s === "off" ? "🔇 Off" : SOUND_LABELS[s]}
              </button>
            ))}
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
                onClick={() => setSteps(breakdownTask(breakdownInput))}
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
              <>
                <ol className="mt-4 grid gap-2">
                  {steps.map((s, i) => (
                    <li
                      key={`${i}-${s}`}
                      className="animate-rise flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-navy">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
                <button
                  onClick={saveBreakdownAsTasks}
                  className="focus-ring mt-3 rounded-full bg-muted px-4 py-2 text-xs font-semibold hover:bg-accent"
                >
                  Save as tasks ✓
                </button>
              </>
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
                    onChange={(e) => updateTop3(i, e.target.value)}
                    className="focus-ring flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
                  />
                  <button
                    onClick={() => setSelectedTask(t)}
                    disabled={!t.trim()}
                    title="Focus on this"
                    className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm disabled:opacity-40"
                  >
                    ⚡
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Saved automatically. Tap ⚡ to start a sprint on that task.
            </p>
          </SoftCard>
        </div>
      </div>

      {/* Brain Dump + Tasks */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SoftCard>
          <SectionTitle>Brain Dump</SectionTitle>
          <label htmlFor="dump" className="sr-only">
            Brain dump
          </label>
          <textarea
            id="dump"
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            rows={6}
            placeholder="Everything rattling around in your head. No order needed."
            className="focus-ring w-full rounded-3xl border border-border bg-background p-4 text-sm"
          />
          <button
            onClick={dumpToTasks}
            disabled={!brainDump.trim()}
            className="focus-ring mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy disabled:opacity-40"
          >
            Turn Into Tasks
          </button>
        </SoftCard>

        <SoftCard>
          <SectionTitle {...(openTasks > 0 ? { hint: `${openTasks} left` } : {})}>My Tasks</SectionTitle>
          {tasks.length === 0 ? (
            <EmptyState
              emoji="🧺"
              title="Nothing dumped yet"
              message="Write it down and it stops taking up space — then turn it into tasks."
            />
          ) : (
            <ul className="grid gap-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task)}
                    className="focus-ring h-4 w-4 shrink-0 accent-[var(--color-teal)]"
                  />
                  <span className={cn("flex-1", task.done && "text-muted-foreground line-through")}>
                    {task.title}
                  </span>
                  <button
                    onClick={() => removeTask(task)}
                    aria-label={`Delete ${task.title}`}
                    className="focus-ring rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SoftCard>
      </div>

      {/* History */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SoftCard>
          <SectionTitle>Last 7 Days</SectionTitle>
          <MiniWeekChart data={history?.last7Days ?? []} />
        </SoftCard>

        <SoftCard>
          <SectionTitle
            {...(history && history.sessions.length > 0 ? { hint: `${history.sessions.length} recent` } : {})}
          >
            Recent Sessions
          </SectionTitle>
          {!history || history.sessions.length === 0 ? (
            <EmptyState emoji="⏳" title="No sessions yet" message="Complete a sprint and it'll show up here." />
          ) : (
            <ul className="grid gap-2">
              {history.sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/15 text-xs font-bold">
                    {s.durationMinutes}m
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.task || "Untitled focus"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.completedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {s.distractions > 0 ? ` · ${s.distractions} distractions` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SoftCard>
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="card-soft flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-lg" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-bold">{value}</p>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  options,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (n: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cn(
              "focus-ring flex-1 rounded-full px-2 py-1.5 text-xs font-semibold",
              value === o ? "bg-brand text-navy" : "bg-muted hover:bg-accent",
            )}
          >
            {o}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniWeekChart({ data }: { data: { date: string; minutes: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  return (
    <div
      className="flex items-end justify-between gap-2 pt-2"
      role="img"
      aria-label="Focus minutes over the last 7 days"
    >
      {data.map((d) => {
        const label = new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
        const pct = Math.max(4, Math.round((d.minutes / max) * 100));
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground">
              {d.minutes > 0 ? `${d.minutes}m` : ""}
            </span>
            <div
              className="w-full rounded-t-lg bg-teal/40"
              style={{ height: `${pct}px` }}
              title={`${label}: ${d.minutes} minutes`}
            />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
