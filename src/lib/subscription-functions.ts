// Subscription & entitlement backend for NuMind.
//
// Pricing is the basis for access: a user's *current plan* — the one they chose
// and pay for in `subscriptions` — decides which premium features unlock. The
// /pricing page renders live rows from `subscription_plans` instead of
// hard-coded mock prices, and switching plans here grants/revokes access
// immediately (kept as a single active row per user).

import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Public pricing catalog (readable by everyone, rendered on /pricing + landing)
// ---------------------------------------------------------------------------

export type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  emoji: string | null;
  monthlyCents: number;
  annualCents: number;
  currency: string;
  features: string[];
  popular: boolean;
  active: boolean;
  sortOrder: number;
};

type PlanRow = Database["public"]["Tables"]["subscription_plans"]["Row"];

function mapPlan(p: PlanRow): SubscriptionPlan {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    emoji: p.emoji,
    monthlyCents: p.price_monthly_cents,
    annualCents: p.price_annual_cents,
    currency: p.currency,
    features: (p.features ?? []) as string[],
    popular: p.popular,
    active: p.active,
    sortOrder: p.sort_order,
  };
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/** Anon/publishable client for read-only catalogs (route guards not required). */
function createPublicSupabase(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Connect Supabase in Lovable Cloud.",
    );
  }
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
  });
}

export const getSubscriptionPlans = createServerFn({ method: "POST" }).handler(
  async (): Promise<SubscriptionPlan[]> => {
    const { data, error } = await createPublicSupabase()
      .from("subscription_plans")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPlan);
  },
);

// ---------------------------------------------------------------------------
// Entitlement (what a user can access, derived from what they pay for)
// ---------------------------------------------------------------------------

export type PlanEntitlement = {
  subscriptionId: string | null;
  planId: string | null;
  planSlug: string | null;
  planName: string | null;
  planSortOrder: number | null;
  status: string | null;
  billingPeriod: string | null;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  isPremium: boolean;
};

/**
 * Resolves the caller's current entitlement. Premium = the user's newest
 * subscription references a *paid* plan (Free is $0 and never grants premium)
 * and that subscription still grants access: active / trialing, or
 * canceled/past-due still inside its billing period ("you keep access until
 * the end of your billing period").
 */
export async function getUserEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PlanEntitlement> {
  const { data: rows, error } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, status, billing_period, started_at, current_period_end, canceled_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const sub = rows?.[0] ?? null;

  let plan: Pick<PlanRow, "slug" | "name" | "price_monthly_cents" | "sort_order"> | null = null;
  if (sub) {
    const { data: planRow, error: planError } = await supabase
      .from("subscription_plans")
      .select("slug, name, price_monthly_cents, sort_order")
      .eq("id", sub.plan_id)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    plan = planRow;
  }

  const now = Date.now();
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).getTime()
    : null;
  const paidTier = !!plan && plan.price_monthly_cents > 0;
  const withinPeriod = periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd > now;
  const statusGrantsAccess =
    !!sub &&
    (sub.status === "active" ||
      sub.status === "trialing" ||
      ((sub.status === "canceled" || sub.status === "past_due") && withinPeriod));

  return {
    subscriptionId: sub?.id ?? null,
    planId: sub?.plan_id ?? null,
    planSlug: plan?.slug ?? null,
    planName: plan?.name ?? null,
    planSortOrder: plan ? (plan.sort_order ?? 0) : null,
    status: sub?.status ?? null,
    billingPeriod: sub?.billing_period ?? null,
    startedAt: sub?.started_at ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    canceledAt: sub?.canceled_at ?? null,
    isPremium: statusGrantsAccess && paidTier,
  };
}

// ---------------------------------------------------------------------------
// "My subscription" + plan switching
// ---------------------------------------------------------------------------

export type BillingPeriod = "monthly" | "annual";

export type MySubscription = PlanEntitlement & {
  plan: SubscriptionPlan | null;
};

async function getMySubscriptionData(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MySubscription> {
  const ent = await getUserEntitlement(supabase, userId);
  let plan: SubscriptionPlan | null = null;
  if (ent.planId) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", ent.planId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) plan = mapPlan(data);
  }
  return { ...ent, plan };
}

export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubscription> => {
    const { supabase, userId } = context;
    return getMySubscriptionData(supabase, userId);
  });

export type SubscribeInput = { planSlug: string; billingPeriod?: BillingPeriod };

export const subscribeToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SubscribeInput) => d)
  .handler(async ({ context, data }): Promise<MySubscription> => {
    const { supabase, userId } = context;
    const billingPeriod: BillingPeriod =
      data.billingPeriod === "annual" ? "annual" : "monthly";

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", data.planSlug)
      .eq("active", true)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    if (!plan) throw new Error("That plan isn't available right now.");

    const nowIso = new Date().toISOString();

    // End the previous plan so the swap is atomic (one active row per user).
    const { error: endError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: nowIso })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (endError) throw new Error(endError.message);

    // Free is the downgrade anchor: no billing period to track. Paid plans
    // start immediately and run one full period (simulated checkout).
    let periodEndIso: string | null = null;
    if (plan.slug !== "free") {
      const end = new Date();
      if (billingPeriod === "annual") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      periodEndIso = end.toISOString();
    }

    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      billing_period: billingPeriod,
      started_at: nowIso,
      current_period_end: periodEndIso,
    });
    if (insertError) throw new Error(insertError.message);

    return getMySubscriptionData(supabase, userId);
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubscription> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (error) throw new Error(error.message);
    return getMySubscriptionData(supabase, userId);
  });


