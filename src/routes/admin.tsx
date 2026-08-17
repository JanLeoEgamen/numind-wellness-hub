import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  useAdminBroadcast,
  useAdminCatalog,
  useAdminDashboard,
  useAdminDeleteCatalog,
  useAdminDeletePost,
  useAdminModeration,
  useAdminRecentXp,
  useAdminRemoveUserRole,
  useAdminSetCatalogActive,
  useAdminSetPostHidden,
  useAdminSetSubscriptionStatus,
  useAdminSetUserRole,
  useAdminSubscriptions,
  useAdminUpsertCatalog,
  useAdminUserDetail,
  useAdminUsers,
} from "@/lib/admin-data";
import type { AdminUserRow, CatalogTable } from "@/lib/admin-functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "NuMind Admin" },
      {
        name: "description",
        content: "Admin dashboard for content, gamification and engagement metrics.",
      },
      { property: "og:title", content: "NuMind Admin" },
      { property: "og:description", content: "Admin dashboard for content, gamification and engagement metrics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const CATALOG_SECTIONS: { label: string; table: CatalogTable }[] = [
  { label: "Quests", table: "quests" },
  { label: "Mind Gym", table: "mind_gym_activities" },
  { label: "Healthy Play", table: "games" },
  { label: "Learning Lounge", table: "learning_content" },
  { label: "Quizzes", table: "quizzes" },
  { label: "Levels", table: "levels" },
  { label: "Badges", table: "badges" },
  { label: "Rewards", table: "rewards" },
  { label: "Garden Items", table: "garden_items" },
  { label: "Themes", table: "themes" },
  { label: "Numi Prompts", table: "numi_prompts" },
  { label: "Safety Resources", table: "safety_resources" },
  { label: "Seasonal Events", table: "seasonal_events" },
];

const NAV = [
  "Dashboard",
  "Users",
  "Subscriptions",
  ...CATALOG_SECTIONS.map((s) => s.label),
  "Together Moderation",
  "Notifications",
  "Feature Flags",
  "XP",
];

