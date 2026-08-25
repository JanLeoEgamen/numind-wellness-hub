import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SoftCard, ToneIcon, DisclaimerNote } from "@/components/numind/ui-kit";

export const Route = createFileRoute("/app/safety")({
  head: () => ({
    meta: [
      { title: "Safety Center — NuMind" },
      { name: "description", content: "Calming exercises and configurable support resources, whenever you need a hand." },
      { property: "og:title", content: "Safety Center — NuMind" },
      { property: "og:description", content: "Calming exercises and configurable support resources, whenever you need a hand." },
    ],
  }),
  component: SafetyPage,
});

const TOOLS = [
  { emoji: "Hand", name: "5-4-3-2-1 Grounding", desc: "Come back to the room, one sense at a time.", tone: "mint" },
  { emoji: "Wind", name: "Slow Breathing", desc: "In for 4, hold 4, out for 6. Three minutes.", tone: "teal" },
  { emoji: "Coffee", name: "Calming Exercise", desc: "A short, gentle sequence to settle.", tone: "lavender" },
];

function SafetyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader emoji="LifeBuoy" title="Need Help?" subtitle="A calm place to pause. Take what's useful, leave the rest." />

      <ul className="grid gap-3 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <li key={t.name}>
            <SoftCard interactive className="h-full">
              <ToneIcon emoji={t.emoji} tone={t.tone} />
              <p className="mt-3 font-semibold">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
              <button className="focus-ring mt-4 w-full rounded-full bg-muted py-2.5 text-sm font-semibold">Begin</button>
            </SoftCard>
          </li>
        ))}
      </ul>

      <SoftCard className="mt-6">
        <h2 className="font-bold">Support resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These placeholders can be configured per region before launch.
        </p>
        <ul className="mt-4 grid gap-2 text-sm">
          <li className="rounded-2xl bg-muted/60 px-4 py-3">Local emergency number — [configurable]</li>
          <li className="rounded-2xl bg-muted/60 px-4 py-3">Regional support line — [configurable]</li>
          <li className="rounded-2xl bg-muted/60 px-4 py-3">Text-based support service — [configurable]</li>
        </ul>
      </SoftCard>

      <div className="mt-6">
        <DisclaimerNote>
          NuMind is a consumer wellness app. It does not monitor you, does not contact anyone on your behalf and does
          not provide medical care. If you need urgent help, please contact local emergency services.
        </DisclaimerNote>
      </div>
    </div>
  );
}
