import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useNuMind } from "@/lib/numind-store";
import { USER } from "@/lib/mock-data";
import { useMyNotifications } from "@/lib/server-data";
import { NumiAvatar, StreakBadge, ProgressBar } from "@/components/numind/ui-kit";
import { CelebrationModal } from "@/components/numind/celebration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { signOut } from "@/hooks/useAuth";

const PRIMARY = [
  { to: "/app", emoji: "🏠", label: "Home" },
  { to: "/app/reset", emoji: "🌞", label: "Reset" },
  { to: "/app/mind-gym", emoji: "🧠", label: "Mind Gym" },
  { to: "/app/quest", emoji: "🏆", label: "Quest" },
  { to: "/app/numi", emoji: "🤖", label: "Numi" },
];

const MORE = [
  { to: "/app/wellness", emoji: "💧", label: "My Wellness" },
  { to: "/app/journal", emoji: "📖", label: "My Journal" },
  { to: "/app/memory-lane", emoji: "🌸", label: "Memory Lane" },
  { to: "/app/together", emoji: "💙", label: "Together" },
  { to: "/app/learning", emoji: "🎓", label: "Learning Lounge" },
  { to: "/app/journey", emoji: "✨", label: "My Journey" },
  { to: "/app/analytics", emoji: "📊", label: "My Analytics" },
  { to: "/app/rewards", emoji: "🎁", label: "Rewards" },
  { to: "/app/garden", emoji: "🌱", label: "My Garden" },
  { to: "/app/focus", emoji: "⚡", label: "Focus Zone" },
  { to: "/app/play", emoji: "🎮", label: "Healthy Play" },
  { to: "/app/profile", emoji: "👤", label: "Profile" },
  { to: "/app/settings", emoji: "⚙️", label: "Settings" },
  { to: "/app/safety", emoji: "🆘", label: "Safety" },
];

function NavItem({ to, emoji, label, active }: { to: string; emoji: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-brand text-navy shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span aria-hidden className="text-base">
        {emoji}
      </span>
      {label}
    </Link>
  );
}

export function AppShell({ children, rightPanel }: { children: ReactNode; rightPanel?: ReactNode }) {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { xp, xpInLevel, xpForLevel, levelName, levelEmoji, streak, levelIndex } = useNuMind();
  const { data: srvNotes } = useMyNotifications();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  // Unread notification count for the header badge. Falls back to 0 when the
  // server query is pending/unavailable.
  const unreadCount = (srvNotes ?? []).filter((n) => !n.read).length;

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      navigate({ to: "/login" });
    } catch {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
          <Link to="/" className="focus-ring mb-6 flex items-center gap-2 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg" aria-hidden>
              🧠
            </span>
            <span className="text-lg font-bold">NuMind</span>
          </Link>

          <nav className="grid gap-1" aria-label="Primary">
            {PRIMARY.map((i) => (
              <NavItem key={i.to} {...i} active={pathname === i.to} />
            ))}
          </nav>

          <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">More</p>
          <nav className="mt-2 grid gap-1 overflow-y-auto pb-4" aria-label="Secondary">
            {MORE.map((i) => (
              <NavItem key={i.to} {...i} active={pathname === i.to} />
            ))}
          </nav>

          <div className="mt-auto rounded-3xl bg-muted/60 p-4">
            <p className="text-xs font-semibold">
              {levelEmoji} Level {levelIndex + 1} — {levelName}
            </p>
            <ProgressBar className="mt-2" value={xpInLevel} max={xpForLevel} />
            <p className="mt-2 text-xs text-muted-foreground">
              {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
            <Link to="/app" className="focus-ring flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-base" aria-hidden>
                🧠
              </span>
              <span className="font-bold">NuMind</span>
            </Link>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline-flex">
                <StreakBadge days={streak} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-3 py-1.5 text-xs font-semibold">
                <span aria-hidden>⭐</span> {xp.toLocaleString()} XP
              </span>
              <Link
                to="/app/notifications"
                aria-label={`Notifications, ${unreadCount} unread`}
                className="focus-ring relative grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-accent"
              >
                <span aria-hidden>🔔</span>
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-navy">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <Link
                to="/app/profile"
                aria-label="Your profile"
                className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-lavender/40 text-lg"
              >
                <span aria-hidden>{USER.avatar}</span>
              </Link>
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                aria-label="Log out"
                title="Log out"
                className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-accent"
              >
                <span aria-hidden>🚪</span>
              </button>
            </div>
          </header>

          <div className="flex min-w-0 flex-1">
            <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
            {rightPanel ? (
              <aside className="hidden w-[320px] shrink-0 border-l border-border px-5 py-6 xl:block">{rightPanel}</aside>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-6">
          {PRIMARY.map((i) => {
            const active = pathname === i.to;
            return (
              <li key={i.to}>
                <Link
                  to={i.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span aria-hidden className={cn("text-lg transition", active && "scale-110")}>
                    {i.emoji}
                  </span>
                  {i.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className="focus-ring flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-muted-foreground"
            >
              <span aria-hidden className="text-lg">
                •••
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-navy/50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="animate-rise max-h-[80vh] w-full overflow-y-auto rounded-t-4xl bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
            <div className="mb-4 flex items-center gap-3">
              <NumiAvatar size={40} />
              <p className="text-sm font-semibold">Where would you like to go?</p>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {MORE.map((i) => (
                <li key={i.to}>
                  <Link
                    to={i.to}
                    onClick={() => setMoreOpen(false)}
                    className="focus-ring flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-3 text-sm font-medium"
                  >
                    <span aria-hidden>{i.emoji}</span>
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setMoreOpen(false)}
              className="focus-ring mt-4 w-full rounded-full bg-muted py-3 text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {/* Log out confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-sm rounded-3xl text-center">
          <AlertDialogHeader className="items-center text-center">
            <span className="text-4xl" aria-hidden>
              👋
            </span>
            <AlertDialogTitle>Log out of NuMind?</AlertDialogTitle>
            <AlertDialogDescription>
              You can pick up right where you left off next time. Your streak and garden are safe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmLogout();
              }}
              disabled={loggingOut}
              className="bg-coral text-navy hover:brightness-105"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CelebrationModal />
    </div>
  );
}