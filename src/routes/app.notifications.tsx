import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMyNotifications, useMarkNotificationsRead } from "@/lib/server-data";
import { PageHeader, SoftCard, EmptyState, LoadingState } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";
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

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const typeLabel = (type?: string) =>
  !type ? "Notice" : type.charAt(0).toUpperCase() + type.slice(1);

function NotificationsPage() {
  const { data: note, isLoading } = useMyNotifications();
  const markRead = useMarkNotificationsRead();
  // Tracks the last unread id-signature so the effect marks read exactly once
  // per incoming batch instead of looping on the invalidate-triggered refetch.
  const handled = useRef<string>("");

  // Opening the inbox marks everything read, which clears the header badge.
  useEffect(() => {
    const unread = (note ?? []).filter((n) => !n.read);
    if (!unread.length) return;
    const ids = unread.map((n) => n.id);
    const sig = [...ids].sort().join(",");
    if (sig === handled.current) return;
    handled.current = sig;
    markRead.mutate(ids);
  }, [note, markRead]);

  const markAllRead = () => markRead.mutate([]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        emoji="Bell"
        title="Notifications"
        subtitle="Nudges, never nagging."
        action={
          <button
            onClick={markAllRead}
            disabled={isLoading || !note?.some((n) => !n.read)}
            className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Mark all read
          </button>
        }
      />
      {isLoading && !note ? (
        <LoadingState rows={3} />
      ) : !note?.length ? (
        <EmptyState
          emoji="CloudSun"
          title="All caught up"
          message="Nothing needs you right now. Enjoy the quiet."
        />
      ) : (
        <ul className="grid gap-2">
          {note.map((n) => (
            <li key={n.id}>
              <SoftCard
                className={cn(
                  "flex items-start gap-3 p-4",
                  !n.read && "border-teal/50 bg-teal/8",
                )}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted"
                  aria-hidden
                >
                  <Icon symbol={n.emoji ?? "Bell"} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.message ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {typeLabel(n.type)} · {formatTime(n.created_at)}
                  </p>
                </div>
                {!n.read ? (
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
