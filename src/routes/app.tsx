import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "NuMind App — Your everyday wellness companion" },
      { name: "description", content: "Your NuMind dashboard: Daily Reset, Mind Gym, Quests, Garden and Numi." },
      { property: "og:title", content: "NuMind App" },
      { property: "og:description", content: "Reset, focus and grow with your everyday wellness companion." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
