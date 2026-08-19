import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { JOURNAL_ENTRIES, JOURNAL_MODES } from "@/lib/mock-data";
import { useNuMind } from "@/lib/numind-store";
import {
  deleteJournalEntry,
  saveJournalEntry,
  toggleJournalFavorite,
} from "@/lib/server-functions";
import { isUuid, useMyJournal } from "@/lib/server-data";
import { EmptyState, PageHeader, SoftCard, ToneIcon } from "@/components/numind/ui-kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// Backend journal_type -> composer mode id (used when editing an entry).
const TYPE_TO_MODE: Record<string, string> = {
  brain_dump: "brain-dump",
  gratitude: "gratitude",
  todays_win: "win",
  tomorrows_goal: "goal",
  letter_to_future_me: "letter",
  free: "free",
};

// Mock fallback labels -> backend journal_type (so the warm demo entries
// participate in the same letter/type logic as real ones).
const MOCK_LABEL_TO_TYPE: Record<string, string> = {
  "🌟 Today's Win": "todays_win",
  "🌈 Gratitude": "gratitude",
  "💭 Brain Dump": "brain_dump",
  "💌 Letter to Future Me": "letter_to_future_me",
  "🎯 Tomorrow's Goal": "tomorrows_goal",
  "📖 Free Journal": "free",
};

const MOODS = ["😁 Amazing", "🙂 Good", "😐 Okay", "😔 Low", "🥀 Rough"];

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

