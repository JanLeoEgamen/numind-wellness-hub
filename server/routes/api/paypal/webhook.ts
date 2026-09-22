// PayPal webhook endpoint — receives Billing subscription lifecycle events.
//
// Route: POST /api/paypal/webhook
// Protected by webhook signature verification (verify-webhook-signature REST
// call). Never trust the event payload alone.

import { defineEventHandler, getRequestHeaders, readRawBody, setResponseStatus } from "h3";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import type { PayPalWebhookEvent } from "@/lib/paypal";

const PAYPAL_EVENT_HANDLERS = new Set([
  "PAYMENT.SALE.COMPLETED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.REFUNDED",
]);

/** Upsert a receipt ledger row (idempotent by provider_payment_id). */
async function recordPayment(input: {
  userId: string;
  subscriptionId?: string | null;
  providerPaymentId?: string | null;
  providerSubscriptionId?: string | null;
  amountCents: number;
  currency: string;
  planSlug?: string | null;
  billingPeriod?: string | null;
  status: string;
}) {
  await supabaseAdmin.from("payments").upsert(
    {
      user_id: input.userId,
      subscription_id: input.subscriptionId ?? null,
      provider: "paypal",
      provider_payment_id: input.providerPaymentId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: input.status,
      plan_slug: input.planSlug ?? null,
      billing_period: input.billingPeriod ?? null,
    },
    { onConflict: "provider_payment_id", ignoreDuplicates: true },
  );
}

/** Resolve the local subscription row for a PayPal subscription ID. */
async function findLocalSubscription(providerSubscriptionId: string) {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, plan:subscription_plans(slug)")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();
  return data as
    | {
        id: string;
        user_id: string;
        plan: { slug: string } | null;
      }
    | null;
}

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    setResponseStatus(event, 405);
    return { error: "Method not allowed" };
  }

  const headers = getRequestHeaders(event);
  const rawBody = await readRawBody(event);
  if (!rawBody) {
    setResponseStatus(event, 400);
    return { error: "Missing body" };
  }

  let payload: PayPalWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Invalid JSON" };
  }

  const verified = await verifyPayPalWebhook(rawBody, headers);
  if (!verified) {
    setResponseStatus(event, 401);
    return { error: "Invalid signature" };
  }

  const eventType = payload.event_type ?? "";
  if (!PAYPAL_EVENT_HANDLERS.has(eventType)) {
    return { received: true, ignored: eventType };
  }

  const resource = payload.resource ?? {};
  const providerSubscriptionId = String(
    resource["id"] ?? resource["subscription_id"] ?? "",
  );

  try {
    if (eventType === "PAYMENT.SALE.COMPLETED" && resource["id"]) {
      const amount = resource["amount"];
      const amountCents = amount
        ? Math.round(parseFloat(String(amount["value"] ?? "0")) * 100)
        : 0;
      const currency = String(amount?.["currency_code"] ?? "USD");

      if (providerSubscriptionId) {
        const existing = await findLocalSubscription(providerSubscriptionId);
        if (existing) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "active", started_at: new Date().toISOString() })
            .eq("id", existing.id)
            .eq("status", "pending");
          await recordPayment({
            userId: existing.user_id,
            subscriptionId: existing.id,
            providerPaymentId: String(resource["id"]),
            providerSubscriptionId,
            amountCents,
            currency,
            planSlug: existing.plan?.slug ?? null,
            status: "completed",
          });
        }
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" && providerSubscriptionId) {
      const existing = await findLocalSubscription(providerSubscriptionId);
      if (existing) {
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("billing_period")
          .eq("id", existing.id)
          .maybeSingle();
        const billing = sub?.billing_period ?? "monthly";
        const end = new Date();
        if (billing === "annual") end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "active", current_period_end: end.toISOString() })
          .eq("id", existing.id);
      }
    }

    if (
      (eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
        eventType === "BILLING.SUBSCRIPTION.EXPIRED") &&
      providerSubscriptionId
    ) {
      const existing = await findLocalSubscription(providerSubscriptionId);
      if (existing) {
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: eventType === "BILLING.SUBSCRIPTION.CANCELLED" ? "canceled" : "expired",
            canceled_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    }

    if (
      (eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
        eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") &&
      providerSubscriptionId
    ) {
      const existing = await findLocalSubscription(providerSubscriptionId);
      if (existing) {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("id", existing.id);
      }
    }

    if (eventType === "PAYMENT.SALE.REFUNDED" && resource["id"]) {
      await recordPayment({
        userId: "",
        providerPaymentId: String(resource["id"]),
        amountCents: 0,
        currency: "USD",
        status: "refunded",
      });
    }
  } catch (err) {
    console.error("[PayPal webhook] handler error", err);
    setResponseStatus(event, 500);
    return { error: "Internal error" };
  }

  return { received: true };
});

