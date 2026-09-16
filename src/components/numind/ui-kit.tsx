import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/* ---------------- Gamification primitives ---------------- */

export function XPBadge({ xp, className }: { xp: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sun/20 px-2.5 py-1 text-xs font-semibold text-foreground",
        className,
      )}
    >
      <Icon symbol="Star" size={13} fill className="text-sun" />
      <span>+{xp} XP</span>
    </span>
  );
}

export function LevelBadge({ level, name, emoji }: { level: number; name: string; emoji: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
      <Icon symbol={emoji} size={15} />
      Level {level} — {name}
    </span>
  );
}

export function StreakBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/20 px-3 py-1.5 text-xs font-semibold text-foreground">
      <Icon symbol="Flame" size={16} className="text-coral" /> {days}-day streak
    </span>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  stroke = 12,
  children,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)} percent complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "teal",
  className,
}: {
  value: number;
  max?: number;
  tone?: "teal" | "lavender" | "mint" | "sun" | "coral" | "cyan";
  className?: string;
}) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const toneMap: Record<string, string> = {
    teal: "bg-teal",
    lavender: "bg-lavender",
    mint: "bg-mint",
    sun: "bg-sun",
    coral: "bg-coral",
    cyan: "bg-cyan",
  };
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          toneMap[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------------- Numi ---------------- */

/**
 * Numi artwork lives in `public/`. `numi-avatar.png` is the 1254px master; the
 * `-128 / -256 / -512` copies are derivatives cropped to the artwork's own
 * circular frame (1182x1182 at x=32,y=29 in the master) and re-encoded, so the
 * round mask below lands exactly on the ring with no white bleed. A `srcSet`
 * keeps the heaviest download at ~75 KB instead of 1.6 MB — the master is
 * deliberately not a candidate because the largest placement is 150px.
 */
const NUMI_AVATAR = "/numi-avatar";

export function NumiAvatar({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface shadow-glow",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src={`${NUMI_AVATAR}-512.jpg`}
        srcSet={`${NUMI_AVATAR}-128.jpg 128w, ${NUMI_AVATAR}-256.jpg 256w, ${NUMI_AVATAR}-512.jpg 512w`}
        sizes={`${size}px`}
        alt=""
        draggable={false}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/* ---------------- Cards ---------------- */

const TONE_BG: Record<string, string> = {
  teal: "bg-teal/15",
  cyan: "bg-cyan/15",
  lavender: "bg-lavender/20",
  mint: "bg-mint/25",
  sun: "bg-sun/20",
  coral: "bg-coral/18",
};

const TONE_TEXT: Record<string, string> = {
  teal: "text-teal",
  cyan: "text-cyan",
  lavender: "text-lavender",
  mint: "text-mint",
  sun: "text-sun",
  coral: "text-coral",
};

export function ToneIcon({
  emoji,
  tone = "teal",
  size = "md",
}: {
  emoji: string;
  tone?: keyof typeof TONE_BG | string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const iconSize = size === "lg" ? 32 : size === "sm" ? 18 : 24;
  return (
    <span
      aria-hidden
      className={cn("grid place-items-center rounded-2xl", TONE_BG[tone] ?? "bg-teal/15", box)}
    >
      <Icon symbol={emoji} size={iconSize} className={TONE_TEXT[tone] ?? "text-teal"} />
    </span>
  );
}

export function SoftCard({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={cn("card-soft p-5 sm:p-6", interactive && "hover-lift", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  emoji,
  title,
  subtitle,
  action,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {emoji ? (
            <Icon
              symbol={emoji}
              size={28}
              className="mr-2 inline-block -translate-y-0.5 align-middle"
            />
          ) : null}
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-bold sm:text-xl">{children}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  message,
  action,
}: {
  emoji: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-soft grid place-items-center gap-3 px-6 py-14 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-garden" aria-hidden>
        <Icon symbol={emoji} size={40} className="text-mint" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-soft h-24 animate-pulse bg-muted/50" />
      ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="card-soft grid place-items-center gap-3 px-6 py-12 text-center">
      <Icon symbol="CloudFog" size={44} />
      <h3 className="text-lg font-bold">That didn't load</h3>
      <p className="text-sm text-muted-foreground">No worries — let's try that again.</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="focus-ring rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function LockedPill({ label = "NuMind+" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-grape/15 px-2.5 py-1 text-xs font-semibold text-grape">
      <Icon symbol="Lock" size={12} /> {label}
    </span>
  );
}

export function DisclaimerNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">{children}</p>
  );
}

export function Confetti({ count = 60 }: { count?: number }) {
  const colors = [
    "var(--color-teal)",
    "var(--color-lavender)",
    "var(--color-sun)",
    "var(--color-coral)",
    "var(--color-mint)",
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute block h-3 w-2 rounded-[2px]"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `numind-confetti ${1.8 + (i % 7) * 0.22}s linear ${(i % 11) * 0.11}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

export function StatTile({
  emoji,
  label,
  value,
  tone = "teal",
}: {
  emoji: string;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="card-soft flex items-center gap-3 p-4">
      <ToneIcon emoji={emoji} tone={tone} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

export function CTALink({
  to,
  children,
  variant = "primary",
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "soft";
  className?: string;
}) {
  const styles = {
    primary: "bg-brand text-navy shadow-glow hover:brightness-105",
    ghost: "border border-border bg-transparent hover:bg-muted",
    soft: "bg-muted hover:bg-accent",
  }[variant];
  return (
    <Link
      to={to}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
        styles,
        className,
      )}
    >
      {children}
    </Link>
  );
}
