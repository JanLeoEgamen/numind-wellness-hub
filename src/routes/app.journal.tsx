import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { JOURNAL_ENTRIES, JOURNAL_MODES } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import { saveJournalEntry } from "@/lib/server-functions";
import { useMyJournal } from "@/lib/server-data";
import { PageHeader, SoftCard, EmptyState, ToneIcon } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

// Map the client journal mode ids to the backend journal_type enum values.
const MODE_TO_JOURNAL_TYPE: Record<string, string> = {
  "brain-dump": "brain_dump",
  gratitude: "gratitude",
  win: "todays_win",
  goal: "tomorrows_goal",
  letter: "letter_to_future_me",
  free: "free",
};

// Reverse map (backend journal_type -> friendly chip text) for the entry list.
const JOURNAL_TYPE_LABEL: Record<string, string> = {
  brain_dump: "💭 Brain Dump",
  gratitude: "🌈 Gratitude",
  todays_win: "🌟 Today's Win",
  tomorrows_goal: "🎯 Tomorrow's Goal",
  letter_to_future_me: "💌 Letter to Future Me",
  free: "📖 Free Journal",
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

export const Route = createFileRoute("/app/journal")({
  head: () => ({
    meta: [
      { title: "My Journal — NuMind" },
      {
        name: "description",
        content:
          "A calm, private place to brain dump, note wins, practise gratitude and write to future you.",
      },
      { property: "og:title", content: "My Journal — NuMind" },
      {
        property: "og:description",
        content:
          "A calm, private place to brain dump, note wins, practise gratitude and write to future you.",
      },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { completeTask } = useNuMind();
  const { data: srvJournal } = useMyJournal();
  const [mode, setMode] = useState(JOURNAL_MODES[0]!);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  // Server entries take precedence, followed by the mock warmth entries.
  const entries = [
    ...(srvJournal ?? []).map((j) => ({
      id: j.id,
      mode: JOURNAL_TYPE_LABEL[j.journal_type] ?? "📖 Free Journal",
      title: j.title ?? "Untitled",
      excerpt: j.content,
      date: formatDate(j.created_at),
      mood: j.mood_tag ?? "",
      favorite: j.favorite ?? false,
    })),
    ...JOURNAL_ENTRIES,
  ].filter(
    (e) =>
      (!favOnly || e.favorite) && (e.title + e.excerpt).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        emoji="📖"
        title="My Journal"
        subtitle="Your story starts with one small thought."
      />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {JOURNAL_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m)}
            aria-pressed={mode.id === m.id}
            className={cn(
              "focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              mode.id === m.id
                ? "bg-brand font-bold text-navy shadow-soft"
                : "bg-muted hover:bg-accent",
            )}
          >
            <span aria-hidden>{m.emoji}</span> {m.name}
          </button>
        ))}
      </div>

      <SoftCard className="bg-hero">
        <p className="text-sm text-muted-foreground">{mode.prompt}</p>
        <label htmlFor="entry" className="sr-only">
          Journal entry
        </label>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title (optional)"
            className="focus-ring w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm"
          />
        </div>
        <textarea
          id="entry"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing…"
          className="focus-ring mt-3 w-full rounded-3xl border border-border bg-background p-5 text-base leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">🔒 Private to you</span>
          <button
            disabled={!text.trim()}
            onClick={() => {
              saveJournalEntry({
                data: { ...(title.trim() ? { title: title.trim() } : {}), content: text, journalType: MODE_TO_JOURNAL_TYPE[mode.id] ?? "free" },
              }).catch(() => {
                // Offline or not authenticated — the local entry still counts.
              });
              completeTask("win", { title: "Journal entry", xp: 20 });
              setText("");
              setTitle("");
            }}
            className="focus-ring ml-auto rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy disabled:bg-muted disabled:text-muted-foreground"
          >
            Save entry +20 XP
          </button>
        </div>
      </SoftCard>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search entries"
          placeholder="Search your entries"
          className="focus-ring w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm sm:max-w-xs"
        />
        <button
          onClick={() => setFavOnly((f) => !f)}
          aria-pressed={favOnly}
          className={cn(
            "focus-ring rounded-full px-4 py-2.5 text-sm font-medium",
            favOnly ? "bg-brand font-bold text-navy" : "bg-muted",
          )}
        >
          ❤️ Favourites
        </button>
        <button className="focus-ring rounded-full bg-muted px-4 py-2.5 text-sm font-medium">
          📅 Calendar
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            emoji="📖"
            title="Nothing here yet"
            message="Your story starts with one small thought."
          />
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {entries.map((e) => (
            <li key={e.id}>
              <SoftCard interactive className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {e.mode}
                  </span>
                  <span aria-label={e.favorite ? "Favourite" : "Not a favourite"}>
                    {e.favorite ? "❤️" : "🤍"}
                  </span>
                </div>
                <p className="mt-3 font-semibold">{e.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{e.excerpt}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{e.date}</span>
                  <span>·</span>
                  <span>{e.mood}</span>
                </div>
              </SoftCard>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center gap-3 rounded-3xl bg-accent/50 p-4">
        <ToneIcon emoji="💌" tone="lavender" />
        <div>
          <p className="font-semibold">1 letter to future you is sealed</p>
          <p className="text-sm text-muted-foreground">Opens 14 November 2026.</p>
        </div>
      </div>
    </div>
  );
}
