// Admin backend for the NuMind admin dashboard.
//
// Every function here is admin-gated by `requireAdmin` (which first authenticates
// via `requireSupabaseAuth`, then verifies the caller holds the `admin` role).
// The Supabase client in context is RLS-scoped to the caller; admins can read
// across all users thanks to the admin RLS policies in the migrations.
//
// Aggregated/privileged data that PostgREST cannot expose (users from
// auth.users, analytics, role changes, broadcasts) goes through security-definer
// RPC functions defined in supabase/migrations/2026..._admin_features.sql.

import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// Admin authorization middleware
// ---------------------------------------------------------------------------
export const requireAdmin = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const { supabase, userId } = context as unknown as {
      supabase: SupabaseClient<Database>;
      userId: string;
    };
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Forbidden: admin access required");
    return next({});
  },
);

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export type AdminMetric = { label: string; value: string; delta?: string };

export type DashboardMetrics = {
  totalUsers: number;
  activeToday: number;
  active7d: number;
  active30d: number;
  dailyResetsToday: number;
  resetCompletionPct: number;
  mindGymSessions30d: number;
  focusSessions30d: number;
  journalEntries30d: number;
  journalUsers30d: number;
  lessonsCompleted30d: number;
  questsCompleted30d: number;
  numiConversations30d: number;
  numiUsers30d: number;
  rewardsRedeemed30d: number;
  healthyPlaySessions30d: number;
  healthyPlayUsers30d: number;
  xpEarnedTotal: number;
  subscriptionsActive: number;
  subscriptionsTotal: number;
};

export type AdminUserRow = {
  user_id: string;
  email: string;
  created_at: string;
  roles: string[];
};

export type AdminUserDetail = {
  user: { id: string; email: string; created_at: string } | null;
  profile: Json | null;
  roles: string[];
  xpTotal: number;
  subscriptions: Json;
  garden: Json | null;
};

// Whitelist of content catalogs the generic admin CRUD may touch. Keeping this
// explicit (rather than accepting an arbitrary table name) is the security
// boundary for the generic list/upsert/delete functions below.
export const CATALOG_TABLES = [
  "quests",
  "mind_gym_activities",
  "learning_content",
  "badges",
  "rewards",
  "garden_items",
  "safety_resources",
  "subscription_plans",
  "levels",
  "games",
  "themes",
  "quizzes",
  "numi_prompts",
  "seasonal_events",
  "feature_flags",
] as const;
export type CatalogTable = (typeof CATALOG_TABLES)[number];

const isCatalogTable = (t: string): t is CatalogTable =>
  (CATALOG_TABLES as readonly string[]).includes(t);

// ---------------------------------------------------------------------------
// Dashboard + analytics
// ---------------------------------------------------------------------------
export type DashboardData = {
  metrics: DashboardMetrics;
  totalUsers: number;
  recentUsers: AdminUserRow[];
};

export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async ({ context }): Promise<DashboardData> => {
    const { supabase } = context;

    const [metricsRes, usersRes] = await Promise.all([
      supabase.rpc("admin_analytics_overview"),
      supabase.rpc("admin_list_users"),
    ]);

    if (metricsRes.error) throw new Error(metricsRes.error.message);
    if (usersRes.error) throw new Error(usersRes.error.message);

    const users = usersRes.data ?? [];
    return {
      metrics: metricsRes.data as DashboardMetrics,
      totalUsers: users.length,
      recentUsers: users.slice(0, 8),
    };
  });

