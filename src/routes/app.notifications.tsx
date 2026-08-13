import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NOTIFICATIONS } from "@/lib/mock-data";
import { PageHeader, SoftCard, EmptyState } from "@/components/numind/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NuMind" },
      { name: "description", content: "Gentle nudges about your reset, streak, garden, rewards and quests." },
      { property: "og:title", content: "Notifications — NuMind" },
      { property: "og:description", content: "Gentle nudges about your reset, streak, garden, rewards and quests." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [items, setItems] = useState(NOTIFICATIONS);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        emoji="🔔"
        title="Notifications"
        subtitle="Nudges, never nagging."
        action={
          <button onClick={() => setItems([])} className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-semibold">
            Clear all
          </button>
        }
      />
      {items.length === 0 ? (
        <EmptyState emoji="🌤" title="All caught up" message="Nothing needs you right now. Enjoy the quiet." />
      ) : (
        <ul className="grid gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <SoftCard
                className={cn("flex items-center gap-3 p-4", n.unread && "border-teal/50 bg-teal/8")}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-lg" aria-hidden>{n.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.category} · {n.time}
                  </p>
                </div>
                {n.unread ? <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-label="Unread" /> : null}
              </SoftCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
