import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { USER } from "@/lib/mock-data";
import {
  useMyStats,
  useMyNumiConversations,
  useNumiConversationMessages,
} from "@/lib/server-data";
import {
  archiveNumiConversation,
  newNumiConversation,
  sendNumiMessage,
} from "@/lib/server-functions";
import { NumiAvatar, PageHeader, DisclaimerNote } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
import { useNuMind } from "@/lib/numind-store";
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
  { icon: "Smile", label: "Motivate Me", intent: "motivate" },
  { icon: "PersonStanding", label: "Help Me Relax", intent: "relax" },
  { icon: "Zap", label: "Help Me Focus", intent: "focus" },
  { icon: "Target", label: "Help Me Set a Goal", intent: "goal" },
  { icon: "Calendar", label: "Plan My Day", intent: "plan" },
  { icon: "MessageSquareText", label: "Journal With Me", intent: "journal" },
  { icon: "Sparkles", label: "Celebrate My Progress", intent: "celebrate" },
  { icon: "Moon", label: "Help Me Wind Down", intent: "wind_down" },
];

type Msg = { id: string; from: "numi" | "user"; text: string; source?: string | undefined };

// Pull the reply source out of a message's metadata without assuming its shape.
function msgSource(metadata: unknown): string | undefined {
  if (metadata && typeof metadata === "object" && "source" in metadata) {
    const s = (metadata as { source?: unknown }).source;
    return typeof s === "string" ? s : undefined;
  }
  return undefined;
}

function NumiPage() {
  const stats = useMyStats();
  const name = stats.data?.profile?.firstName ?? USER.name;
  const queryClient = useQueryClient();
  const { awardXp } = useNuMind();

  const { data: conversations, refetch: refetchConversations } = useMyNumiConversations();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesQuery = useNumiConversationMessages(conversationId);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const primedRef = useRef<string | null>(null);
  const creatingRef = useRef(false);

  // Auto-select the most recent conversation, or create the first one.
  useEffect(() => {
    if (conversationId || !conversations || creatingRef.current) return;
    if (conversations.length > 0) {
      primedRef.current = null;
      setConversationId(conversations[0]!.id);
      return;
    }
    creatingRef.current = true;
    newNumiConversation()
      .then((c) => {
        primedRef.current = c.id;
        setConversationId(c.id);
        refetchConversations();
      })
      .catch(() => {
        setMessages([
          { id: "welcome", from: "numi", text: `Hi ${name}! What can I help you with today?` },
        ]);
      })
      .finally(() => {
        creatingRef.current = false;
      });
  }, [conversations, conversationId, name, refetchConversations]);

  // Load persisted history once per conversation (then local state takes over).
  useEffect(() => {
    if (!conversationId || primedRef.current === conversationId) return;
    if (!messagesQuery.isFetched) return;
    const rows = messagesQuery.data ?? [];
    setMessages(
      rows.length > 0
        ? rows.map((m) => ({
            id: m.id,
            from: m.role === "user" ? "user" : "numi",
            text: m.content,
            source: msgSource(m.metadata),
          }))
        : [{ id: "welcome", from: "numi", text: `Hi ${name}! What can I help you with today?` }],
    );
    primedRef.current = conversationId;
  }, [conversationId, messagesQuery.isFetched, messagesQuery.data, name]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function switchConversation(id: string) {
    if (id === conversationId || typing) return;
    primedRef.current = null;
    setConversationId(id);
    setMessages([]);
  }

  async function send(text: string, intent?: string) {
    if (!text.trim() || typing) return;
    const trimmed = text.trim();
    setMessages((m) => [...m, { id: `user-${Date.now()}`, from: "user", text: trimmed }]);
    setInput("");
    setTyping(true);
    try {
      let cid = conversationId;
      if (!cid) {
        const created = await newNumiConversation();
        cid = created.id;
        primedRef.current = cid;
        setConversationId(cid);
        refetchConversations();
      }
      const result = await sendNumiMessage({
        data: { conversationId: cid, message: trimmed, intent: intent ?? null },
      });
      setMessages((m) => [
        ...m,
        { id: `numi-${Date.now()}`, from: "numi", text: result.reply, source: result.replySource },
      ]);
      primedRef.current = result.conversationId;
      if (result.xpAwarded > 0) awardXp(result.xpAwarded, "Checked in with Numi");
      queryClient.invalidateQueries({ queryKey: ["numiConversationMessages"] });
      refetchConversations();
    } catch (err) {
      console.error("[Numi] send failed:", err);
      setMessages((m) => [
        ...m,
        {
          id: `numi-err-${Date.now()}`,
          from: "numi",
          text: "I couldn't reach myself just now — give me a moment and try again.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  async function startNewChat() {
    if (typing) return;
    try {
      const created = await newNumiConversation();
      primedRef.current = created.id;
      setConversationId(created.id);
      setMessages([]);
      refetchConversations();
    } catch {
      setMessages([
        { id: "welcome", from: "numi", text: `Fresh start, ${name}. What's on your mind?` },
      ]);
    }
  }

  async function clearConversation() {
    if (!conversationId || typing) return;
    await archiveNumiConversation({ data: { conversationId } }).catch(() => {});
    refetchConversations();
    await startNewChat();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        emoji="Bot"
        title="Meet Numi"
        subtitle="Your AI wellness companion — here to motivate, support, organize and celebrate."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={startNewChat}
              className="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy"
            >
              + New chat
            </button>
            <button
              onClick={clearConversation}
              disabled={!conversationId}
              className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        }
      />

      {conversations && conversations.length > 0 ? (
        <div
          className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
          aria-label="Your conversations"
        >
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => switchConversation(c.id)}
              title={c.title}
              className={cn(
                "focus-ring max-w-[180px] shrink-0 truncate rounded-full border px-3.5 py-1.5 text-xs font-medium",
                c.id === conversationId
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="card-soft flex min-h-[52vh] flex-col p-4 sm:p-6">
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
                  <Icon symbol={USER.avatar} size={18} />
                </span>
              )}
              <div
                className={cn(
                  "animate-rise max-w-[80%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm",
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
              onClick={() => send(q.label, q.intent)}
              className="focus-ring shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium hover:bg-accent"
            >
              <Icon symbol={q.icon} size={14} className="mr-1 inline-block align-[-2px]" /> {q.label}
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
            disabled={typing}
            className="focus-ring flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm disabled:opacity-60"
          />
          <button
            disabled={!input.trim() || typing}
            className="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>

      <div className="mt-4">
        <DisclaimerNote>
          Numi is an AI wellness companion, not a healthcare professional. Numi does not provide
          medical advice, diagnosis or treatment. Replies are generated by AI and are for
          motivation and support only.
        </DisclaimerNote>
      </div>
    </div>
  );
}
