// PayPal billing integration — server-only module.
//
// IMPORTANT: this module reads `process.env` (PAYPAL_CLIENT_ID /
// PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID / PAYPAL_ENV) and talks to the
// PayPal REST API, so it must only be imported from server-side code (server
// functions, Nitro route handlers, other .server modules). Never import it
// from a route or component that ships to the client.

export type PayPalEnvironment = "sandbox" | "live";

function paypalBaseUrl(): string {
  return (process.env["PAYPAL_ENV"] ?? "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured(): boolean {
  return Boolean(
    process.env["PAYPAL_CLIENT_ID"] && process.env["PAYPAL_CLIENT_SECRET"],
  );
}

type PayPalTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getTokenRaw(): Promise<string> {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!clientId || !secret) {
    throw new Error("PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const basic = btoa(`${clientId}:${secret}`); // Worker-safe (global btoa)

  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as PayPalTokenResponse;
  if (!data.access_token) throw new Error("PayPal auth returned no access token.");
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs - 60_000 };
  return data.access_token;
}

export async function getPayPalAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  return getTokenRaw();
}

// ---------------------------------------------------------------------------
// Product / billing plan / subscription
// ---------------------------------------------------------------------------

export type PaypalSubscriptionPlan = {
  slug: string;
  name: string;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  currency: string;
};

type PayPalJson = Record<string, unknown>;

async function paypalFetch(path: string, init: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}): Promise<{ ok: boolean; status: number; data: PayPalJson }> {
  const token = await getPayPalAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };
  const hasBody = init.body !== undefined;
  const res = await fetch(`${paypalBaseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
  });
  let data: PayPalJson = {};
  try {
    data = (await res.json()) as PayPalJson;
  } catch {
    // Non-JSON body (e.g. empty 204) — keep {}. Fine for callers reading fields.
  }
  return { ok: res.ok, status: res.status, data };
}

function toPayPalMoney(cents: number, currency: string): { currency_code: string; value: string } {
  return { currency_code: currency, value: (cents / 100).toFixed(2) };
}

/**
 * Ensures the NuMind product exists for the merchant, creating it once per
 * environment (idempotent by name).
 */
export async function ensurePayPalProduct(plan: PaypalSubscriptionPlan): Promise<PayPalJson> {
  const token = await getPayPalAccessToken();
  const mk = () =>
    fetch(`${paypalBaseUrl()}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `NuMind ${plan.slug}`,
        description: `NuMind ${plan.name} subscription`,
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    });
  const first = await mk();
  const body = (await first.json()) as PayPalJson;
  if (first.ok) return body as PayPalJson;
  // 409 / PRODUCT_EXISTS: reuse the existing product across plan names.
  const list = await paypalFetch("/v1/catalogs/products?page_size=50");
  const existing = (list.data["products"] as PayPalJson[] | undefined)
    ?.find((p) => p["name"] === `NuMind ${plan.slug}`);
  if (existing) return existing as PayPalJson;
  return body as PayPalJson;
}

/**
 * Creates (or reuses) an ACTIVE PayPal billing plan for a NuMind plan +
 * billing period. Monthly plans bill every month; annual every 12 months.
 */
