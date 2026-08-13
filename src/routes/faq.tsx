import { createFileRoute } from "@tanstack/react-router";
import { FAQS } from "@/lib/mock-data";
import { SiteLayout } from "@/components/layout/SiteChrome";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — NuMind" },
      { name: "description", content: "Answers about Numi, the garden, privacy, streaks and subscriptions." },
      { property: "og:title", content: "FAQ — NuMind" },
      { property: "og:description", content: "Answers about Numi, the garden, privacy, streaks and subscriptions." },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Questions, answered</h1>
        <ul className="mt-8 grid gap-3">
          {FAQS.map((f) => (
            <li key={f.q}>
              <details className="card-soft p-5">
                <summary className="focus-ring cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  );
}
