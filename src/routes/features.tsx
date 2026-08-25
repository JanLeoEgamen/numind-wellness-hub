import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteChrome";
import { SoftCard, CTALink } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — NuMind" },
      { name: "description", content: "Mind Gym, Healthy Play, Journal, Learning Lounge, Garden, Quests, Numi and more." },
      { property: "og:title", content: "Features — NuMind" },
      { property: "og:description", content: "Mind Gym, Healthy Play, Journal, Learning Lounge, Garden, Quests, Numi and more." },
    ],
  }),
  component: FeaturesPage,
});

const GROUPS = [
  { title: "Every day", items: [["Sun","Daily Reset","One minute, four questions, one intention."],["Droplets","My Wellness","Water, sleep, movement and self-care with your own goals."],["Zap","Focus Zone","Timer, top three, brain dump and task breakdowns."]] },
  { title: "Grow", items: [["Brain","Mind Gym","Short guided activities for breath, focus and calm."],["GraduationCap","Learning Lounge","Bite-sized wellness lessons and quick tips."],["BookOpen","My Journal","Brain dumps, gratitude, wins and letters to future you."]] },
  { title: "Play & progress", items: [["Trophy","Wellness Quest","Daily, weekly, monthly and seasonal missions."],["Gamepad2","Healthy Play","Trivia, bubbles, bingo and the wellness wheel."],["Sprout","Wellness Garden","Watch your progress grow from seed to sanctuary."],["Gift","Rewards","Spend XP on decorations, themes and Numi accessories."],["Flower2","Memory Lane","Look how far you've come."],["Heart","Together","A positive-only community."]] },
];

function FeaturesPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-extrabold">Everything you need to feel your best</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Twelve connected experiences — finish one and everything else moves forward.</p>
        {GROUPS.map((g) => (
          <section key={g.title} className="mt-12">
            <h2 className="text-2xl font-bold">{g.title}</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(([e, n, d]) => (
                <li key={n}>
                  <SoftCard interactive className="h-full">
                    <p className="text-3xl" aria-hidden>
                    <Icon symbol={e} size={32} />
                  </p>
                    <h3 className="mt-3 text-lg font-bold">{n}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                  </SoftCard>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="mt-12"><CTALink to="/app">Explore the app</CTALink></div>
      </div>
    </SiteLayout>
  );
}
