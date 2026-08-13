import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteChrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — NuMind" },
      { name: "description", content: "How NuMind handles your data, your journal and your privacy controls." },
      { property: "og:title", content: "Privacy — NuMind" },
      { property: "og:description", content: "How NuMind handles your data, your journal and your privacy controls." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Privacy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated 13 August 2026 · Placeholder copy for design review.</p>
        <div className="mt-8 grid gap-6 text-sm leading-relaxed text-muted-foreground">
          <section key="0"><h2 className="text-lg font-bold text-foreground">What we collect</h2><p className="mt-2">Account details, the activities you complete and the preferences you set. Journal entries are private to you.</p></section><section key="1"><h2 className="text-lg font-bold text-foreground">What we never do</h2><p className="mt-2">We do not sell your data, we do not show your journal or Numi conversations to anyone, and we do not use them as marketing analytics.</p></section><section key="2"><h2 className="text-lg font-bold text-foreground">Your controls</h2><p className="mt-2">Export or delete your data at any time from Settings &gt; Privacy.</p></section><section key="3"><h2 className="text-lg font-bold text-foreground">Not a medical record</h2><p className="mt-2">NuMind is a consumer wellness product. It does not store clinical records or share information with healthcare providers.</p></section>
        </div>
      </div>
    </SiteLayout>
  );
}
