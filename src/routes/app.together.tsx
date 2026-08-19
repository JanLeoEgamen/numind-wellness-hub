import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { COMMUNITY_POSTS } from "@/lib/mock-data";
import {
  createCommunityPost,
  toggleCommunityReaction,
  reportCommunityPost,
} from "@/lib/server-functions";
import { useCommunityFeed, useCommunityStats, useMyStats, isUuid } from "@/lib/server-data";
import {
  PageHeader,
  SoftCard,
  ProgressBar,
  SectionTitle,
  EmptyState,
  DisclaimerNote,
} from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/together")({
  head: () => ({
    meta: [
      { title: "Together — NuMind" },
      {
        name: "description",
        content: "A positive-only community: inspiration, acts of kindness and shared challenges.",
      },
      { property: "og:title", content: "Together — NuMind" },
      {
        property: "og:description",
        content: "A positive-only community: inspiration, acts of kindness and shared challenges.",
      },
    ],
  }),
  component: TogetherPage,
});

const TABS = ["Inspiration Wall", "Acts of Kindness", "Community Challenges"] as const;
const REASONS = ["Inappropriate", "Spam", "Other"] as const;

type PostView = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  hearts: number;
  claps: number;
  stars: number;
  tag: "Inspiration" | "Kindness";
  myReaction?: string[];
};

interface ServerPost {
  id: string;
  user_id: string;
  content: string;
  category: string;
  emoji: string | null;
  anonymous: boolean;
  hidden?: boolean;
  created_at: string;
  authorName?: string;
  avatar?: string;
  reactions?: Record<string, number>;
  myReaction?: string[];
}

const toView = (p: ServerPost): PostView => ({
  id: p.id,
  author: p.authorName ?? (p.anonymous ? "Anonymous" : "NuMind member"),
  avatar: p.avatar ?? p.emoji ?? "🌿",
  text: p.content,
  hearts: p.reactions?.["heart"] ?? 0,
  claps: p.reactions?.["clap"] ?? 0,
  stars: p.reactions?.["star"] ?? 0,
  tag: p.category === "kindness" ? "Kindness" : "Inspiration",
  myReaction: p.myReaction ?? [],
});