// ---------------------------------------------------------------------------
// Generic content catalog CRUD (validated against the whitelist)
// ---------------------------------------------------------------------------
export const adminListCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { table: CatalogTable }) => d)
  .handler(async ({ context, data }) => {
    if (!isCatalogTable(data.table)) throw new Error("Unknown admin table");
    const { data: rows, error } = await (context.supabase as any)
      .from(data.table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpsertCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { table: CatalogTable; id?: string; fields: Record<string, unknown> }) => d)
  .handler(async ({ context, data }) => {
    if (!isCatalogTable(data.table)) throw new Error("Unknown admin table");
    const { id, fields } = data;
    if (id) {
      const { data: updated, error } = await (context.supabase as any)
        .from(data.table)
        .update(fields)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await (context.supabase as any)
      .from(data.table)
      .insert(fields)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const adminDeleteCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { table: CatalogTable; id: string }) => d)
  .handler(async ({ context, data }) => {
    if (!isCatalogTable(data.table)) throw new Error("Unknown admin table");
    const { error } = await (context.supabase as any)
      .from(data.table)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetCatalogActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { table: CatalogTable; id: string; active: boolean }) => d)
  .handler(async ({ context, data }) => {
    if (!isCatalogTable(data.table)) throw new Error("Unknown admin table");
    const { error } = await (context.supabase as any)
      .from(data.table)
      .update(data.table === "feature_flags" ? { enabled: data.active } : { active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Users + roles
// ---------------------------------------------------------------------------
export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const { data, error } = await context.supabase.rpc("admin_list_users") as unknown as {
      data: AdminUserRow[];
      error: { message: string } | null;
    };
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }): Promise<AdminUserDetail> => {
    const { data: detail, error } = await context.supabase.rpc("admin_user_detail", {
      p_user_id: data.userId,
    }) as unknown as { data: AdminUserDetail; error: { message: string } | null };
    if (error) throw new Error(error.message);
    return detail as AdminUserDetail;
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { userId: string; role: "admin" | "moderator" | "user" }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role", {
      p_user_id: data.userId,
      p_role: data.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { userId: string; role: "admin" | "moderator" | "user" }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("admin_remove_user_role", {
      p_user_id: data.userId,
      p_role: data.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export type AdminSubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  started_at: string;
  current_period_end: string | null;
  canceled_at: string | null;
  nickname: string | null;
  firstName: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  price_monthly_cents: number | null;
};

export const adminListSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async ({ context }): Promise<AdminSubscriptionRow[]> => {
    const { supabase } = context;
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = subs ?? [];

    const planIds = [...new Set(rows.map((r) => r.plan_id))];
    const userIds = [...new Set(rows.map((r) => r.user_id))];

    const [plansRes, profilesRes] = await Promise.all([
      planIds.length
        ? supabase
            .from("subscription_plans")
            .select("id, name, slug, price_monthly_cents")
            .in("id", planIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase
            .from("profiles")
            .select("id, nickname, first_name, last_name")
            .in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const plans = new Map((plansRes.data ?? []).map((p) => [p.id, p]));
    const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

    return rows.map((s) => {
      const plan = plans.get(s.plan_id);
      const prof = profiles.get(s.user_id);
      return {
        ...s,
        nickname: prof?.nickname ?? null,
        firstName: prof?.first_name ?? null,
        plan_name: plan?.name ?? null,
        plan_slug: plan?.slug ?? null,
        price_monthly_cents: plan?.price_monthly_cents ?? null,
      };
    });
  });

export const adminSetSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { id: string; status: "trialing" | "active" | "past_due" | "canceled" | "expired" }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("subscriptions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Together moderation
// ---------------------------------------------------------------------------
export type AdminModerationPost = {
  id: string;
  user_id: string;
  content: string;
  category: string;
  emoji: string | null;
  anonymous: boolean;
  hidden: boolean;
  created_at: string;
  nickname: string | null;
  firstName: string | null;
  reactionCount: number;
};

export const adminListAllPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async ({ context }): Promise<AdminModerationPost[]> => {
    const { supabase } = context;
    const { data: posts, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = posts ?? [];

    const userIds = [...new Set(rows.map((p) => p.user_id))];
    const postIds = rows.map((p) => p.id);

    const [profilesRes, reactionsRes] = await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("id, nickname, first_name, last_name")
            .in("id", userIds)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase.from("community_reactions").select("post_id")
        : Promise.resolve({ data: [] }),
    ]);

    const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const counts = new Map<string, number>();
    for (const r of reactionsRes.data ?? []) {
      counts.set(r.post_id, (counts.get(r.post_id) ?? 0) + 1);
    }

    return rows.map((p) => {
      const prof = profiles.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        category: p.category,
        emoji: p.emoji,
        anonymous: p.anonymous,
        hidden: p.hidden,
        created_at: p.created_at,
        nickname: prof?.nickname ?? null,
        firstName: prof?.first_name ?? null,
        reactionCount: counts.get(p.id) ?? 0,
      };
    });
  });

export const adminSetPostHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { id: string; hidden: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("community_posts")
      .update({ hidden: data.hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("community_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



// ---------------------------------------------------------------------------
// Notification broadcast
// ---------------------------------------------------------------------------
export const adminBroadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .validator(
    (d: {
      title: string;
      message?: string;
      type?: string;
      emoji?: string;
      targetUserId?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { error, data: count } = await context.supabase.rpc("admin_broadcast_notification", {
      p_title: data.title.slice(0, 200),
      p_type: data.type ?? "general",
      ...(data.message ? { p_message: data.message } : {}),
      ...(data.emoji ? { p_emoji: data.emoji } : {}),
      ...(data.targetUserId ? { p_user_id: data.targetUserId } : {}),
    });
    if (error) throw new Error(error.message);
    return { sent: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// XP ledger (recent)
// ---------------------------------------------------------------------------
export type AdminXpRow = {
  id: string;
  user_id: string;
  amount: number;
  source_type: string;
  description: string | null;
  created_at: string;
  nickname: string | null;
};

export const adminRecentXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async ({ context }): Promise<AdminXpRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("xp_transactions")
      .select("id, user_id, amount, source_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, nickname, first_name").in("id", userIds)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.nickname ?? p.first_name]));
    return (rows ?? []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      amount: r.amount,
      source_type: r.source_type,
      description: r.description,
      created_at: r.created_at,
      nickname: names.get(r.user_id) ?? null,
    }));
  });





