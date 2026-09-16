import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Icon } from "@/components/numind/icon";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
];

export function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteLayoutInner>{children}</SiteLayoutInner>;
}

function SiteAuthActions() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <span className="h-9 w-24" aria-hidden />;
  if (isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => void signOut()}
          className="focus-ring hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex"
        >
          Log out
        </button>
        <Link to="/app" className="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy shadow-glow">Open app</Link>
      </>
    );
  }
  return (
    <>
      <Link to="/login" className="focus-ring hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex">Log in</Link>
      <Link to="/signup" className="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-navy shadow-glow">Get started</Link>
    </>
  );
}

function SiteLayoutInner({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="focus-ring flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg" aria-hidden>
              <Icon symbol="Brain" size={20} className="text-navy" />
            </span>
            <span className="text-lg font-bold">NuMind</span>
          </Link>
          <nav aria-label="Main" className="ml-4 hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="focus-ring rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SiteAuthActions />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-border bg-surface-2/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold">
              <Icon symbol="Brain" size={20} />
              NuMind
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Reset • Focus • Grow</p>
            <Link
              to="/"
              hash="install"
              className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-xs font-semibold text-background dark:bg-surface dark:text-foreground"
            >
              <Icon symbol="Smartphone" size={12} /> Install app
            </Link>
          </div>
          <div>
            <p className="text-sm font-bold">Product</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li><Link to="/features" className="focus-ring hover:text-foreground">Features</Link></li>
              <li><Link to="/pricing" className="focus-ring hover:text-foreground">Pricing</Link></li>
              <li><Link to="/faq" className="focus-ring hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold">Company</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="focus-ring hover:text-foreground">About</Link></li>
              <li><Link to="/app/safety" className="focus-ring hover:text-foreground">Safety</Link></li>
              <li><a href="mailto:hello@numind.app" className="focus-ring hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold">Legal</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="focus-ring hover:text-foreground">Privacy</Link></li>
              <li><Link to="/terms" className="focus-ring hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>
        <p className="px-4 pb-10 text-center text-xs text-muted-foreground">
          NuMind is a consumer wellness app and does not provide medical advice, diagnosis or treatment.
        </p>
      </footer>
    </div>
  );
}

export function PricingCards({ annual = false, plans }: { annual?: boolean; plans: Array<{ id: string; name: string; emoji: string; monthly: number; annual: number; tagline: string; popular?: boolean; features: string[] }> }) {
  return (
    <ul className="grid gap-5 lg:grid-cols-3">
      {plans.map((p) => (
        <li key={p.id}>
          <div className={`card-soft hover-lift flex h-full flex-col p-6 ${p.popular ? "border-teal ring-2 ring-teal/40" : ""}`}>
            {p.popular ? <span className="mb-3 w-fit rounded-full bg-brand px-3 py-1 text-xs font-bold text-navy">Most loved</span> : null}
            <p className="text-3xl" aria-hidden>
              <Icon symbol={p.emoji} size={32} className="text-foreground" />
            </p>
            <h3 className="mt-2 text-xl font-bold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.tagline}</p>
            <p className="mt-4 text-3xl font-bold">
              ${annual ? p.annual.toFixed(2) : p.monthly.toFixed(2)}
              <span className="text-sm font-medium text-muted-foreground">/{annual ? "year" : "month"}</span>
            </p>
            <ul className="mt-5 grid flex-1 gap-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Icon symbol="Check" size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-teal" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/signup" className={`focus-ring mt-6 rounded-full px-5 py-3 text-center text-sm font-bold ${p.popular ? "bg-brand text-navy" : "bg-muted hover:bg-accent"}`}>
              {p.monthly === 0 ? "Start free" : `Choose ${p.name}`}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
