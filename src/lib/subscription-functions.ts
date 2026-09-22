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
import {
  createPaypalSubscription,
  getPayPalSubscription,
  cancelPayPalSubscription,
  paypalConfigured,
} from "@/lib/paypal";

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
  /** Which PSP manages this row; only PayPal rows are strictly time-bound. */
  provider: string | null;
  isPremium: boolean;
};

/**
 * Resolves the caller's current entitlement. Premium = the user's newest
 * subscription references a *paid* plan (Free is $0 and never grants premium)
 * and that subscription still grants access: active / trialing, or
 * canceled/past-due still inside its billing period ("you keep access until
 * the end of your billing period").
 *
 * Provider-managed rows (PayPal) are additionally time-bound: access lapses
 * once `current_period_end` passes, so a dropped renewal webhook can never
 * extend premium indefinitely. Rows with no provider are manual/admin grants
 * and remain status-driven.
 */
export async function getUserEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PlanEntitlement> {
  const { data: rows, error } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, status, billing_period, started_at, current_period_end, canceled_at, provider, created_at",
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

  // Access tolerates brief webhook/cron lag so a slightly late renewal can't
  // momentarily cut a paying user off.
  const graceMs = 48 * 60 * 60 * 1000;
  const hasExpiry = periodEnd !== null && !Number.isNaN(periodEnd);
  const withinPeriod = hasExpiry && periodEnd + graceMs > now;
  const activeLike = sub?.status === "active" || sub?.status === "trialing";

  // Only provider-managed rows (PayPal) are strictly time-bound: a renewal
  // webhook that never arrives must not extend access. Rows without a provider
  // are manual/admin grants and keep their original status-driven behaviour.
  const providerManaged = sub?.provider === "paypal";
  const statusGrantsAccess =
    !!sub &&
    (activeLike
      ? !providerManaged || !hasExpiry || withinPeriod
      : (sub.status === "canceled" || sub.status === "past_due") && withinPeriod);

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
    provider: sub?.provider ?? null,
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

    // Paid plans must be purchased through PayPal (the pricing page routes them
    // via createPaypalCheckout). This server fn only handles the instant Free
    // switch (and the pre-PayPal dev fallback below when unconfigured).
    if (plan.slug !== "free" && paypalConfigured()) {
      throw new Error("Paid plans are purchased via PayPal checkout.");
    }

    const nowIso = new Date().toISOString();

    // End the previous plan so the swap is atomic (one active row per user).
    const { error: endError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: nowIso })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (endError) throw new Error(endError.message);

    // Free is the downgrade anchor: no billing period to track. Paid plans use
    // the PayPal checkout path (createPaypalCheckout) once PayPal is configured;
    // this simulated upgrade remains as a dev/pre-launch fallback.
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

function subscriptionUrls(): { returnUrl: string; cancelUrl: string } {
  const origin =
    typeof process !== "undefined" && process.env["NITRO_ORIGIN"]
      ? process.env["NITRO_ORIGIN"]
      : "http://localhost:5173";
  return {
    returnUrl: `${origin}/pricing?paypal=success`,
    cancelUrl: `${origin}/pricing?paypal=cancelled`,
  };
}

/** Shared checkout creation used by the server fn. Creates a PayPal
 *  subscription, parks a `pending` local row, and returns the approval URL. */
async function createPaypalCheckoutData(
  supabase: SupabaseClient<Database>,
  userId: string,
  plan: PlanRow,
  billingPeriod: BillingPeriod,
): Promise<{ approvalUrl: string; subscriptionId: string }> {
  const urls = subscriptionUrls();
  const result = await createPaypalSubscription(
    {
      slug: plan.slug,
      name: plan.name,
      priceMonthlyCents: plan.price_monthly_cents,
      priceAnnualCents: plan.price_annual_cents,
      currency: plan.currency,
    },
    billingPeriod,
    { customId: `${userId}:${plan.slug}:${billingPeriod}`, returnUrl: urls.returnUrl, cancelUrl: urls.cancelUrl },
  );
  if (!result.approveUrl) throw new Error("PayPal did not return an approval link.");

  // Cancel any previous active row, then park the new subscription in 'pending'
  // so it never conflicts with the single-active-row index until approved.
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);

  const { error: insertError } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_id: plan.id,
    status: "pending",
    billing_period: billingPeriod,
    started_at: new Date().toISOString(),
    current_period_end: null,
    provider: "paypal",
    provider_subscription_id: result.id,
  });
  if (insertError) throw new Error(insertError.message);

  return { approvalUrl: result.approveUrl, subscriptionId: result.id };
}

