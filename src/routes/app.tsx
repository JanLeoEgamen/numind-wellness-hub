import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getAuthenticatedUser, getOnboardingCompleted } from "@/lib/auth-guard";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getAuthenticatedUser();
    if (!user) throw redirect({ to: "/login" });
    // First-login onboarding gate: new users finish onboarding before the app.
    const completed = await getOnboardingCompleted(user.id);
    if (!completed) throw redirect({ to: "/onboarding" });
    return { user };
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
