import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { useMyAnalytics } from "@/lib/server-data";
import type {
  AnalyticsCountSlice,
  AnalyticsDatePoint,
  AnalyticsFocusPoint,
  AnalyticsSourceSlice,
  AnalyticsWellbeingPoint,
  MyAnalytics,
} from "@/lib/server-functions";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionTitle,
  SoftCard,
  StatTile,
} from "@/components/numind/ui-kit";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({
    meta: [
      { title: "My Analytics — NuMind" },
      { name: "description", content: "Your wellness in numbers — XP, focus, mood and habits over time." },
      { property: "og:title", content: "My Analytics — NuMind" },
      { property: "og:description", content: "Track your NuMind progress with detailed personal analytics." },
    ],
  }),
  component: AnalyticsPage,
});

type Period = "7d" | "30d" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

const PALETTE = ["var(--teal)", "var(--lavender)", "var(--sun)", "var(--coral)", "var(--mint)", "var(--cyan)", "var(--grape)"];

const toDateKey = (d: Date) => format(d, "yyyy-MM-dd");
const dateLabel = (d: string) => {
  if (!d) return "";
  const parsed = new Date(`${d}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? d : format(parsed, "MMM d");
};

function sliceSeries<T extends { date: string }>(series: T[], period: Period): T[] {
  if (period === "all") return series;
  const days = period === "7d" ? 7 : 30;
  const cutoff = toDateKey(subDays(new Date(), days - 1));
  return series.filter((p) => p.date >= cutoff);
}

function SummaryTiles({ s }: { s: MyAnalytics["summary"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile emoji="⭐" label="Total XP" value={s.totalXp.toLocaleString()} tone="sun" />
      <StatTile emoji="🔥" label="Current streak" value={`${s.currentStreak} days`} tone="coral" />
      <StatTile emoji="📅" label="Days active" value={s.activeDays} tone="lavender" />
      <StatTile emoji="🌞" label="Daily Resets" value={s.resetsCompleted} tone="teal" />
      <StatTile emoji="⚡" label="Focus sessions" value={s.focusSessions} tone="lavender" />
      <StatTile emoji="⏱" label="Focus minutes" value={s.focusMinutes.toLocaleString()} tone="cyan" />
      <StatTile emoji="📖" label="Journal entries" value={s.journalEntries} tone="mint" />
      <StatTile emoji="🏆" label="Quests completed" value={s.questsCompleted} tone="sun" />
      <StatTile emoji="🎖" label="Badges earned" value={s.badgesEarned} tone="coral" />
      <StatTile emoji="🌱" label="Habits logged" value={s.habitsLogged} tone="mint" />
      <StatTile emoji="🎮" label="Games played" value={s.gamePlays} tone="cyan" />
      <StatTile emoji="🏅" label="Longest streak" value={`${s.longestStreak} days`} tone="coral" />
    </div>
  );
}

function XpChart({ data }: { data: AnalyticsDatePoint[] }) {
  return (
    <ChartContainer config={{ xp: { label: "XP", color: "var(--teal)" } }} className="h-64">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(l) => dateLabel(String(l))} />}
        />
        <Area
          dataKey="value"
          name="XP"
          type="monotone"
          stroke="var(--teal)"
          strokeWidth={2}
          fill="var(--teal)"
          fillOpacity={0.15}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function WellbeingChart({ data }: { data: AnalyticsWellbeingPoint[] }) {
  return (
    <ChartContainer
      config={{
        mood: { label: "Mood", color: "var(--teal)" },
        energy: { label: "Energy", color: "var(--sun)" },
        focus: { label: "Focus", color: "var(--lavender)" },
      }}
      className="h-64"
    >
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis width={40} tickLine={false} axisLine={false} domain={[0, 10]} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(l) => dateLabel(String(l))} />}
        />
        <Line dataKey="mood" name="Mood" type="monotone" stroke="var(--teal)" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="energy" name="Energy" type="monotone" stroke="var(--sun)" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="focus" name="Focus" type="monotone" stroke="var(--lavender)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}

function FocusChart({ data }: { data: AnalyticsFocusPoint[] }) {
  return (
    <ChartContainer config={{ minutes: { label: "Minutes", color: "var(--lavender)" } }} className="h-64">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(l) => dateLabel(String(l))} />}
        />
        <Bar dataKey="minutes" name="Minutes" radius={[6, 6, 0, 0]} fill="var(--lavender)" />
      </BarChart>
    </ChartContainer>
  );
}

function SingleBarChart({ data, name, color }: { data: AnalyticsDatePoint[]; name: string; color: string }) {
  return (
    <ChartContainer config={{ value: { label: name, color } }} className="h-56">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(l) => dateLabel(String(l))} />}
        />
        <Bar dataKey="value" name={name} radius={[6, 6, 0, 0]} fill={color} />
      </BarChart>
    </ChartContainer>
  );
}

function XpSourceChart({ data }: { data: AnalyticsSourceSlice[] }) {
  return (
    <ChartContainer config={{ xp: { label: "XP", color: "var(--teal)" } }} className="h-56">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="source"
          innerRadius={52}
          outerRadius={86}
          paddingAngle={2}
          strokeWidth={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.source} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function CountBreakdown({ title, items, hint }: { title: string; items: AnalyticsCountSlice[]; hint?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="card-soft p-5 sm:p-6">
      <SectionTitle hint={hint ?? `${items.length} ${items.length === 1 ? "category" : "categories"}`}>
        {title}
      </SectionTitle>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.source}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="capitalize">{item.source.replace(/_/g, " ")}</span>
              <span className="font-semibold tabular-nums">{item.count}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-teal transition-[width] duration-500"
                style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}



function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useMyAnalytics();
  const [period, setPeriod] = useState<Period>("30d");

  const xpDaily = useMemo(() => (data ? sliceSeries(data.xpDaily, period) : []), [data, period]);
  const focusDaily = useMemo(() => (data ? sliceSeries(data.focusDaily, period) : []), [data, period]);
  const wellbeing = useMemo(() => (data ? sliceSeries(data.wellbeing, period) : []), [data, period]);
  const journalDaily = useMemo(() => (data ? sliceSeries(data.journalDaily, period) : []), [data, period]);
  const habitDaily = useMemo(() => (data ? sliceSeries(data.habitDaily, period) : []), [data, period]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader emoji="📊" title="My Analytics" subtitle="Loading your numbers…" />
        <LoadingState rows={5} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader emoji="📊" title="My Analytics" />
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const hasData = data.summary.activeDays > 0 || data.summary.totalXp > 0;

  if (!hasData) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader emoji="📊" title="My Analytics" subtitle="Your wellness in numbers." />
        <EmptyState
          emoji="📊"
          title="Nothing to chart yet"
          message="Once you complete a Daily Reset, journal, focus, or earn some XP, your analytics will start painting a picture here."
        />
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        emoji="📊"
        title="My Analytics"
        subtitle="Your wellness in numbers — XP, focus, mood and habits over time."
        action={
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  period === p.key
                    ? "bg-brand text-navy shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <SummaryTiles s={s} />

      <section className="mt-8">
        <SectionTitle hint={`${s.activeDays} active days`}>XP over time</SectionTitle>
        <SoftCard>
          {xpDaily.length ? <XpChart data={xpDaily} /> : <p className="text-sm text-muted-foreground">No XP in this period.</p>}
        </SoftCard>
      </section>

      <section className="mt-8">
        <SectionTitle hint="Mood · Energy · Focus (0–10)">Wellbeing trend</SectionTitle>
        <SoftCard>
          {wellbeing.length ? <WellbeingChart data={wellbeing} /> : <p className="text-sm text-muted-foreground">No check-ins in this period.</p>}
        </SoftCard>
      </section>

      <section className="mt-8">
        <SectionTitle hint={`${s.focusMinutes.toLocaleString()} min total`}>Focus minutes per day</SectionTitle>
        <SoftCard>
          {focusDaily.length ? <FocusChart data={focusDaily} /> : <p className="text-sm text-muted-foreground">No focus sessions completed yet.</p>}
        </SoftCard>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle hint={`${s.journalEntries} total`}>Journal entries by day</SectionTitle>
          <SoftCard>
            {journalDaily.length ? <SingleBarChart data={journalDaily} name="Entries" color="var(--mint)" /> : <p className="text-sm text-muted-foreground">No journal entries yet.</p>}
          </SoftCard>
        </section>
        <section>
          <SectionTitle hint={`${s.habitsLogged} total`}>Habits logged by day</SectionTitle>
          <SoftCard>
            {habitDaily.length ? <SingleBarChart data={habitDaily} name="Logs" color="var(--sun)" /> : <p className="text-sm text-muted-foreground">No habit logs yet.</p>}
          </SoftCard>
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle hint="How you earn">XP by source</SectionTitle>
          <SoftCard>
            {data.xpBySource.length ? <XpSourceChart data={data.xpBySource} /> : <p className="text-sm text-muted-foreground">No XP yet.</p>}
          </SoftCard>
        </section>
        <section>
          <CountBreakdown
            title="Journal by type"
            items={data.journalTypeBreakdown}
            hint={`${s.journalEntries} total`}
          />
        </section>
      </div>

      {data.games.length > 0 ? (
        <section className="mt-8 lg:max-w-md">
          <CountBreakdown title="Healthy Play" items={data.games} hint={`${s.gamePlays} total plays`} />
        </section>
      ) : null}
    </div>
  );
}