export async function ensurePayPalPlan(
  plan: PaypalSubscriptionPlan,
  billingPeriod: "monthly" | "annual",
): Promise<PayPalJson> {
  const product = await ensurePayPalProduct(plan);
  const productId = product["id"] as string;
  const now = new Date();
  const name = `${plan.name} · ${billingPeriod === "annual" ? "Annual" : "Monthly"} ${now.toISOString().slice(0, 10)}`;

  const create = await paypalFetch("/v1/billing/plans", {
    method: "POST",
    body: {
      product_id: productId,
      name,
      description: `NuMind ${plan.name} — ${billingPeriod} billing via PayPal`,
      billing_cycles: [
        {
          frequency: billingPeriod === "annual"
            ? { interval_unit: "MONTH", interval_count: 12 }
            : { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: toPayPalMoney(
              billingPeriod === "annual" ? plan.priceAnnualCents : plan.priceMonthlyCents,
              plan.currency,
            ),
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
        setup_fee_failure_action: "CONTINUE",
      },
      taxes: { percentage: "0", inclusive: false },
    },
  });

  if (create.ok && create.data["id"]) {
    // Activate the plan (plans are created in CREATED state).
    await paypalFetch(`/v1/billing/plans/${create.data["id"]}/activate`, { method: "POST" });
    return create.data as PayPalJson;
  }
  throw new Error(
    `Could not create PayPal plan: ${create.status} ${JSON.stringify(create.data).slice(0, 300)}`,
  );
}


export type CreatePaypalSubscriptionResult = {
  id: string;
  status: string;
  approveUrl: string | null;
};

/**
 * Creates a PayPal subscription for a plan/period and returns the approval URL.
 */
export async function createPaypalSubscription(
  plan: PaypalSubscriptionPlan,
  billingPeriod: "monthly" | "annual",
  opts: { customId?: string; returnUrl: string; cancelUrl: string },
): Promise<CreatePaypalSubscriptionResult> {
  const planObj = await ensurePayPalPlan(plan, billingPeriod);
  const planId = planObj["id"] as string;
  const res = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: {
      plan_id: planId,
      custom_id: opts.customId ?? `${plan.slug}:${billingPeriod}`,
      application_context: {
        brand_name: "NuMind",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: { payer_selected: "PAYPAL", payee_preferred: "UNRESTRICTED" },
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    },
  });
  if (!res.ok || !res.data["id"]) {
    throw new Error(
      `Could not create PayPal subscription: ${res.status} ${JSON.stringify(res.data).slice(0, 300)}`,
    );
  }
  const links = (res.data["links"] as PayPalJson[] | undefined) ?? [];
  const approve = links.find((l) => l["rel"] === "approve");
  return {
    id: res.data["id"] as string,
    status: (res.data["status"] as string) ?? "UNKNOWN",
    approveUrl: (approve?.["href"] as string) ?? null,
  };
}

export async function getPayPalSubscription(
  providerSubscriptionId: string,
): Promise<PayPalJson> {
  const res = await paypalFetch(`/v1/billing/subscriptions/${providerSubscriptionId}`);
  if (!res.ok) {
    throw new Error(
      `Could not fetch PayPal subscription: ${res.status} ${JSON.stringify(res.data).slice(0, 300)}`,
    );
  }
  return res.data as PayPalJson;
}

export async function cancelPayPalSubscription(
  providerSubscriptionId: string,
): Promise<void> {
  const res = await paypalFetch(`/v1/billing/subscriptions/${providerSubscriptionId}/cancel`, {
    method: "POST",
    body: { reason: "Cancelled by customer on NuMind" },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(
      `Could not cancel PayPal subscription: ${res.status} ${JSON.stringify(res.data).slice(0, 300)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Webhook signature verification (server-to-server, official best practice)
// ---------------------------------------------------------------------------

export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    status?: string;
    billing_info?: PayPalJson;
    amount?: PayPalJson;
    subscription_id?: string;
    parent_payment?: string;
  } & PayPalJson;
  create_time?: string;
  summary?: string;
};

export async function verifyPayPalWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<boolean> {
  if (!paypalConfigured() || !process.env["PAYPAL_WEBHOOK_ID"]) return false;

  const transmissionId = headers["paypal-transmission-id"];
  const transmissionTime = headers["paypal-transmission-time"];
  const authAlgo = headers["paypal-auth-algo"];
  const certUrl = headers["paypal-cert-url"];
  const transmissionSig = headers["paypal-transmission-sig"];
  if (!transmissionId || !transmissionTime || !authAlgo || !certUrl || !transmissionSig) {
    return false;
  }

  let webhookEvent: PayPalWebhookEvent;
  try {
    webhookEvent = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return false;
  }

  const res = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: process.env["PAYPAL_WEBHOOK_ID"],
      webhook_event: webhookEvent,
    },
    headers: { "Content-Type": "application/json" },
  });
  return res.data["verification_status"] === "SUCCESS";
}

export const PAYPAL_WEBHOOK_EVENTS = [
  "PAYMENT.SALE.COMPLETED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.REFUNDED",
] as const;

