import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { markNotificationsRead } from "@/lib/server-functions";
import { useMyNotifications } from "@/lib/server-data";
import { PageHeader, SoftCard, EmptyState } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NuMind" },
      {
        name: "description",
        content: "Gentle nudges about your reset, streak, garden, rewards and quests.",
      },
      { property: "og:title", content: "Notifications — NuMind" },
      {
        property: "og:description",
        content: "Gentle nudges about your reset, streak, garden, rewards and quests.",
      },
    ],
  }),
  component: NotificationsPage,
});

type NotificationView = {
  id: string;
  emoji: string;
  title: string;
  time: string;
  unread: boolean;
  category: string;
};

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const days = Math.floor(mins / 1440);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function NotificationsPage() {
  const { data: srvNotes } = useMyNotifications();
  const [items, setItems] = useState<NotificationView[]>(NOTIFICATIONS);

  useEffect(() => {
    if (!srvNotes?.length) return;
    setItems(
      srvNotes.map((n) => ({
        id: n.id,
        emoji: n.emoji ?? "🔔",
        title: n.title,
        time: formatTime(n.created_at),
        unread: !n.read,
        category: n.type ?? "General",
      })),
    );
  }, [srvNotes]);

  const clearAll = () => {
    markNotificationsRead({ data: {} }).catch(() => {});
    setItems([]);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        emoji="🔔"
        title="Notifications"
        subtitle="Nudges, never nagging."
        action={
          <button
            onClick={clearAll}
            className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold"
          >
            Clear all
          </button>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          emoji="🌤"
          title="All caught up"
          message="Nothing needs you right now. Enjoy the quiet."
        />
      ) : (
        <ul className="grid gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <SoftCard
                className={cn(
                  "flex items-center gap-3 p-4",
                  n.unread && "border-teal/50 bg-teal/8",
                )}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-lg"
                  aria-hidden
                >
                  {n.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.category} · {n.time}
                  </p>
                </div>
                {n.unread ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-label="Unread" />
                ) : null}
              </SoftCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
