import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PLANS } from "@/lib/mock-data";
import { SiteLayout, PricingCards } from "@/components/layout/SiteChrome";
import {
  useSubscriptionPlans,
  useMySubscription,
  useSubscribeToPlan,
  useCreatePaypalCheckout,
  useConfirmPaypalSubscription,
} from "@/lib/server-data";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — NuMind" },
      { name: "description", content: "Free, NuMind Plus and Wellness Champion. Monthly or annual, cancel anytime." },
      { property: "og:title", content: "Pricing — NuMind" },
      { property: "og:description", content: "Free, NuMind Plus and Wellness Champion. Monthly or annual, cancel anytime." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const plansQuery = useSubscriptionPlans();
  const mySub = useMySubscription(isAuthenticated);
  const subscribe = useSubscribeToPlan();
  const paypalCheckout = useCreatePaypalCheckout();
  const confirmPayPal = useConfirmPaypalSubscription();

  // Handles the PayPal return URL: /pricing?paypal=success or =cancelled.
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const pp = params.get("paypal");
    if (!pp) return;

    if (pp === "success") {
      // The PayPal subscription id is not in the query by default; rely on the
      // pending row + the webhook. Trigger a refresh so entitlement updates.
      toast.success("Payment approved! Activating your plan…");
      confirmPayPal.mutate("", {
        onSuccess: (res) => {
          if (res.ok) toast.success("Your plan is active!");
          else toast.error("Your plan could not be confirmed yet. It will activate shortly if payment was received.");
        },
        onError: () => toast.error("Could not confirm your subscription yet. It will activate shortly."),
      });
    } else {
      toast.info("Checkout cancelled — your plan is unchanged.");
    }
    // Clear the query param.
    window.history.replaceState({}, "", "/pricing");
  }, [isAuthenticated, confirmPayPal]);

  const plans = plansQuery.data && plansQuery.data.length ? plansQuery.data : PLANS;
  const currentPlanSlug = !loading && isAuthenticated ? (mySub.data?.planSlug ?? null) : null;

  const handleChoose = (slug: string) => {
    if (!isAuthenticated) {
      navigate({ to: "/signup" });
      return;
    }
    const plan = plans.find((p) => p.slug === slug);
    if (plan && plan.monthlyCents > 0) {
      // Paid plan → PayPal checkout flow.
      paypalCheckout.mutate(
        { planSlug: slug, billingPeriod: annual ? "annual" : "monthly" },
        {
          onSuccess: (res) => {
            window.location.href = res.approvalUrl;
          },
          onError: (e) => toast.error(e.message),
        },
      );
      return;
    }
    // Free plan → instant switch.
    subscribe.mutate(
      { planSlug: slug, billingPeriod: annual ? "annual" : "monthly" },
      {
        onSuccess: (saved) => {
          toast.success(saved.plan?.slug === "free" ? "You're now on the Free plan." : `Welcome to ${saved.plan?.name}!`);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Simple pricing</h1>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when NuMind earns it.</p>

        {isAuthenticated && currentPlanSlug ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-mint/40 px-3 py-1 font-semibold">
              Current plan: {mySub.data?.plan?.name ?? "Free"}
            </span>
            <span className="text-muted-foreground">
              {mySub.data?.isPremium
                ? "Premium features are unlocked. Visit Settings to manage your subscription."
                : "Upgrade anytime to unlock NuMind Plus features."}
            </span>
            <Link to="/app/settings" className="focus-ring font-semibold underline underline-offset-2">
              Manage in Settings →
            </Link>
          </p>
        ) : null}

        <div className="mt-6 inline-flex rounded-full bg-muted p-1">
          {[false, true].map((a) => (
            <button key={String(a)} onClick={() => setAnnual(a)} aria-pressed={annual === a} className={cn("focus-ring rounded-full px-5 py-2 text-sm font-semibold", annual === a ? "bg-brand text-navy" : "")}>
              {a ? "Annual · save up to 28%" : "Monthly"}
            </button>
          ))}
        </div>
        <div className="mt-8">
          <PricingCards
            annual={annual}
            plans={plans}
            currentPlanSlug={currentPlanSlug}
            onChoose={handleChoose}
          />
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Prices are configured in the <Link to="/admin" className="focus-ring underline underline-offset-2">admin catalog</Link>, billed securely with PayPal.
        </p>
      </div>
    </SiteLayout>
  );
}
