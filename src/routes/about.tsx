import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteChrome";
import { SoftCard } from "@/components/numind/ui-kit";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About NuMind" },
      { name: "description", content: "Why we built a warm, gamified wellness companion instead of another clinical dashboard." },
      { property: "og:title", content: "About NuMind" },
      { property: "og:description", content: "Why we built a warm, gamified wellness companion instead of another clinical dashboard." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Every small step counts</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          NuMind helps you see how far you've come. We built it because most wellness tools either feel clinical or
          disappear after a week. NuMind is warm, playful and quietly consistent.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[["🌱","Small steps","One minute is a real thing."],["💛","No guilt","Missed days are just days."],["🎉","Celebrate","Progress deserves confetti."]].map(([e, t, d]) => (
            <SoftCard key={t}>
              <p className="text-3xl" aria-hidden>{e}</p>
              <p className="mt-2 font-bold">{t}</p>
              <p className="text-sm text-muted-foreground">{d}</p>
            </SoftCard>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          NuMind is a consumer wellness and personal-growth product. It is not a medical device and does not provide
          diagnosis or treatment.
        </p>
      </div>
    </SiteLayout>
  );
}
