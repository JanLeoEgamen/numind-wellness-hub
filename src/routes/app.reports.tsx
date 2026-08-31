import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PageHeader,
  SoftCard,
  SectionTitle,
  StatTile,
  DisclaimerNote,
} from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  generateWellnessReport,
  type GenerateReportInput,
  type ReportTimeframe,
  type ReportIncludeSection,
  type WellnessReport,
} from "@/lib/server-functions";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "My Wellness Reports — NuMind" },
      {
        name: "description",
        content: "Create a private summary of the wellness information you chose to track.",
      },
      { property: "og:title", content: "My Wellness Reports — NuMind" },
      {
        property: "og:description",
        content: "A private summary of your NuMind wellness information.",
      },
    ],
  }),
  component: ReportsPage,
});

const TIMEFRAMES: { key: ReportTimeframe; label: string }[] = [
  { key: "7d", label: "Last 7 Days" },
  { key: "14d", label: "Last 14 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "6m", label: "Last 6 Months" },
  { key: "12m", label: "Last 12 Months" },
  { key: "custom", label: "Custom Date Range" },
];

const INCLUDE_OPTIONS: { key: ReportIncludeSection; label: string; emoji: string }[] = [
  { key: "reset", label: "Daily Reset", emoji: "Sun" },
  { key: "mindChecks", label: "Mind Checks", emoji: "Heart" },
  { key: "habits", label: "Wellness Habits", emoji: "Droplets" },
  { key: "journal", label: "Journal Entries", emoji: "BookOpen" },
  { key: "focus", label: "Focus Sessions", emoji: "Zap" },
  { key: "xp", label: "XP & Progress", emoji: "Star" },
  { key: "screenings", label: "Symptom Check-Ins", emoji: "HeartPulse" },
];

const DEFAULT_INCLUDE: ReportIncludeSection[] = INCLUDE_OPTIONS.map((o) => o.key);

function timeframeLabel(tf: ReportTimeframe): string {
  return TIMEFRAMES.find((t) => t.key === tf)?.label ?? "Custom";
}

const fmt = (d: string) => {
  const parsed = parse(d, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? d : format(parsed, "MMM d, yyyy");
};

function systemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function ReportsPage() {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [include, setInclude] = useState<ReportIncludeSection[]>(DEFAULT_INCLUDE);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WellnessReport | null>(null);

  const toggleInclude = (key: ReportIncludeSection, checked: boolean) => {
    setInclude((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const input: GenerateReportInput = {
        timeframe,
        timezone: systemTimezone(),
        include,
      };
      if (timeframe === "custom") {
        if (!startDate || !endDate) {
          throw new Error("Choose a start and end date for the custom range.");
        }
        input.startDate = startDate;
        input.endDate = endDate;
      }
      const data = await generateWellnessReport({ data: input });
      setReport(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate your report.");
      toast.error(e instanceof Error ? e.message : "Could not generate your report.");
    } finally {
      setGenerating(false);
    }
  };

  // ---------------- Report display ----------------
  if (report) {
    return (
      <ReportView
        report={report}
        onBack={() => setReport(null)}
        onRegenerate={generate}
        generating={generating}
      />
    );
  }

  // ---------------- Build form ----------------
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="FileText"
        title="My Wellness Reports"
        subtitle="Create a private summary of the wellness information you chose to track."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Step 1 — timeframe */}
          <SoftCard className="p-5 sm:p-6" data-step="1">
            <SectionTitle hint="Step 1">Choose a timeframe</SectionTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a window for your report, or choose a custom range.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTimeframe(t.key)}
                  aria-pressed={timeframe === t.key}
                  className={cn(
                    "focus-ring rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                    timeframe === t.key
                      ? "border-teal bg-teal/15 text-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {timeframe === "custom" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs font-semibold text-muted-foreground">Start date</span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="focus-ring mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold text-muted-foreground">End date</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="focus-ring mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ) : null}
          </SoftCard>

          {/* Step 2 — information to include */}
          <SoftCard className="p-5 sm:p-6" data-step="2">
            <SectionTitle hint="Step 2">What to include</SectionTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose the wellness information you want in this report.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {INCLUDE_OPTIONS.map((o) => {
                const checked = include.includes(o.key);
                return (
                  <li key={o.key}>
                    <label className="focus-ring flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleInclude(o.key, v === true)}
                        className="data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                      />
                      <Icon symbol={o.emoji} size={18} />
                      <span>{o.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </SoftCard>
        </div>

        {/* Summary / generate */}
        <div className="lg:sticky lg:top-6">
          <SoftCard className="p-5">
            <h3 className="font-bold">Your report</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Timeframe</dt>
                <dd className="flex items-center gap-1.5 font-semibold">
                  <Icon symbol="CalendarRange" size={14} className="text-teal" />
                  {timeframeLabel(timeframe)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Sections</dt>
                <dd className="font-semibold">
                  {include.length} of {INCLUDE_OPTIONS.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Time zone</dt>
                <dd className="font-semibold">{systemTimezone()}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={generate}
              disabled={generating || include.length === 0}
              className="focus-ring mt-4 w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate report"}
            </button>
            {error ? <p className="mt-3 text-xs font-medium text-coral">{error}</p> : null}
            <p className="mt-3 text-xs text-muted-foreground">
              Your report is private to you and computed in your time zone.
            </p>
          </SoftCard>
        </div>
      </div>
    </div>
  );
}

function MiniBar({
  data,
  color = "var(--teal)",
}: {
  data: { date: string; value: number }[];
  color?: string;
}) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-muted)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(d: string) => {
              const p = parse(d, "yyyy-MM-dd", new Date());
              return Number.isNaN(p.getTime()) ? d : format(p, "MMM d");
            }}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BreakdownList({ items }: { items: { source: string; count: number }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <ul className="mt-3 grid gap-2">
      {items.map((i) => (
        <li key={i.source} className="rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="capitalize">{i.source.replaceAll("_", " ")}</span>
            <span className="font-semibold">{i.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-teal"
              style={{ width: `${total ? (i.count / total) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
function ReportView({
  report,
  onBack,
  onRegenerate,
  generating,
}: {
  report: WellnessReport;
  onBack: () => void;
  onRegenerate: () => void;
  generating: boolean;
}) {
  const { period } = report;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          emoji="FileText"
          title="My Wellness Reports"
          subtitle={`${timeframeLabel(period.timeframe)} · ${fmt(period.startDate)} – ${fmt(period.endDate)}`}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold"
          >
            <Icon symbol="ArrowLeft" size={16} /> Back
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={generating}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy disabled:opacity-50"
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Time zone: <span className="font-semibold">{period.timezone}</span> · Generated privately
        for you.
      </div>
{report.reset ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.reset.completions} completions`}>Daily Reset</SectionTitle>
          <SoftCard>
            <StatTile emoji="Sun" label="Completions" value={report.reset.completions} tone="sun" />
            {report.reset.byDay.length ? (
              <div className="mt-4">
                <MiniBar data={report.reset.byDay} color="var(--sun)" />
              </div>
            ) : null}
          </SoftCard>
        </section>
      ) : null}

      {report.mindChecks ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.mindChecks.entries} entries`}>Mind Checks</SectionTitle>
          <SoftCard>
            <StatTile emoji="Heart" label="Check-ins logged" value={report.mindChecks.entries} tone="teal" />
            {report.mindChecks.wellbeing.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Mood · Energy · Focus · Stress tracked on{" "}
                <span className="font-semibold">{report.mindChecks.entries} day(s)</span> in this
                period.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No mind checks in this period.</p>
            )}
          </SoftCard>
        </section>
      ) : null}

      {report.habits ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.habits.logs} logs`}>Wellness Habits</SectionTitle>
          <SoftCard>
            <StatTile emoji="Droplets" label="Habit logs" value={report.habits.logs} tone="mint" />
            {report.habits.byType.length ? <BreakdownList items={report.habits.byType} /> : null}
          </SoftCard>
        </section>
      ) : null}

      {report.journal ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.journal.entries} entries`}>Journal</SectionTitle>
          <SoftCard>
            <StatTile emoji="BookOpen" label="Entries" value={report.journal.entries} tone="lavender" />
            {report.journal.byType.length ? <BreakdownList items={report.journal.byType} /> : null}
          </SoftCard>
        </section>
      ) : null}
{report.focus ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.focus.minutes} minutes`}>Focus Sessions</SectionTitle>
          <SoftCard>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile emoji="Zap" label="Sessions" value={report.focus.sessions} tone="cyan" />
              <StatTile emoji="Timer" label="Minutes" value={report.focus.minutes} tone="teal" />
            </div>
            {report.focus.byDay.length ? (
              <div className="mt-4">
                <MiniBar
                  data={report.focus.byDay.map((d) => ({ date: d.date, value: d.minutes }))}
                />
              </div>
            ) : null}
          </SoftCard>
        </section>
      ) : null}

      {report.xp ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.xp.earned} XP`}>XP & Progress</SectionTitle>
          <SoftCard>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile emoji="Star" label="XP earned" value={report.xp.earned} tone="sun" />
              <StatTile
                emoji="Activity"
                label="Source types"
                value={report.xp.bySource.length}
                tone="lavender"
              />
            </div>
            {report.xp.bySource.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground">By source</p>
                <BreakdownList
                  items={report.xp.bySource.map((s) => ({ source: s.source, count: s.count }))}
                />
              </div>
            ) : null}
          </SoftCard>
        </section>
      ) : null}
{report.screenings ? (
        <section className="mt-8">
          <SectionTitle hint={`${report.screenings.completions} total`}>
            Symptom Check-Ins
          </SectionTitle>
          <SoftCard>
            <StatTile emoji="HeartPulse" label="Completed" value={report.screenings.completions} tone="teal" />
            {report.screenings.byInstrument.length ? (
              <ul className="mt-3 grid gap-2">
                {report.screenings.byInstrument.map((s) => (
                  <li key={s.instrument} className="rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        {s.instrument === "PHQ9" ? "PHQ-9" : "GAD-7"}
                      </span>
                      <span className="text-muted-foreground">
                        {s.count} completed · avg {s.averageScore}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No symptom check-ins in this period.
              </p>
            )}
          </SoftCard>
        </section>
      ) : null}

      <div className="mt-8">
        <DisclaimerNote>
          This report is a private summary of the wellness information you chose to track in
          NuMind. It is not a medical record, diagnosis, or evaluation by a healthcare
          professional.
        </DisclaimerNote>
      </div>
    </div>
  );
}
