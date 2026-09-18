import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useNuMind } from "@/lib/numind-store";
import { useMyStats, useMyNotifications, useMySubscription } from "@/lib/server-data";
import { USER } from "@/lib/mock-data";
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
import { Icon } from "@/components/numind/icon";

const PRIMARY = [
  { to: "/app", icon: "Home", label: "Home" },
  { to: "/app/reset", icon: "Sun", label: "Reset" },
  { to: "/app/mind-gym", icon: "Brain", label: "Mind Gym" },
  { to: "/app/quest", icon: "Trophy", label: "Quest" },
  { to: "/app/numi", icon: "Bot", label: "Numi" },
];

const MORE = [
  { to: "/app/wellness", icon: "Droplets", label: "My Wellness" },
  { to: "/app/check-ins", icon: "ClipboardCheck", label: "Check-Ins" },
  { to: "/app/journal", icon: "BookOpen", label: "My Journal" },
  { to: "/app/memory-lane", icon: "Flower2", label: "Memory Lane" },
  { to: "/app/together", icon: "Heart", label: "Together" },
  { to: "/app/learning", icon: "GraduationCap", label: "Learning Lounge" },
  { to: "/app/journey", icon: "Sparkles", label: "My Journey" },
  { to: "/app/analytics", icon: "ChartColumn", label: "My Analytics" },
  { to: "/app/reports", icon: "FileText", label: "My Wellness Reports" },
  { to: "/app/rewards", icon: "Gift", label: "Rewards" },
  { to: "/app/garden", icon: "Sprout", label: "My Garden" },
  { to: "/app/focus", icon: "Zap", label: "Focus Zone" },
  { to: "/app/play", icon: "Gamepad2", label: "Healthy Play" },
  { to: "/app/profile", icon: "UserRound", label: "Profile" },
  { to: "/app/settings", icon: "Settings", label: "Settings" },
  { to: "/app/safety", icon: "LifeBuoy", label: "Safety" },
];

function NavItem({ to, icon, label, active }: { to: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-brand text-navy shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon symbol={icon} size={18} />
      {label}
    </Link>
  );
}

export function AppShell({ children, rightPanel }: { children: ReactNode; rightPanel?: ReactNode }) {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { xp, xpInLevel, xpForLevel, levelName, levelEmoji, streak, levelIndex } = useNuMind();
  const { data: srvStats } = useMyStats();
  const { data: srvNotes } = useMyNotifications();
  const { data: mySub } = useMySubscription();
  const avatar = srvStats?.profile?.avatar ?? USER.avatar;
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
              <Icon symbol="Brain" size={20} className="text-navy" />
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
              <Icon symbol={levelEmoji} size={14} className="mr-1 inline-block align-[-2px]" />
              Level {levelIndex + 1} — {levelName}
            </p>
            <ProgressBar className="mt-2" value={xpInLevel} max={xpForLevel} />
            <p className="mt-2 text-xs text-muted-foreground">
              {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon symbol={mySub?.plan?.emoji ?? "Sprout"} size={13} className="inline-block align-[-2px]" />
                {mySub?.plan?.name ?? "Free"}
              </p>
              {mySub?.plan && !mySub.isPremium ? (
                <Link to="/pricing" className="focus-ring rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-navy">
                  Upgrade
                </Link>
              ) : mySub?.plan && mySub.isPremium ? (
                <span className="rounded-full bg-mint/40 px-3 py-1 text-[11px] font-semibold">Premium</span>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
            <Link to="/app" className="focus-ring flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-base" aria-hidden>
                <Icon symbol="Brain" size={16} className="text-navy" />
              </span>
              <span className="font-bold">NuMind</span>
            </Link>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline-flex">
                <StreakBadge days={streak} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-3 py-1.5 text-xs font-semibold">
                <Icon symbol="Star" size={14} fill className="text-sun" /> {xp.toLocaleString()} XP
              </span>
              <Link
                to="/app/notifications"
                aria-label={`Notifications, ${unreadCount} unread`}
                className="focus-ring relative grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-accent"
              >
                <Icon symbol="Bell" size={18} />
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
                <span aria-hidden>
                  <Icon symbol={avatar} size={18} />
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                aria-label="Log out"
                title="Log out"
                className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-accent"
              >
                <Icon symbol="DoorOpen" size={18} />
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
                  <Icon symbol={i.icon} size={20} className={cn("transition", active && "scale-110")} />
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
                    <Icon symbol={i.icon} size={20} />
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
              <Icon symbol="Hand" size={44} />
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