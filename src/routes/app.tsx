import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
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