type EntryView = {
  id: string;
  type: string;
  mode: string;
  title: string;
  excerpt: string;
  date: string;
  mood: string;
  favorite: boolean;
  isMock?: boolean;
};


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
  const queryClient = useQueryClient();
  const { awardXp, completeTask, isComplete } = useNuMind();
  const { data: srvJournal } = useMyJournal();
  const [mode, setMode] = useState(JOURNAL_MODES[0]!);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EntryView | null>(null);
  const [saving, setSaving] = useState(false);
  const [hiddenMocks, setHiddenMocks] = useState<string[]>([]);
  const [favLocal, setFavLocal] = useState<Record<string, boolean>>({});

  const serverEntries: EntryView[] = (srvJournal ?? []).map((j) => ({
    id: j.id,
    type: j.journal_type,
    mode: JOURNAL_TYPE_LABEL[j.journal_type] ?? "📖 Free Journal",
    title: j.title ?? "Untitled",
    excerpt: j.content,
    date: formatDate(j.created_at),
    mood: j.mood_tag ?? "",
    favorite: j.favorite ?? false,
  }));

  // Warm mock fallback only while the user has no real entries yet.
  const fallbackEntries: EntryView[] = JOURNAL_ENTRIES.map((m) => ({
    id: m.id,
    type: MOCK_LABEL_TO_TYPE[m.mode] ?? "free",
    mode: m.mode,
    title: m.title,
    excerpt: m.excerpt,
    date: m.date,
    mood: m.mood,
    favorite: m.favorite,
    isMock: true,
  }));

  const baseList: EntryView[] = (
    srvJournal && srvJournal.length ? serverEntries : fallbackEntries
  ).filter((e) => !hiddenMocks.includes(e.id));

  const favOf = (e: EntryView) => favLocal[e.id] ?? e.favorite;

  const entries = baseList.filter(
    (e) =>
      (!favOnly || favOf(e)) && (e.title + e.excerpt).toLowerCase().includes(q.toLowerCase()),
  );

  const letters = baseList.filter((e) => e.type === "letter_to_future_me");

  const toggleFav = (e: EntryView) => {
    const next = !favOf(e);
    setFavLocal((m) => ({ ...m, [e.id]: next }));
    if (isUuid(e.id)) {
      toggleJournalFavorite({ data: { id: e.id, favorite: next } }).catch(() => {
        setFavLocal((m) => ({ ...m, [e.id]: e.favorite }));
      });
    }
  };

  const startEdit = (e: EntryView) => {
    const m = JOURNAL_MODES.find((x) => x.id === TYPE_TO_MODE[e.type]);
    if (m) setMode(m);
    setTitle(e.title === "Untitled" ? "" : e.title);
    setText(e.excerpt);
    setMoodTag(e.mood);
    setEditingId(e.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText("");
    setTitle("");
    setMoodTag("");
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const result = await saveJournalEntry({
        data: {
          ...(editingId ? { id: editingId } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
          content: text,
          journalType: MODE_TO_JOURNAL_TYPE[mode.id] ?? "free",
          moodTag: moodTag || null,
        },
      });
      if (result?.xpAwarded && result.xpAwarded > 0) {
        // Mirror the *persisted* amount so the live XP matches the ledger.
        if (isComplete("win")) {
          awardXp(result.xpAwarded, "Journal entry");
        } else {
          completeTask("win", { title: "Journal entry", xp: result.xpAwarded });
        }
      }
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["myJournal"] });
    } catch {
      // Offline or backend hiccup — keep the typed text so nothing is lost.
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    if (target.isMock) {
      setHiddenMocks((h) => [...h, target.id]);
      if (editingId === target.id) cancelEdit();
      return;
    }
    if (isUuid(target.id)) {
      deleteJournalEntry({ data: { id: target.id } })
        .then(() => {
          if (editingId === target.id) cancelEdit();
          queryClient.invalidateQueries({ queryKey: ["myJournal"] });
        })
        .catch(() => {});
    }
  };

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
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Title</label>
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
          <span className="text-xs text-muted-foreground">Mood</span>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMoodTag(moodTag === m ? "" : m)}
              aria-pressed={moodTag === m}
              className={cn(
                "focus-ring rounded-full px-3 py-1.5 text-xs font-medium",
                moodTag === m
                  ? "bg-brand font-bold text-navy shadow-soft"
                  : "bg-muted hover:bg-accent",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">🔒 Private to you</span>
          {editingId ? (
            <button
              onClick={cancelEdit}
              className="focus-ring ml-auto rounded-full bg-muted px-5 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Cancel
            </button>
          ) : null}
          <button
            disabled={!text.trim() || saving}
            onClick={() => void handleSave()}
            className="focus-ring ml-auto rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy disabled:bg-muted disabled:text-muted-foreground"
          >
            {saving ? "Saving…" : editingId ? "Update entry" : "Save entry +20 XP"}
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
              <SoftCard interactive className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                    {e.mode}
                  </span>
                  <button
                    onClick={() => toggleFav(e)}
                    aria-pressed={favOf(e)}
                    aria-label={favOf(e) ? "Remove from favourites" : "Add to favourites"}
                    className="focus-ring rounded-full p-1 text-base transition hover:bg-muted"
                  >
                    {favOf(e) ? "❤️" : "🤍"}
                  </button>
                </div>
                <p className="mt-3 font-semibold">{e.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{e.excerpt}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{e.date}</span>
                  {e.mood ? (
                    <>
                      <span>·</span>
                      <span>{e.mood}</span>
                    </>
                  ) : null}
                </div>
                <div className="mt-auto flex gap-2 pt-3">
                  <button
                    onClick={() => startEdit(e)}
                    className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setDeleting(e)}
                    className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-coral hover:bg-accent"
                  >
                    🗑 Delete
                  </button>
                </div>
              </SoftCard>
            </li>
          ))}
        </ul>
      )}

      {letters.length > 0 ? (
        <div className="mt-6 flex items-center gap-3 rounded-3xl bg-accent/50 p-4">
          <ToneIcon emoji="💌" tone="lavender" />
          <div>
            <p className="font-semibold">
              {letters.length} {letters.length === 1 ? "letter" : "letters"} to future you{" "}
              {letters.length === 1 ? "is" : "are"} waiting
            </p>
            <p className="text-sm text-muted-foreground">
              A little time capsule tucked inside your journal.
            </p>
          </div>
        </div>
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="max-w-sm rounded-3xl text-center">
          <AlertDialogHeader className="items-center text-center">
            <span className="text-4xl" aria-hidden>
              🗑
            </span>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be permanently removed. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-coral text-navy hover:brightness-105"
            >
              Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