function TogetherPage() {
  const { data: feed, refetch: refetchFeed } = useCommunityFeed();
  const { data: community } = useCommunityStats();
  const myProfile = useMyStats().data?.profile;
  const myName = myProfile?.nickname ?? [myProfile?.firstName, myProfile?.lastName].filter(Boolean).join(" ").trim() ?? "You";
  const myAvatar = myProfile?.avatar ?? "🌷";
  const [tab, setTab] = useState<(typeof TABS)[number]>("Inspiration Wall");
  const [posts, setPosts] = useState<PostView[]>(COMMUNITY_POSTS as PostView[]);
  const [text, setText] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  // Seed from the real community feed once it loads. The warm mock is only a
  // placeholder while loading — an empty live feed shows the real empty state.
  useEffect(() => {
    if (!feed) return;
    setPosts(feed.map(toView));
  }, [feed]);

  const filtered = posts.filter((p) =>
    tab === "Inspiration Wall"
      ? p.tag === "Inspiration"
      : tab === "Acts of Kindness"
        ? p.tag === "Kindness"
        : false,
  );

  // Optimistically toggles a reaction (count + my-reaction set), then reconciles
  // from the server; reverts on failure so a count never drifts or goes negative.
  const toggleReact = (id: string, field: "hearts" | "claps" | "stars", reaction: string) => {
    if (!isUuid(id)) return;
    const apply = (dir: 1 | -1) =>
      setPosts((prev) =>
        prev.map((x) => {
          if (x.id !== id) return x;
          const active = (x.myReaction ?? []).includes(reaction);
          const next: PostView = {
            ...x,
            myReaction: active
              ? (x.myReaction ?? []).filter((r) => r !== reaction)
              : [...(x.myReaction ?? []), reaction],
          };
          const delta = dir * (active ? -1 : 1);
          if (field === "hearts") next.hearts = Math.max(0, next.hearts + delta);
          else if (field === "claps") next.claps = Math.max(0, next.claps + delta);
          else next.stars = Math.max(0, next.stars + delta);
          return next;
        }),
      );
    apply(1);
    toggleCommunityReaction({ data: { postId: id, reaction } }).catch(() => apply(-1));
  };

  const submitReport = (id: string, reason: string) => {
    reportCommunityPost({ data: { postId: id, reason } })
      .then(() => {
        setReportedIds((s) => new Set(s).add(id));
        setReportingId(null);
      })
      .catch(() => setReportingId(null));
  };

  const challenges: { emoji: string; title: string; value: number; unit: string; target: number }[] = community
    ? [
        {
          emoji: "🧠",
          title: "Mindful Minutes",
          value: community.totalFocusMinutes,
          unit: "minutes shared",
          target: Math.max(1000, Math.ceil(community.totalFocusMinutes / 1000) * 1000),
        },
        {
          emoji: "🌞",
          title: "Daily Resets",
          value: community.totalResets,
          unit: "resets",
          target: Math.max(100, Math.ceil(community.totalResets / 100) * 100),
        },
        {
          emoji: "🌱",
          title: "Garden Seeds",
          value: community.totalGardenItems,
          unit: "items planted",
          target: Math.max(100, Math.ceil(community.totalGardenItems / 100) * 100),
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        emoji="💙"
        title="Together"
        subtitle="Small encouragement from people doing the same small things."
      />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              tab === t ? "bg-brand font-bold text-navy" : "bg-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Community Challenges" ? (
        <div className="grid gap-4">
          {challenges.length ? (
            challenges.map((c) => (
              <SoftCard key={c.title}>
                <SectionTitle>{c.emoji} {c.title}</SectionTitle>
                <ProgressBar tone="teal" value={c.value} max={c.target} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {c.value.toLocaleString()} {c.unit} toward {c.target.toLocaleString()}.
                </p>
              </SoftCard>
            ))
          ) : (
            <SoftCard>
              <p className="text-sm text-muted-foreground">Loading community totals…</p>
            </SoftCard>
          )}
          <SoftCard>
            <SectionTitle hint="Community">🎉 Community Milestone</SectionTitle>
            <p className="text-sm">
              {community
                ? `Together the NuMind community has logged ${community.totalFocusMinutes.toLocaleString()} mindful minutes, ${community.totalResets.toLocaleString()} Daily Resets and ${community.totalGardenItems.toLocaleString()} garden items.`
                : "Community totals will appear here as people show up."}
            </p>
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
                const optimistic: PostView = {
                  id: String(Date.now()),
                  author: myName,
                  avatar: myAvatar,
                  text,
                  hearts: 0,
                  claps: 0,
                  stars: 0,
                  tag: tab === "Acts of Kindness" ? "Kindness" : "Inspiration",
                  myReaction: [],
                };
                setPosts((p) => [optimistic, ...p]);
                setText("");
                createCommunityPost({
                  data: {
                    content: text,
                    category: tab === "Acts of Kindness" ? "kindness" : "win",
                    anonymous: false,
                  },
                })
                  .then((created) => {
                    if (created) {
                      setPosts((p) =>
                        p.map((x) =>
                          x.id === optimistic.id
                            ? toView({ ...created, authorName: myName, avatar: myAvatar })
                            : x,
                        ),
                      );
                    } else {
                      refetchFeed();
                    }
                  })
                  .catch(() => {
                    /* offline — the optimistic post stays */
                  });
              }}
              className="focus-ring mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-navy disabled:bg-muted disabled:text-muted-foreground"
            >
              Post
            </button>
          </SoftCard>

          {filtered.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                emoji="💙"
                title="It's quiet here"
                message="Be the first to share a little positivity."
              />
            </div>
          ) : (
            <ul className="mt-5 grid gap-3">
              {filtered.map((p) => {
                const reactionBtn = (
                  field: "hearts" | "claps" | "stars",
                  reaction: string,
                  emoji: string,
                ) => {
                  const active = (p.myReaction ?? []).includes(reaction);
                  return (
                    <button
                      onClick={() => toggleReact(p.id, field, reaction)}
                      aria-pressed={active}
                      className={cn(
                        "focus-ring rounded-full px-3 py-1.5 text-xs",
                        active ? "bg-mint/40 font-semibold" : "bg-muted",
                      )}
                    >
                      {emoji} {p[field]}
                    </button>
                  );
                };
                return (
                  <li key={p.id}>
                    <SoftCard>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="grid h-10 w-10 place-items-center rounded-full bg-mint/40 text-lg"
                          aria-hidden
                        >
                          {p.avatar}
                        </span>
                        <p className="font-semibold">{p.author}</p>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          {reportedIds.has(p.id) ? (
                            <span className="rounded-full bg-mint/30 px-3 py-1.5 text-xs font-semibold">
                              Reported ✓
                            </span>
                          ) : reportingId === p.id ? (
                            <>
                              {REASONS.map((r) => (
                                <button
                                  key={r}
                                  onClick={() => submitReport(p.id, r)}
                                  className="focus-ring rounded-full bg-mint/30 px-2.5 py-1.5 text-xs font-semibold hover:bg-mint/50"
                                >
                                  {r}
                                </button>
                              ))}
                              <button
                                onClick={() => setReportingId(null)}
                                className="focus-ring rounded-full px-2 py-1.5 text-xs text-muted-foreground"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setReportingId(p.id)}
                              className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-sm">{p.text}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reactionBtn("hearts", "heart", "❤️")}
                        {reactionBtn("claps", "clap", "👏")}
                        {reactionBtn("stars", "star", "🌟")}
                      </div>
                    </SoftCard>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className="mt-6">
        <DisclaimerNote>
          Together is a positive-only space. No private messaging, no medical advice, no contact
          details. Posts are moderated and can be reported at any time.
        </DisclaimerNote>
      </div>
    </div>
  );
}