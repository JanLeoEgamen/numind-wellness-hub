import { createFileRoute, Link } from "@tanstack/react-router";
import { FAQS, GARDEN_STAGES, PLANS, PLAY_ACTIVITIES } from "@/lib/mock-data";
import { SiteLayout, PricingCards } from "@/components/layout/SiteChrome";
import { NumiAvatar, SoftCard, ToneIcon } from "@/components/numind/ui-kit";
import { Icon } from "@/components/numind/icon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NuMind — Reset Your Mind. Focus Your Day. Grow Your Life." },
      { name: "description", content: "Your everyday wellness companion for a healthier mind, stronger habits and better days." },
      { property: "og:title", content: "NuMind — Reset Your Mind. Focus Your Day. Grow Your Life." },
      { property: "og:description", content: "Your everyday wellness companion for a healthier mind, stronger habits and better days." },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  { emoji: "Sun", name: "Daily Reset", desc: "A one-minute ritual to start the day on your side.", tone: "sun" },
  { emoji: "Brain", name: "Mind Gym", desc: "Short breathing, focus and calm sessions.", tone: "teal" },
  { emoji: "Trophy", name: "Wellness Quest", desc: "Missions that make good habits feel like a game.", tone: "lavender" },
  { emoji: "Gamepad2", name: "Healthy Play", desc: "Trivia, bubbles and bingo that still count.", tone: "coral" },
  { emoji: "Bot", name: "Numi AI", desc: "A companion that motivates and celebrates.", tone: "cyan" },
  { emoji: "Sprout", name: "Wellness Garden", desc: "Your progress, growing where you can see it.", tone: "mint" },
];

const FEATURES = [
  ["Brain","Mind Gym"],["Gamepad2","Healthy Play"],["BookOpen","My Journal"],["GraduationCap","Learning Lounge"],
  ["Flower2","Memory Lane"],["Sparkles","My Journey"],["Gift","Rewards"],["Heart","Together"],
  ["Droplets","My Wellness"],["Zap","Focus Zone"],["Trophy","Wellness Quest"],["Sprout","My Garden"],
];

