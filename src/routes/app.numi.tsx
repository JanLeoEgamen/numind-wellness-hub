import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { USER } from "@/lib/mock-data";
import { useMyStats } from "@/lib/server-data";
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
  {
    emoji: "😊",
    label: "Motivate Me",
    reply:
      "You've shown up 12 days in a row. That's not luck — that's you choosing yourself, repeatedly. One small thing today is plenty.",
  },
  {
    emoji: "🧘",
    label: "Help Me Relax",
    reply:
      "Let's do 60 seconds of breathing together. In for 4, hold for 4, out for 6. I'll be right here when you're done. 🌬",
  },
  {
    emoji: "⚡",
    label: "Help Me Focus",
    reply:
      "Try a 15-minute Focus Sprint. Pick one task, silence the rest, and I'll keep the timer. Want me to start it?",
  },
  {
    emoji: "🎯",
    label: "Help Me Set a Goal",
    reply:
      'Let\'s make it small and specific: "Walk 15 minutes after lunch, 4 days this week." Want me to add it to your Quest?',
  },
  {
    emoji: "📅",
    label: "Plan My Day",
    reply:
      "Top 3 for today: 1) Daily Reset 2) One focus sprint on the report 3) A short walk outside. Everything else is a bonus.",
  },
  {
    emoji: "💭",
    label: "Journal With Me",
    reply: "Here's a prompt: what's one thing that went better than you expected this week?",
  },
  {
    emoji: "🌟",
    label: "Celebrate My Progress",
    reply:
      "This month: 31 Mind Gym sessions, 19 journal entries and a garden that went from Flower to Tree. Look at that. 🌳",
  },
  {
    emoji: "🌙",
    label: "Help Me Wind Down",
    reply:
      "Screens down, lights low, and the Evening Wind Down in Mind Gym. Six minutes and your brain gets the hint.",
  },
];

type Msg = { id: number; from: "numi" | "user"; text: string };

function NumiPage() {
  const stats = useMyStats();
  const name = stats.data?.profile?.firstName ?? USER.name;
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, from: "numi", text: `Hi ${name}! What can I help you with today?` },
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send(text: string, reply?: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), from: "user", text }]);
    setInput("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: "numi",
          text:
            reply ??
            "I hear you. Let's keep it small: pick one thing from Today's Journey and I'll cheer you on. 🌱",
        },
      ]);
    }, 900);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        emoji="🤖"
        title="Meet Numi"
        subtitle="Your AI wellness companion — here to motivate, support, organize and celebrate."
        action={
          <button
            onClick={() =>
              setMessages([
                { id: 1, from: "numi", text: `Fresh start, ${name}. What's on your mind?` },
              ])
            }
            className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Clear conversation
          </button>
        }
      />

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
              onClick={() => send(q.label, q.reply)}
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
          <button className="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy">
            Send
          </button>
        </form>
      </div>

      <div className="mt-4">
        <DisclaimerNote>
          Numi is an AI wellness companion, not a healthcare professional. Numi does not provide
          medical advice, diagnosis or treatment. This is a demo experience with mock conversations.
        </DisclaimerNote>
      </div>
    </div>
  );
}
