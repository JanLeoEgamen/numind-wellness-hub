import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { COMMUNITY_POSTS } from "@/lib/mock-data";
import { createCommunityPost, toggleCommunityReaction } from "@/lib/server-functions";
import { useCommunityFeed, useMyStats, isUuid } from "@/lib/server-data";
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

type PostView = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  hearts: number;
  claps: number;
  stars: number;
  tag: "Inspiration" | "Kindness";
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
});

function TogetherPage() {
  const { data: feed, refetch: refetchFeed } = useCommunityFeed();
  const myProfile = useMyStats().data?.profile;
  const myName = myProfile?.nickname ?? [myProfile?.firstName, myProfile?.lastName].filter(Boolean).join(" ").trim() ?? "You";
  const myAvatar = myProfile?.avatar ?? "🌷";
  const [tab, setTab] = useState<(typeof TABS)[number]>("Inspiration Wall");
  const [posts, setPosts] = useState<PostView[]>(COMMUNITY_POSTS as PostView[]);
  const [text, setText] = useState("");

  // Seed from the real community feed (authoritative). Falls back to mock
  // warmth when the server is unreachable.
  useEffect(() => {
    if (!feed?.length) return;
    setPosts(feed.map(toView));
  }, [feed]);

  const filtered = posts.filter((p) =>
    tab === "Inspiration Wall"
      ? p.tag === "Inspiration"
      : tab === "Acts of Kindness"
        ? p.tag === "Kindness"
        : false,
  );

  const toggleReact = (id: string, field: "hearts" | "claps" | "stars", reaction: string) => {
    if (!isUuid(id)) return;
    toggleCommunityReaction({ data: { postId: id, reaction } })
      .then(({ active }) => {
        setPosts((prev) =>
          prev.map((x) =>
            x.id === id ? { ...x, [field]: (x[field] ?? 0) + (active ? 1 : -1) } : x,
          ),
        );
      })
      .catch(() => {
        /* offline — counts stay as they are */
      });
  };

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
          <SoftCard>
            <SectionTitle hint="4 days left">🌍 One Million Mindful Minutes</SectionTitle>
            <ProgressBar tone="teal" value={742000} max={1000000} />
            <p className="mt-2 text-sm text-muted-foreground">
              742,318 minutes logged by the NuMind community.
            </p>
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
                const optimistic: PostView = {
                  id: String(Date.now()),
                  author: myName,
                  avatar: myAvatar,
                  text,
                  hearts: 0,
                  claps: 0,
                  stars: 0,
                  tag: tab === "Acts of Kindness" ? "Kindness" : "Inspiration",
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
              {filtered.map((p) => (
                <li key={p.id}>
                  <SoftCard>
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-full bg-mint/40 text-lg"
                        aria-hidden
                      >
                        {p.avatar}
                      </span>
                      <p className="font-semibold">{p.author}</p>
                      <button className="focus-ring ml-auto rounded-full bg-muted px-3 py-1.5 text-xs">
                        Report
                      </button>
                    </div>
                    <p className="mt-3 text-sm">{p.text}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggleReact(p.id, "hearts", "heart")}
                        className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs"
                      >
                        ❤️ {p.hearts}
                      </button>
                      <button
                        onClick={() => toggleReact(p.id, "claps", "clap")}
                        className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs"
                      >
                        👏 {p.claps}
                      </button>
                      <button
                        onClick={() => toggleReact(p.id, "stars", "star")}
                        className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs"
                      >
                        🌟 {p.stars}
                      </button>
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
          Together is a positive-only space. No private messaging, no medical advice, no contact
          details. Posts are moderated and can be reported at any time.
        </DisclaimerNote>
      </div>
    </div>
  );
}