function Admin() {
  const [section, setSection] = useState("Dashboard");
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate({ to: "/login" });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) setIsAdmin(true);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="card-soft max-w-md p-8 text-center">
          <p className="text-4xl">🔒</p>
          <h1 className="mt-3 text-xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to NuMind administrators. Your account doesn&apos;t have the admin role yet.
          </p>
          <button
            onClick={() => navigate({ to: "/app" })}
            className="focus-ring mt-6 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-navy"
          >
            Back to the app
          </button>
        </div>
      </div>
    );
  }

  const currentCat = CATALOG_SECTIONS.find((s) => s.label === section);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border bg-sidebar p-4 lg:block">
        <p className="mb-4 px-2 text-sm font-bold">🧠 NuMind Admin</p>
        <nav className="grid gap-0.5" aria-label="Admin">
          {NAV.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              aria-current={section === s ? "page" : undefined}
              className={cn(
                "focus-ring rounded-xl px-3 py-2 text-left text-sm",
                section === s ? "bg-brand font-semibold text-navy" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s}
            </button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{section}</h1>
          <span className="rounded-full bg-mint/40 px-3 py-1 text-xs font-semibold">Live data</span>
          <div className="ml-auto">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              aria-label="Admin section"
              className="focus-ring rounded-full border border-border bg-card px-4 py-2 text-sm lg:hidden"
            >
              {NAV.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {section === "Dashboard" && <DashboardPanel />}
        {section === "Users" && <UsersPanel />}
        {section === "Subscriptions" && <SubscriptionsPanel />}
        {section === "Together Moderation" && <ModerationPanel />}
        {section === "Notifications" && <NotificationsPanel />}
        {section === "XP" && <XpPanel />}
        {section === "Feature Flags" && <FeatureFlagsPanel />}
        {currentCat && <CatalogPanel label={currentCat.label} table={currentCat.table} />}

        <p className="mt-8 text-xs text-muted-foreground">
          Journal entries and Numi conversations are never surfaced here as analytics.
        </p>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------
function fmtDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, withTime ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" });
}

function Pill({ tone, children }: { tone: "mint" | "muted" | "destructive" | "sun"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
        tone === "mint" && "bg-mint/40",
        tone === "sun" && "bg-sun/40",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-soft p-10 text-center">
      <p className="text-3xl">🌱</p>
      <p className="mt-3 text-sm font-medium">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Nothing here yet.</p>
    </div>
  );
}

function ErrorNote({ error }: { error: unknown }) {
  return (
    <div className="card-soft border-destructive/30 p-6">
      <p className="text-sm font-semibold text-destructive">Something went wrong</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {error instanceof Error ? error.message : "Could not load this section."}
      </p>
    </div>
  );
}

function LoadingNote() {
  return (
    <div className="card-soft p-10 text-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard / Analytics
// ---------------------------------------------------------------------------
function DashboardPanel() {
  const { data, isLoading, error } = useAdminDashboard();
  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;
  const m = data.metrics;

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "Total users", value: m.totalUsers.toLocaleString() },
    { label: "Active today (DAU)", value: m.activeToday.toLocaleString() },
    { label: "Active last 7d", value: m.active7d.toLocaleString() },
    { label: "Active last 30d (MAU)", value: m.active30d.toLocaleString() },
    { label: "Daily resets today", value: m.dailyResetsToday.toLocaleString(), sub: `${m.resetCompletionPct}% complete` },
    { label: "Mind Gym (30d)", value: m.mindGymSessions30d.toLocaleString() },
    { label: "Focus sessions (30d)", value: m.focusSessions30d.toLocaleString() },
    { label: "Journal entries (30d)", value: m.journalEntries30d.toLocaleString() },
    { label: "Lessons completed (30d)", value: m.lessonsCompleted30d.toLocaleString() },
    { label: "Quests completed (30d)", value: m.questsCompleted30d.toLocaleString() },
    { label: "Numi conversations (30d)", value: m.numiConversations30d.toLocaleString() },
    { label: "Healthy Play (30d)", value: m.healthyPlaySessions30d.toLocaleString() },
    { label: "Rewards redeemed (30d)", value: m.rewardsRedeemed30d.toLocaleString() },
    { label: "Active subscriptions", value: m.subscriptionsActive.toLocaleString(), sub: `of ${m.subscriptionsTotal}` },
    { label: "XP issued (all time)", value: m.xpEarnedTotal.toLocaleString() },
  ];

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <li key={c.label} className="card-soft p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
            {c.sub && <p className="mt-0.5 text-xs font-medium text-teal">{c.sub}</p>}
          </li>
        ))}
      </ul>

      <div className="card-soft mt-4 p-6">
        <h2 className="text-sm font-bold">Recent signups</h2>
        {data.recentUsers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.recentUsers.map((u) => (
              <li
                key={u.user_id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
              >
                <span className="truncate font-medium">{u.email}</span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">{fmtDate(u.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
function UsersPanel() {
  const { data, isLoading, error } = useAdminUsers();
  const setRole = useAdminSetUserRole();
  const removeRole = useAdminRemoveUserRole();
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const promote = (u: AdminUserRow, role: "admin" | "moderator") =>
    setRole.mutate(
      { userId: u.user_id, role },
      { onSuccess: () => toast.success(`${u.email.split("@")[0]} is now ${role}`), onError: (e) => toast.error(e.message) },
    );
  const stripRole = (u: AdminUserRow, role: "admin" | "moderator") =>
    removeRole.mutate(
      { userId: u.user_id, role },
      { onSuccess: () => toast.success(`Removed ${role} from ${u.email.split("@")[0]}`), onError: (e) => toast.error(e.message) },
    );

  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;
  if (data.length === 0) return <EmptyState message="No users have signed up yet." />;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="card-soft overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Joined</th>
                <th className="p-3">Roles</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.user_id} className="border-t border-border">
                  <td className="p-3 font-medium">{u.email}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <Pill tone="muted">none</Pill>}
                      {u.roles.map((r) => (
                        <Pill key={r} tone={r === "admin" ? "sun" : r === "moderator" ? "mint" : "muted"}>
                          {r}
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelected(u)}
                      className="focus-ring rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-1">
        <UserDetailCard user={selected} onClose={() => setSelected(null)} />
        <RoleEditor user={selected} onPromote={promote} onStrip={stripRole} />
      </div>
    </div>
  );
}

function RoleEditor({
  user,
  onPromote,
  onStrip,
}: {
  user: AdminUserRow | null;
  onPromote: (u: AdminUserRow, role: "admin" | "moderator") => void;
  onStrip: (u: AdminUserRow, role: "admin" | "moderator") => void;
}) {
  if (!user) {
    return (
      <div className="card-soft mt-4 p-5">
        <h3 className="text-sm font-bold">Change role</h3>
        <p className="mt-3 text-xs text-muted-foreground">Select a user to edit their roles.</p>
      </div>
    );
  }
  const isAdminRole = user.roles.includes("admin");
  return (
    <div className="card-soft mt-4 p-5">
      <h3 className="text-sm font-bold">Change role</h3>
      <p className="mt-1 text-xs text-muted-foreground">Manage moderation and admin roles.</p>
      <div className="mt-3 grid gap-2">
        <button
          onClick={() => onPromote(user, "moderator")}
          disabled={user.roles.includes("moderator")}
          className="focus-ring rounded-full bg-muted px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {user.roles.includes("moderator") ? "Moderator ✓" : "Make moderator"}
        </button>
        <button
          onClick={() => onPromote(user, "admin")}
          disabled={isAdminRole}
          className="focus-ring rounded-full bg-brand px-4 py-2 text-xs font-semibold text-navy disabled:opacity-50"
        >
          {isAdminRole ? "Admin ✓" : "Make admin"}
        </button>
        {(user.roles.includes("moderator") || isAdminRole) && (
          <button
            onClick={() => onStrip(user, isAdminRole ? "admin" : "moderator")}
            className="focus-ring rounded-full bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive"
          >
            Remove {isAdminRole ? "admin" : "moderator"}
          </button>
        )}
      </div>
    </div>
  );
}

function UserDetailCard({ user, onClose }: { user: AdminUserRow | null; onClose: () => void }) {
  const detail = useAdminUserDetail(user?.user_id ?? null);
  if (!user) {
    return (
      <div className="card-soft p-5">
        <h3 className="text-sm font-bold">User detail</h3>
        <p className="mt-2 text-xs text-muted-foreground">Select a user to inspect their profile, roles and subscription.</p>
      </div>
    );
  }
  const subs = Array.isArray(detail.data?.subscriptions) ? detail.data.subscriptions : [];
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between">
        <h3 className="truncate text-sm font-bold">{user.email}</h3>
        <button onClick={onClose} className="focus-ring rounded-full px-2 text-muted-foreground">
          ✕
        </button>
      </div>
      {detail.isLoading && <p className="mt-3 text-xs text-muted-foreground">Loading…</p>}
      {detail.error && <p className="mt-3 text-xs text-destructive">Could not load detail.</p>}
      {detail.data && (
        <dl className="mt-3 grid gap-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">XP</dt>
            <dd className="font-semibold">{(detail.data.xpTotal ?? 0).toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Joined</dt>
            <dd>{fmtDate(detail.data.user?.created_at)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Garden stage</dt>
            <dd>{detail.data.garden ? String((detail.data.garden as Record<string, unknown> | null)?.["stage"] ?? "—") : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Active subs</dt>
            <dd>{subs.length}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
function SubscriptionsPanel() {
  const { data, isLoading, error } = useAdminSubscriptions();
  const setStatus = useAdminSetSubscriptionStatus();

  const updateStatus = (id: string, status: string) =>
    setStatus.mutate(
      { id, status: status as "trialing" | "active" | "past_due" | "canceled" | "expired" },
      { onSuccess: () => toast.success("Subscription updated"), onError: (e) => toast.error(e.message) },
    );

  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;
  if (data.length === 0) return <EmptyState message="No subscriptions yet." />;

  return (
    <div className="card-soft overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">User</th>
            <th className="p-3">Plan</th>
            <th className="p-3">Billing</th>
            <th className="p-3">Status</th>
            <th className="p-3">Started</th>
            <th className="p-3">Renews</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="p-3 font-medium">{s.nickname ?? s.firstName ?? "Member"}</td>
              <td className="p-3">
                {s.plan_name ?? "—"}
                {s.price_monthly_cents ? <span className="ml-1 text-xs text-muted-foreground">(${(s.price_monthly_cents / 100).toFixed(2)}/mo)</span> : null}
              </td>
              <td className="p-3 capitalize text-muted-foreground">{s.billing_period}</td>
              <td className="p-3">
                <Pill tone={s.status === "active" || s.status === "trialing" ? "mint" : s.status === "canceled" || s.status === "expired" ? "destructive" : "sun"}>
                  {s.status}
                </Pill>
              </td>
              <td className="p-3 text-muted-foreground">{fmtDate(s.started_at)}</td>
              <td className="p-3 text-muted-foreground">{fmtDate(s.current_period_end)}</td>
              <td className="p-3">
                <select
                  value={s.status}
                  onChange={(e) => updateStatus(s.id, e.target.value)}
                  aria-label="Subscription status"
                  className="focus-ring rounded-full border border-border bg-card px-2 py-1 text-xs"
                >
                  {["active", "trialing", "past_due", "canceled", "expired"].map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Together moderation
// ---------------------------------------------------------------------------
function ModerationPanel() {
  const { data, isLoading, error } = useAdminModeration();
  const setHidden = useAdminSetPostHidden();
  const del = useAdminDeletePost();

  const toggle = (id: string, hidden: boolean) =>
    setHidden.mutate(
      { id, hidden },
      {
        onSuccess: () => toast.success(hidden ? "Post hidden" : "Post restored"),
        onError: (e) => toast.error(e.message),
      },
    );
  const remove = (id: string) => {
    if (window.confirm("Delete this post permanently?")) {
      del.mutate(id, { onSuccess: () => toast.success("Post deleted"), onError: (e) => toast.error(e.message) });
    }
  };

  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;
  if (data.length === 0) return <EmptyState message="No community posts yet." />;

  return (
    <div className="grid gap-3">
      {data.map((p) => (
        <div
          key={p.id}
          className={cn("card-soft p-4", p.hidden && "opacity-60")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base">{p.emoji ?? "💬"}</span>
                <span className="text-sm font-semibold">
                  {p.anonymous ? "Anonymous" : p.nickname ?? p.firstName ?? "Member"}
                </span>
                <Pill tone="muted">{p.category}</Pill>
                {p.hidden && <Pill tone="destructive">hidden</Pill>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(p.created_at, true)} · ❤️ {p.reactionCount}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                onClick={() => toggle(p.id, !p.hidden)}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 text-xs font-semibold",
                  p.hidden ? "bg-mint/40" : "bg-muted",
                )}
              >
                {p.hidden ? "Restore" : "Hide"}
              </button>
              <button
                onClick={() => remove(p.id)}
                className="focus-ring rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications broadcast
// ---------------------------------------------------------------------------
function NotificationsPanel() {
  const broadcast = useAdminBroadcast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("");
  const [type, setType] = useState("general");
  const [result, setResult] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("A title is required");
      return;
    }
    broadcast.mutate(
      { title, message, type, ...(emoji ? { emoji } : {}) },
      {
        onSuccess: (r) => {
          toast.success(`Notification sent to ${r.sent} user(s)`);
          setResult(`Sent to ${r.sent} user(s) ✓`);
          setTitle("");
          setMessage("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="card-soft max-w-2xl p-6">
      <h2 className="text-sm font-bold">Send a notification</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Broadcasts to every NuMind user. Use sparingly — this goes to everyone&apos;s inbox.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="Emoji (🌱)"
            className="focus-ring w-20 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title, e.g. A new Quest has started!"
            className="focus-ring flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (optional)"
          rows={3}
          className="focus-ring rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Notification type"
            className="focus-ring rounded-full border border-border bg-card px-3 py-2 text-sm"
          >
            {["general", "quest", "reward", "event", "welcome", "reminder"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={broadcast.isPending}
            className="focus-ring rounded-full bg-brand px-5 py-2 text-sm font-semibold text-navy disabled:opacity-50"
          >
            {broadcast.isPending ? "Sending…" : "Send broadcast"}
          </button>
          {result && <span className="text-xs font-medium text-teal">{result}</span>}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// XP ledger
// ---------------------------------------------------------------------------
function XpPanel() {
  const { data, isLoading, error } = useAdminRecentXp();
  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;
  if (data.length === 0) return <EmptyState message="No XP awarded yet." />;

  const total = data.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="grid gap-4">
      <div className="card-soft p-4">
        <p className="text-xs text-muted-foreground">XP issued in the last 100 transactions</p>
        <p className="mt-1 text-2xl font-bold">+{total.toLocaleString()}</p>
      </div>
      <div className="card-soft overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Source</th>
              <th className="p-3">Description</th>
              <th className="p-3">When</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.nickname ?? "Member"}</td>
                <td className="p-3 font-semibold text-teal">+{r.amount}</td>
                <td className="p-3">
                  <Pill tone="muted">{r.source_type}</Pill>
                </td>
                <td className="p-3 text-muted-foreground">{r.description ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{fmtDate(r.created_at, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------
function FeatureFlagsPanel() {
  const { data, isLoading, error } = useAdminCatalog("feature_flags");
  const setActive = useAdminSetCatalogActive("feature_flags");

  const toggle = (id: string, active: boolean) =>
    setActive.mutate(
      { id, active },
      { onSuccess: () => toast.success("Feature flag updated"), onError: (e) => toast.error(e.message) },
    );

  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;

  const rows = data as unknown as {
    id: string;
    key: string;
    label: string;
    description: string | null;
    enabled: boolean;
    rollout_pct: number;
    updated_at: string | null;
  }[];

  if (rows.length === 0) return <EmptyState message="No feature flags yet." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((f) => (
        <div key={f.id} className="card-soft p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{f.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.description ?? f.key}</p>
            </div>
            <button
              role="switch"
              aria-checked={f.enabled}
              onClick={() => toggle(f.id, !f.enabled)}
              className={cn(
                "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors",
                f.enabled ? "bg-teal" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  f.enabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Pill tone={f.enabled ? "mint" : "muted"}>{f.enabled ? "Enabled" : "Disabled"}</Pill>
            <span className="text-xs text-muted-foreground">{f.rollout_pct}% rollout</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic content catalog table (used by most content sections)
// ---------------------------------------------------------------------------
const SKIP_COLUMNS = ["id", "created_at", "updated_at"];

function pickEditable(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!SKIP_COLUMNS.includes(k)) out[k] = v;
  return out;
}

function createDefaults(table: CatalogTable): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  switch (table) {
    case "quests": Object.assign(d, { slug: "", title: "", description: "", category: "daily", quest_type: "daily", xp_reward: 25, emoji: "", active: true }); break;
    case "mind_gym_activities": Object.assign(d, { slug: "", title: "", description: "", category: "breathe", duration_minutes: 3, difficulty: "easy", emoji: "", xp_reward: 10, active: true }); break;
    case "learning_content": Object.assign(d, { slug: "", title: "", summary: "", body: "", content_type: "article", category: "", duration_minutes: 5, emoji: "", xp_reward: 15, active: true }); break;
    case "quizzes": Object.assign(d, { slug: "", title: "", description: "", category: "learning", xp_reward: 20, active: true }); break;
    case "badges": Object.assign(d, { slug: "", name: "", description: "", emoji: "", category: "milestone", xp_reward: 25, active: true }); break;
    case "rewards": Object.assign(d, { slug: "", name: "", description: "", reward_type: "theme", emoji: "", xp_cost: 100, active: true }); break;
    case "garden_items": Object.assign(d, { slug: "", name: "", description: "", item_type: "flower", emoji: "", xp_cost: 0, active: true }); break;
    case "games": Object.assign(d, { slug: "", name: "", description: "", emoji: "", category: "memory", premium_required: false, active: true }); break;
    case "themes": Object.assign(d, { slug: "", name: "", description: "", emoji: "", premium_required: false, sort_order: 0, active: true }); break;
    case "numi_prompts": Object.assign(d, { slug: "", text: "", category: "reflection", tone: "gentle", active: true }); break;
    case "safety_resources": Object.assign(d, { name: "", description: "", country_code: "GLOBAL", phone: "", priority: 100, active: true }); break;
    case "subscription_plans": Object.assign(d, { slug: "", name: "", tagline: "", emoji: "", price_monthly_cents: 0, price_annual_cents: 0, popular: false, sort_order: 0, active: true }); break;
    case "seasonal_events": Object.assign(d, { slug: "", name: "", description: "", emoji: "", active: true }); break;
    case "levels": Object.assign(d, { level_number: 1, name: "", tagline: "", xp_required: 0, emoji: "" }); break;
    case "feature_flags": Object.assign(d, { key: "", label: "", description: "", enabled: true, rollout_pct: 100 }); break;
  }
  return d;
}

function FieldInput({ field, value, onChange }: { field: string; value: unknown; onChange: (v: unknown) => void }) {
  const t = typeof value;
  if (t === "boolean") {
    return <input type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} className="focus-ring size-5" />;
  }
  if (t === "number") {
    return <input type="number" value={String(value ?? "")} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="focus-ring rounded-xl border border-border bg-card px-3 py-2 text-sm" />;
  }
  if (t === "object" && value !== null) {
    return <textarea rows={3} value={JSON.stringify(value)} onChange={(e) => { const raw = e.target.value; try { onChange(JSON.parse(raw)); } catch { onChange(raw); } }} className="focus-ring w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs" />;
  }
  const isLong = /description|summary|body|content$|text$|message/.test(field) || String(value ?? "").length > 60;
  if (isLong) {
    return <textarea rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="focus-ring rounded-xl border border-border bg-card px-3 py-2 text-sm" />;
  }
  return <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="focus-ring w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />;
}

function CatalogPanel({ label, table }: { label: string; table: CatalogTable }) {
  const { data, isLoading, error } = useAdminCatalog(table);
  const setActive = useAdminSetCatalogActive(table);
  const del = useAdminDeleteCatalog(table);
  const upsert = useAdminUpsertCatalog(table);
  const [editing, setEditing] = useState<{ id?: string; values: Record<string, unknown> } | null>(null);
  const rows = (data ?? []) as Record<string, unknown>[];

  const toggle = (id: string, active: boolean) =>
    setActive.mutate({ id, active }, { onError: (e) => toast.error(e.message) });
  const remove = (id: string) => {
    if (window.confirm(`Delete this ${label} item?`)) {
      del.mutate(id, { onSuccess: () => toast.success("Deleted"), onError: (e) => toast.error(e.message) });
    }
  };
  const startCreate = () => setEditing({ values: createDefaults(table) });
  const startEdit = (row: Record<string, unknown>) => setEditing({ id: String(row["id"]), values: pickEditable(row) });
  const setField = (key: string, value: unknown) =>
    setEditing((e) => (e ? { ...e, values: { ...e.values, [key]: value } } : e));
  const nameOf = (r: Record<string, unknown>) => String(r["title"] ?? r["name"] ?? r["text"] ?? r["key"] ?? "Item");

  if (isLoading) return <LoadingNote />;
  if (error || !data) return <ErrorNote error={error} />;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{rows.length} item{rows.length === 1 ? "" : "s"} in this catalog.</p>
        <button onClick={startCreate} className="focus-ring rounded-full bg-brand px-5 py-2 text-sm font-semibold text-navy">+ Add {label}</button>
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsert.mutate(
              { ...(editing.id ? { id: editing.id } : {}), fields: editing.values },
              {
                onSuccess: () => { toast.success(editing.id ? `${label} updated` : `${label} added`); setEditing(null); },
                onError: (err) => toast.error(err.message),
              },
            );
          }}
          className="card-soft p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{editing.id ? `Edit ${label}` : `Add ${label}`}</h3>
            <button type="button" onClick={() => setEditing(null)} className="focus-ring rounded-full px-2 text-muted-foreground">✕</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(editing.values).map(([key, value]) => (
              <label key={key} className="grid gap-1 text-xs">
                <span className="font-semibold capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                <FieldInput field={key} value={value} onChange={(v) => setField(key, v)} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={upsert.isPending} className="focus-ring rounded-full bg-brand px-5 py-2 text-sm font-semibold text-navy disabled:opacity-50">
              {upsert.isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="focus-ring rounded-full bg-muted px-5 py-2 text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState message={`No ${label.toLowerCase()} content yet.`} />
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Item</th><th className="p-3">Slug</th><th className="p-3">Active</th><th className="p-3">Updated</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const id = String(r["id"]);
                const emoji = r["emoji"] && typeof r["emoji"] === "string" ? `${r["emoji"]} ` : "";
                const name = nameOf(r);
                return (
                  <tr key={id} className="border-t border-border">
                    <td className="p-3 font-medium">{emoji}{name}</td>
                    <td className="p-3 text-muted-foreground">{String(r["slug"] ?? "—")}</td>
                    <td className="p-3">
                      {typeof r["active"] === "boolean" && (
                        <button onClick={() => toggle(id, !(r["active"] as boolean))} className={cn("focus-ring rounded-full px-3 py-1 text-xs font-semibold", r["active"] ? "bg-mint/40" : "bg-muted")}>
                          {r["active"] ? "Active" : "Inactive"}
                        </button>
                      )}
                      {table === "feature_flags" && (
                        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", r["enabled"] ? "bg-mint/40" : "bg-muted")}>
                          {r["enabled"] ? "Enabled" : "Disabled"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{fmtDate(String(r["updated_at"] ?? r["created_at"] ?? ""))}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => startEdit(r)} className="focus-ring mr-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">Edit</button>
                      <button onClick={() => remove(id)} aria-label={`Delete ${name}`} className="focus-ring rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}