function Landing() {
  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex rounded-full bg-surface px-4 py-1.5 text-xs font-bold shadow-soft">Reset • Focus • Grow</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Reset Your Mind.<br />Focus Your Day.<br /><span className="text-brand">Grow Your Life.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Your everyday wellness companion for a healthier mind, stronger habits and better days.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/signup" className="focus-ring rounded-full bg-brand px-7 py-3.5 text-base font-bold text-navy shadow-glow">Get started free</Link>
              <Link to="/app" className="focus-ring rounded-full border border-border bg-surface px-7 py-3.5 text-base font-semibold">Explore NuMind</Link>
            </div>
          </div>
          <div className="relative grid place-items-center">
            <div className="animate-float w-[280px] rounded-[2.5rem] border-8 border-navy bg-background p-4 shadow-lift dark:border-surface-2">
              <p className="text-sm font-bold">
              <Icon symbol="Sun" size={16} className="mr-1 inline-block align-[-2px]" /> Good morning, Sarah!
            </p>
              <div className="mt-3 rounded-3xl bg-garden p-4 text-center">
                <p className="text-4xl" aria-hidden>
                  <Icon symbol="Trees" size={36} className="text-mint" />
                </p>
                <p className="mt-1 text-xs font-semibold">Your garden is Thriving</p>
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                <p className="rounded-2xl bg-muted px-3 py-2.5">
                  <Icon symbol="Sun" size={14} className="mr-1 inline-block align-[-2px]" /> Daily Reset · +20 XP
                </p>
                <p className="rounded-2xl bg-muted px-3 py-2.5">
                  <Icon symbol="Brain" size={14} className="mr-1 inline-block align-[-2px]" /> Mind Gym · +20 XP
                </p>
                <p className="rounded-2xl bg-teal/20 px-3 py-2.5 font-semibold">
                  <Icon symbol="Flame" size={14} fill className="mr-1 inline-block align-[-2px] text-coral" /> 12-day streak
                </p>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-2 hidden sm:block"><NumiAvatar size={72} className="animate-float" /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold">What is NuMind?</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Six everyday experiences that fit into real life — most take a minute or two.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <li key={p.name}>
              <SoftCard interactive className="h-full">
                <ToneIcon emoji={p.emoji} tone={p.tone} size="lg" />
                <h3 className="mt-4 text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </SoftCard>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface-2/40 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Your everyday wellness companion</h2>
            <p className="mt-3 text-muted-foreground">
              NuMind turns small steps into visible progress — XP, streaks, badges and a garden that grows with you.
              No guilt, no homework, no clinical dashboards.
            </p>
            <Link to="/features" className="focus-ring mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-navy">See everything</Link>
          </div>
          <div className="rounded-4xl bg-hero p-8 text-center">
            <p className="text-6xl" aria-hidden>
              <Icon symbol="Smartphone" size={56} />
            </p>
            <p className="mt-3 text-sm text-muted-foreground">One calm home screen, everything connected.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold">Everything you need to feel your best</h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FEATURES.map(([e, n]) => (
            <li key={n} className="card-soft hover-lift p-5 text-center">
              <p className="text-3xl" aria-hidden>
                <Icon symbol={e} size={32} />
              </p>
              <p className="mt-2 text-sm font-semibold">{n}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-hero py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 sm:px-6 md:grid-cols-[auto_1fr]">
          <NumiAvatar size={150} className="animate-float mx-auto" />
          <div>
            <h2 className="text-3xl font-bold">Meet Numi</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Your AI wellness companion, here to motivate, support, organize and celebrate your journey.
            </p>
            <Link to="/app/numi" className="focus-ring mt-5 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-navy">Meet Numi</Link>
            <p className="mt-3 text-xs text-muted-foreground">Numi is an AI companion, not a healthcare professional.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold">Wellness Garden</h2>
        <p className="mt-2 text-muted-foreground">Every activity you finish helps something grow.</p>
        <ol className="mt-8 flex flex-wrap gap-3">
          {GARDEN_STAGES.map((g) => (
            <li key={g.name} className="card-soft flex-1 min-w-[140px] p-5 text-center">
              <p className="text-4xl" aria-hidden>
                <Icon symbol={g.emoji} size={36} />
              </p>
              <p className="mt-2 text-sm font-semibold">{g.name}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-surface-2/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold">Progress you can actually see</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[["Star","XP"],["SlidersHorizontal","Levels"],["Flame","Streaks"],["Award","Badges"],["Gift","Rewards"],["Trees","Garden growth"]].map(([e, n]) => (
              <li key={n} className="card-soft p-5 text-center">
                <p className="text-3xl" aria-hidden>
                  <Icon symbol={e} size={32} />
                </p>
                <p className="mt-2 text-sm font-semibold">{n}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold">Healthy Play</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAY_ACTIVITIES.slice(0, 8).map((p) => (
            <li key={p.id} className="card-soft hover-lift p-5">
              <p className="text-3xl" aria-hidden>
                <Icon symbol={p.emoji} size={32} />
              </p>
              <p className="mt-2 font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <div className="card-soft grid gap-4 p-8 sm:grid-cols-2">
          <h2 className="text-2xl font-bold sm:col-span-2">Made for everyone</h2>
          {[["Globe","Consumer wellness, not medical advice"],["Lock","Private by default"],["Shield","Secure and yours"],["HandHeart","Cancel anytime"]].map(([e, t]) => (
            <p key={t} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
              <Icon symbol={e} size={18} className="shrink-0 text-teal" /> {t}
            </p>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold">Simple pricing</h2>
        <p className="mt-2 text-muted-foreground">Monthly shown — annual plans save around 25%.</p>
        <div className="mt-8"><PricingCards plans={PLANS} /></div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-3xl font-bold">Questions</h2>
        <ul className="mt-6 grid gap-3">
          {FAQS.map((f) => (
            <li key={f.q}>
              <details className="card-soft p-5">
                <summary className="focus-ring cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
