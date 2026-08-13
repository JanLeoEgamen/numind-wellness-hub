import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { COMMUNITY_POSTS } from "@/lib/mock-data";
import { PageHeader, SoftCard, ProgressBar, SectionTitle, EmptyState, DisclaimerNote } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/together")({
  head: () => ({
    meta: [
      { title: "Together — NuMind" },
      { name: "description", content: "A positive-only community: inspiration, acts of kindness and shared challenges." },
      { property: "og:title", content: "Together — NuMind" },
      { property: "og:description", content: "A positive-only community: inspiration, acts of kindness and shared challenges." },
    ],
  }),
  component: TogetherPage,
});

const TABS = ["Inspiration Wall", "Acts of Kindness", "Community Challenges"] as const;

function TogetherPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Inspiration Wall");
  const [posts, setPosts] = useState(COMMUNITY_POSTS);
  const [text, setText] = useState("");
  const filtered = posts.filter((p) =>
    tab === "Inspiration Wall" ? p.tag === "Inspiration" : tab === "Acts of Kindness" ? p.tag === "Kindness" : false,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader emoji="💙" title="Together" subtitle="Small encouragement from people doing the same small things." />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn("focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium", tab === t ? "bg-brand font-bold text-navy" : "bg-muted")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Community Challenges" ? (
        <div className="grid gap-4">
          <SoftCard>
            <SectionTitle hint="4 days left">🌍 One Million Mindful Minutes</SectionTitle>
            <ProgressBar tone="teal" value={742000} max={1000000} />
            <p className="mt-2 text-sm text-muted-foreground">742,318 minutes logged by the NuMind community.</p>
          </SoftCard>
          <SoftCard>
            <SectionTitle hint="Milestone">🎉 Community Milestone</SectionTitle>
            <p className="text-sm">Together we planted 128,000 garden seeds this season.</p>
          </SoftCard>
        </div>
      ) : (
        <>
          <SoftCard className="bg-hero">
            <label htmlFor="post" className="text-sm font-semibold">
              Share something positive
            </label>
            <textarea
              id="post"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="A small win, a kind act, a bit of encouragement…"
              className="focus-ring mt-2 w-full rounded-3xl border border-border bg-background p-4 text-sm"
            />
            <button
              disabled={!text.trim()}
              onClick={() => {
                setPosts((p) => [
                  { id: String(Date.now()), author: "Sarah", avatar: "🌷", text, hearts: 0, claps: 0, stars: 0, tag: tab === "Acts of Kindness" ? "Kindness" : "Inspiration" },
                  ...p,
                ]);
                setText("");
              }}
              className="focus-ring mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy disabled:bg-muted disabled:text-muted-foreground"
            >
              Post
            </button>
          </SoftCard>

          {filtered.length === 0 ? (
            <div className="mt-5">
              <EmptyState emoji="💙" title="It's quiet here" message="Be the first to share a little positivity." />
            </div>
          ) : (
            <ul className="mt-5 grid gap-3">
              {filtered.map((p) => (
                <li key={p.id}>
                  <SoftCard>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-mint/40 text-lg" aria-hidden>{p.avatar}</span>
                      <p className="font-semibold">{p.author}</p>
                      <button className="focus-ring ml-auto rounded-full bg-muted px-3 py-1.5 text-xs">Report</button>
                    </div>
                    <p className="mt-3 text-sm">{p.text}</p>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-full bg-muted px-3 py-1.5 text-xs">❤️ {p.hearts}</span>
                      <span className="rounded-full bg-muted px-3 py-1.5 text-xs">👏 {p.claps}</span>
                      <span className="rounded-full bg-muted px-3 py-1.5 text-xs">🌟 {p.stars}</span>
                    </div>
                  </SoftCard>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-6">
        <DisclaimerNote>
          Together is a positive-only space. No private messaging, no medical advice, no contact details. Posts are
          moderated and can be reported at any time.
        </DisclaimerNote>
      </div>
    </div>
  );
}
