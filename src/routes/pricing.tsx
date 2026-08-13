import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PLANS } from "@/lib/mock-data";
import { SiteLayout, PricingCards } from "@/components/layout/SiteChrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — NuMind" },
      { name: "description", content: "Free, NuMind+ and NuMind Premium. Monthly or annual, cancel anytime." },
      { property: "og:title", content: "Pricing — NuMind" },
      { property: "og:description", content: "Free, NuMind+ and NuMind Premium. Monthly or annual, cancel anytime." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Simple pricing</h1>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when NuMind earns it.</p>
        <div className="mt-6 inline-flex rounded-full bg-muted p-1">
          {[false, true].map((a) => (
            <button key={String(a)} onClick={() => setAnnual(a)} aria-pressed={annual === a} className={cn("focus-ring rounded-full px-5 py-2 text-sm font-semibold", annual === a ? "bg-brand text-navy" : "")}>
              {a ? "Annual · save 25%" : "Monthly"}
            </button>
          ))}
        </div>
        <div className="mt-8"><PricingCards annual={annual} plans={PLANS} /></div>
        <p className="mt-8 text-xs text-muted-foreground">Prices shown are examples and will be configurable per region at launch.</p>
      </div>
    </SiteLayout>
  );
}
