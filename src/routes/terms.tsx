import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteChrome";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — NuMind" },
      { name: "description", content: "The terms for using NuMind, including subscriptions and community rules." },
      { property: "og:title", content: "Terms — NuMind" },
      { property: "og:description", content: "The terms for using NuMind, including subscriptions and community rules." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Terms</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated 13 August 2026 · Placeholder copy for design review.</p>
        <div className="mt-8 grid gap-6 text-sm leading-relaxed text-muted-foreground">
          <section key="0"><h2 className="text-lg font-bold text-foreground">Using NuMind</h2><p className="mt-2">NuMind is for personal wellness and growth. You are responsible for how you use it.</p></section><section key="1"><h2 className="text-lg font-bold text-foreground">Not medical advice</h2><p className="mt-2">NuMind and Numi do not provide medical advice, diagnosis or treatment. Contact a qualified professional for health concerns.</p></section><section key="2"><h2 className="text-lg font-bold text-foreground">Subscriptions</h2><p className="mt-2">Plans renew until cancelled. Cancel anytime and keep access until the end of the period.</p></section><section key="3"><h2 className="text-lg font-bold text-foreground">Community rules</h2><p className="mt-2">Together is a positive-only space. Harassment, medical advice and contact details are not allowed.</p></section>
        </div>
      </div>
    </SiteLayout>
  );
}
