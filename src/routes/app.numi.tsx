import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { USER } from "@/lib/mock-data";
import { useMyStats } from "@/lib/server-data";
import { numiChat, getNumiConversation, clearNumiConversation } from "@/lib/numi-functions";
import { NumiAvatar, PageHeader, DisclaimerNote } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/numi")({
  head: () => ({
    meta: [
      { title: "Numi — Your AI wellness companion | NuMind" },
      {
        name: "description",
        content:
          "Chat with Numi for motivation, focus help, goal setting and celebrating your progress.",
      },
      { property: "og:title", content: "Meet Numi — NuMind" },
      {
        property: "og:description",
        content: "An AI wellness companion that motivates, organizes and celebrates.",
      },
    ],
  }),
  component: NumiPage,
});

const QUICK = [
  { emoji: "😊", label: "Motivate Me" },
  { emoji: "🧘", label: "Help Me Relax" },
  { emoji: "⚡", label: "Help Me Focus" },
  { emoji: "🎯", label: "Help Me Set a Goal" },
  { emoji: "📅", label: "Plan My Day" },
  { emoji: "💭", label: "Journal With Me" },
  { emoji: "🌟", label: "Celebrate My Progress" },
  { emoji: "🌙", label: "Help Me Wind Down" },
];

type Msg = { id: string; from: "numi" | "user"; text: string };

function NumiPage() {
  const stats = useMyStats();
  const name = stats.data?.profile?.firstName ?? USER.name;
  const nameRef = useRef(name);
  nameRef.current = name;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Hydrate the saved conversation once on mount so a refresh keeps the chat.
  useEffect(() => {
    let cancelled = false;
    getNumiConversation()
      .then((conv) => {
        if (cancelled) return;
        setConversationId(conv.conversationId);
        setMessages(
          conv.messages.length > 0
            ? conv.messages.map((m) => ({
                id: m.id,
                from: m.role === "user" ? "user" : "numi",
                text: m.content,
              }))
            : [{ id: "greeting", from: "numi", text: `Hi ${nameRef.current}! What can I help you with today?` }],
        );
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([{ id: "greeting", from: "numi", text: `Hi ${nameRef.current}! What can I help you with today?` }]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function send(text: string) {
    const value = text.trim();
    if (!value || typing) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, from: "user", text: value }]);
    setInput("");
    setTyping(true);
    numiChat({
      data: { message: value, ...(conversationId ? { conversationId } : {}) },
    })
      .then((res) => {
        setConversationId(res.conversationId);
        setOffline(res.fallback);
        setMessages((m) => [...m, { id: `n-${Date.now()}`, from: "numi", text: res.assistant }]);
      })
      .catch((err) => {
        console.error("[Numi] chat failed:", err);
        setMessages((m) => [
          ...m,
          { id: `n-${Date.now()}`, from: "numi", text: "Hmm, I couldn't reach my words just now. Try again in a moment? 💚" },
        ]);
      })
      .finally(() => setTyping(false));
  }

  function clearChat() {
    if (conversationId) {
      clearNumiConversation({ data: { conversationId } }).catch(() => {});
    }
    setConversationId(null);
    setOffline(false);
    setMessages([{ id: "greeting", from: "numi", text: `Fresh start, ${nameRef.current}. What's on your mind?` }]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        emoji="🤖"
        title="Numi"
        subtitle="Your AI wellness companion — here to motivate, focus and celebrate with you."
        action={
          <button
            onClick={clearChat}
            className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Clear conversation
          </button>
        }
      />

      <div className="card-soft flex min-h-[52vh] flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              offline ? "bg-muted text-muted-foreground" : "bg-mint/40",
            )}
          >
            {offline ? "Offline mode" : "Live AI"}
          </span>
          {loading && <span className="text-muted-foreground">Loading conversation…</span>}
        </div>

        <ul className="flex-1 space-y-4">
          {messages.map((m) => (
            <li key={m.id} className={cn("flex gap-3", m.from === "user" && "flex-row-reverse")}>
              {m.from === "numi" ? (
                <NumiAvatar size={36} />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lavender/40 text-lg"
                  aria-hidden
                >
                  {USER.avatar}
                </span>
              )}
              <div
                className={cn(
                  "animate-rise max-w-[80%] rounded-3xl px-4 py-3 text-sm",
                  m.from === "numi" ? "bg-muted/70" : "bg-brand text-navy",
                )}
              >
                {m.text}
              </div>
            </li>
          ))}
          {typing ? (
            <li className="flex gap-3">
              <NumiAvatar size={36} />
              <div
                className="flex items-center gap-1 rounded-3xl bg-muted/70 px-4 py-3"
                aria-label="Numi is typing"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </li>
          ) : null}
          <div ref={endRef} />
        </ul>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => send(q.label)}
              className="focus-ring shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium hover:bg-accent"
            >
              <span aria-hidden>{q.emoji}</span> {q.label}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="numi-input" className="sr-only">
            Message Numi
          </label>
          <input
            id="numi-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell Numi how today is going…"
            className="focus-ring flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm"
          />
          <button
            className="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy disabled:opacity-50"
            disabled={typing}
          >
            Send
          </button>
        </form>
      </div>

      <div className="mt-4">
        <DisclaimerNote>
          Numi is an AI wellness companion, not a healthcare professional. Numi does not provide medical advice,
          diagnosis or treatment. AI replies are generated and may be imperfect — for urgent support, use the Safety
          Center.
        </DisclaimerNote>
      </div>
    </div>
  );
}

