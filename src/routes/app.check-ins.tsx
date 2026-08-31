import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useNuMind } from "@/lib/numind-store";
import {
  PageHeader,
  SoftCard,
  DisclaimerNote,
  XPBadge,
  ToneIcon,
  SectionTitle,
  EmptyState,
} from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";
import {
  SCREENING_INSTRUMENTS,
  getScreeningInstrument,
  scoreResponses,
  isPhq9SafetyFlagged,
  finishedSentence,
  type ScreeningInstrumentId,
} from "@/lib/screening-instruments";
import { saveScreeningCompletion } from "@/lib/server-functions";
import { useMyScreeningCompletions } from "@/lib/server-data";
import { SafetySupportPanel } from "@/components/numind/safety-support";

export const Route = createFileRoute("/app/check-ins")({
  head: () => ({
    meta: [
      { title: "Symptom Check-Ins — NuMind" },
      {
        name: "description",
        content: "PHQ-9 and GAD-7 screening questionnaires. Not a diagnosis.",
      },
      { property: "og:title", content: "Symptom Check-Ins — NuMind" },
      {
        property: "og:description",
        content: "Private screening questionnaires about how you've been feeling.",
      },
    ],
  }),
  component: CheckInsPage,
});

const SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

function CheckInCard({ id }: { id: ScreeningInstrumentId }) {
  const inst = getScreeningInstrument(id);
  return (
    <SoftCard interactive className="h-full">
      <div className="flex items-start justify-between gap-3">
        <ToneIcon emoji={inst.emoji} tone={inst.tone} />
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {inst.secondaryLabel}
        </span>
      </div>
      <p className="mt-3 font-bold">{inst.consumerLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">{inst.description}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {inst.items.length} questions · about 2 minutes
      </p>
    </SoftCard>
  );
}
function CheckInsPage() {
  const { awardXp } = useNuMind();
  const queryClient = useQueryClient();
  const { data: history } = useMyScreeningCompletions();

  const [instrument, setInstrument] = useState<ScreeningInstrumentId | null>(null);
  const [step, setStep] = useState(-1); // -1 = intro, 0..n-1 = question, n = results
  const [responses, setResponses] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [result, setResult] = useState<{ score: number; rangeLabel: string } | null>(null);

  const inst = instrument ? getScreeningInstrument(instrument) : null;
  const total = inst?.items.length ?? 0;
  const atQuestion = inst !== null && step >= 0 && step < total;
  const questionIndex = atQuestion ? step : -1;

  const start = (id: ScreeningInstrumentId) => {
    setInstrument(id);
    setResponses([]);
    setStep(-1);
    setShowSafety(false);
    setResult(null);
  };

  const backToHub = () => {
    setInstrument(null);
    setStep(-1);
    setResponses([]);
    setResult(null);
    setShowSafety(false);
  };

  const complete = async (
    finalResponses: number[],
    scored: { score: number; rangeLabel: string },
    flagged: boolean,
  ) => {
    if (!instrument || !inst) return;
    setSaving(true);
    try {
      await saveScreeningCompletion({
        data: {
          instrument,
          score: scored.score,
          rangeLabel: scored.rangeLabel,
          responses: finalResponses,
          safetyFlag: flagged,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["myScreeningCompletions"] });
      // Safety-flagged completions never award XP / show celebrations.
      if (!flagged) {
        awardXp(10, `${inst.secondaryLabel} Check-In`);
        queryClient.invalidateQueries({ queryKey: ["myStats"] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your check-in.");
    } finally {
      setSaving(false);
    }
  };

  const select = (value: number) => {
    if (!instrument || !inst || step < 0) return;
    const next = [...responses];
    next[step] = value;
    setResponses(next);
    if (step === total - 1) {
      // Final item answered — resolve + persist (safety path shows panel first).
      const scored = scoreResponses(instrument, next);
      const flagged = isPhq9SafetyFlagged(instrument, next);
      setResult(scored);
      setShowSafety(flagged);
      setStep(total);
      void complete(next, scored, flagged);
    } else {
      setStep(step + 1);
    }
  };

  // ---------------- Hub ----------------
  if (!inst) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          emoji="ClipboardCheck"
          title="Symptom Check-Ins"
          subtitle="Check in with yourself. These questionnaires are screening tools, not a diagnosis."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {SCREENING_INSTRUMENTS.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => start(i.id)}
              className="focus-ring text-left"
              aria-label={`Start ${i.consumerLabel}`}
            >
              <CheckInCard id={i.id} />
            </button>
          ))}
        </div>

        <div className="mt-6">
          <DisclaimerNote>
            These screening questionnaires do not provide a diagnosis and do not replace
            evaluation by a qualified healthcare professional. Take your time — there are no wrong
            answers.
          </DisclaimerNote>
        </div>

        <section className="mt-8">
          <SectionTitle hint={`${history?.length ?? 0} completed`}>Your history</SectionTitle>
          {history && history.length > 0 ? (
            <ul className="grid gap-2">
              {history.slice(0, 5).map((c) => {
                const name =
                  c.instrument === "PHQ9"
                    ? "Depression Check-In"
                    : "Anxiety Check-In";
                return (
                  <li key={c.id} className="card-soft flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ToneIcon emoji={c.instrument === "PHQ9" ? "HeartPulse" : "Waves"} tone={c.instrument === "PHQ9" ? "lavender" : "teal"} size="sm" />
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.completedAt).toLocaleDateString()} · Score {c.score}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize">
                      {c.rangeLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState emoji="ClipboardCheck" title="No check-ins yet" message="Complete one of the questionnaires above to see your history here." />
          )}
        </section>
      </div>
    );
  }

  // ---------------- Results (or Safety panel first when flagged) ----------------
  if (result && step >= total) {
    const flagged = showSafety;
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          emoji={inst.emoji}
          title={inst.consumerLabel}
          subtitle={inst.secondaryLabel}
        />

        {flagged ? (
          <SafetySupportPanel
            sourceLabel={`your ${inst.secondaryLabel} responses`}
            onContinue={() => setShowSafety(false)}
            onGoToSafety={() => setShowSafety(false)}
          />
        ) : (
          <>
            <SoftCard className="animate-pop p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your score
                  </p>
                  <p className="mt-1 text-4xl font-bold">
                    {result.score}
                    <span className="text-lg font-semibold text-muted-foreground">
                      {" "}/ {inst.scoreMax}
                    </span>
                  </p>
                </div>
                <span className="rounded-full bg-teal/15 px-4 py-1.5 text-sm font-bold capitalize text-teal">
                  {result.rangeLabel}
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-muted/60 px-4 py-3 text-sm leading-relaxed">
                {finishedSentence(inst.id, result.rangeLabel)}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">{inst.resultDisclaimer}</div>

              {!flagged ? (
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <XPBadge xp={10} />
                  <p className="text-xs text-muted-foreground">Logged to your history.</p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={backToHub}
                  className="focus-ring inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold"
                >
                  <Icon symbol="ArrowLeft" size={16} /> Done
                </button>
                <button
                  type="button"
                  onClick={() => start(inst.id)}
                  className="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy"
                >
                  Retake
                </button>
              </div>
            </SoftCard>

            <div className="mt-4">
              <DisclaimerNote>
                This screening questionnaire does not provide a diagnosis and does not replace
                evaluation by a qualified healthcare professional. If you're worried about how
                you're feeling, consider sharing this result with someone you trust or a
                professional.
              </DisclaimerNote>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------------- Intro ----------------
  if (step === -1) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader emoji={inst.emoji} title={inst.consumerLabel} subtitle={inst.secondaryLabel} />

        <SoftCard className="p-6 sm:p-8">
          <h2 className="font-bold">{inst.heading}</h2>

          {inst.preamble ? (
            <p className="mt-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              {inst.preamble}
            </p>
          ) : null}

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Choices
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {SCALE_OPTIONS.map((o) => (
                <li key={o.value} className="rounded-2xl bg-muted/50 px-3 py-2 text-sm">
                  {o.value} — {o.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={backToHub}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold"
            >
              <Icon symbol="ArrowLeft" size={16} /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="focus-ring flex-1 rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy"
            >
              Begin ({inst.items.length} questions)
            </button>
          </div>
        </SoftCard>
      </div>
    );
  }

  // ---------------- Question ----------------
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader emoji={inst.emoji} title={inst.consumerLabel} subtitle={inst.secondaryLabel} />

      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon symbol="Circle" size={13} /> Question {questionIndex + 1} of {total}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-teal transition-[width] duration-300"
          style={{ width: `${((questionIndex + 1) / total) * 100}%` }}
        />
      </div>

      <SoftCard className="mt-4 p-6 sm:p-8">
        <p className="text-lg font-semibold leading-relaxed">{inst.items[questionIndex]}</p>

        <div className="mt-6 grid gap-2" role="radiogroup" aria-label={`Question ${questionIndex + 1}`}>
          {SCALE_OPTIONS.map((o) => {
            const selected = responses[questionIndex] === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => select(o.value)}
                className={cn(
                  "focus-ring flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                  selected
                    ? "border-teal bg-teal/15 text-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                      selected ? "bg-teal text-navy" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {o.value}
                  </span>
                  {o.label}
                </span>
                {selected ? <Icon symbol="Check" size={16} className="text-teal" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => (questionIndex === 0 ? setStep(-1) : setStep(questionIndex - 1))}
            disabled={saving}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Icon symbol="ArrowLeft" size={16} /> Back
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {responses[questionIndex] === undefined
            ? "Choose an option to continue."
            : "Tap a different option to change your answer."}
        </p>
      </SoftCard>
    </div>
  );
}