export type CreatePaypalCheckoutInput = { planSlug: string; billingPeriod?: BillingPeriod };
export type CreatePaypalCheckoutResult = { approvalUrl: string; subscriptionId: string };

export const createPaypalCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: CreatePaypalCheckoutInput) => d)
  .handler(async ({ context, data }): Promise<CreatePaypalCheckoutResult> => {
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
    if (plan.slug === "free") throw new Error("The Free plan needs no checkout.");

    return createPaypalCheckoutData(supabase, userId, plan, billingPeriod);
  });

export type ConfirmPaypalInput = { providerSubscriptionId?: string | null };

type PaypalPendingRow = {
  id: string;
  plan_id: string;
  status: string;
  billing_period: string;
  provider_subscription_id: string | null;
  plan: {
    slug: string;
    name: string;
    price_monthly_cents: number;
    price_annual_cents: number;
    currency: string;
  } | null;
};

export const confirmPaypalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: ConfirmPaypalInput) => d)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabase, userId } = context;
    const select =
      "id, plan_id, status, billing_period, provider_subscription_id, plan:subscription_plans(slug, name, price_monthly_cents, price_annual_cents, currency)";

    // Resolve the latest PayPal subscription row for this user (by specific id
    // if supplied, otherwise fall back to the newest pending row).
    const base = supabase.from("subscriptions").select(select).eq("user_id", userId).eq("provider", "paypal");
    let pending: PaypalPendingRow | null = null;

    if (data.providerSubscriptionId) {
      const { data: row } = await base
        .eq("provider_subscription_id", data.providerSubscriptionId)
        .maybeSingle();
      pending = row as PaypalPendingRow | null;
    } else {
      const { data: rows } = await base.in("status", ["pending", "active"]).order("created_at", { ascending: false }).limit(1);
      pending = (rows?.[0] ?? null) as PaypalPendingRow | null;
    }

    if (!pending) throw new Error("No pending PayPal subscription found.");
    if (pending.status === "active") return { ok: true };

    const providerSubscriptionId = pending.provider_subscription_id;
    if (!providerSubscriptionId) throw new Error("Missing PayPal subscription id.");

    // Belt-and-suspenders: ask PayPal for the canonical state (the webhook also
    // updates this, but the user may return before the webhook lands).
    const paypalSub = await getPayPalSubscription(providerSubscriptionId);
    const status = String(paypalSub["status"] ?? "").toUpperCase();
    const approved = status === "ACTIVE" || status === "APPROVED";

    const plan = (pending.plan ?? null) as unknown as {
      slug: string | null;
      name: string | null;
      price_monthly_cents: number | null;
      price_annual_cents: number | null;
      currency: string | null;
    } | null;

    if (approved) {
      const nowIso = new Date().toISOString();
      const billing = pending.billing_period ?? "monthly";
      let periodEndIso: string | null = null;
      if (plan && plan.slug !== "free") {
        const end = new Date();
        if (billing === "annual") end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);
        periodEndIso = end.toISOString();
      }

      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "active", current_period_end: periodEndIso, started_at: nowIso })
        .eq("id", pending.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);

      // Record the receipt if the webhook hasn't already.
      try {
        await supabase.from("payments").insert({
          user_id: userId,
          subscription_id: pending.id,
          provider: "paypal",
          provider_subscription_id: providerSubscriptionId,
          amount_cents:
            billing === "annual"
              ? plan?.price_annual_cents ?? 0
              : plan?.price_monthly_cents ?? 0,
          currency: plan?.currency ?? "USD",
          status: "completed",
          plan_slug: plan?.slug ?? null,
          billing_period: billing,
        });
      } catch {
        // Duplicate receipt (unique provider_payment_id) — fine.
      }
      return { ok: true };
    }

    return { ok: false };
  });



export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubscription> => {
    const { supabase, userId } = context;

    // If the active subscription is a real PayPal one, cancel it at the source
    // so auto-renewal stops (access remains until the end of the billing period).
    const { data: active } = await supabase
      .from("subscriptions")
      .select("id, provider_subscription_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    let paidCancelError: Error | null = null;
    if (active?.provider_subscription_id) {
      try {
        await cancelPayPalSubscription(active.provider_subscription_id);
      } catch (err) {
        paidCancelError = err instanceof Error ? err : new Error("Could not cancel the PayPal subscription.");
      }
    }

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);
    if (error) throw new Error(error.message);

    // Surface PayPal failures but still keep the local cancellation intact.
    if (paidCancelError) throw paidCancelError;
    return getMySubscriptionData(supabase, userId);
  });


