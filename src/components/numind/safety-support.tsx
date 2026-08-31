import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Icon } from "@/components/numind/icon";
import { SoftCard, ToneIcon } from "@/components/numind/ui-kit";
import { useSafetyResources } from "@/lib/server-data";

/**
 * SafetySupportPanel — README §25.
 *
 * A standalone, professionally reviewed support surface that is shown
 * immediately when a PHQ-9 item 9 response is non-zero. It is intentionally
 * independent of the AI service: it never asks Numi whether support should
 * appear, never routes the user through another questionnaire first, and, per
 * spec, it must not be suppressible by Numi.
 *
 * It does NOT award points, show celebration animations, or grant achievement
 * badges. It offers clear guidance and explicit navigation controls instead.
 */
export function SafetySupportPanel({
  onContinue,
  onGoToSafety,
  sourceLabel = "your responses",
}: {
  /** Clear navigation control: acknowledge and continue to results. */
  onContinue: () => void;
  /** Optional explicit link to the Safety Center. */
  onGoToSafety?: () => void;
  sourceLabel?: string;
}) {
  const { data: resources, isLoading } = useSafetyResources();
  const crisis = resources ?? [];

  return (
    <div className="card-soft animate-pop p-6 sm:p-8" role="region" aria-label="Support resources">
      <div className="flex items-start gap-4">
        <ToneIcon emoji="LifeBuoy" tone="teal" />
        <div>
          <h2 className="text-xl font-bold">You're not alone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thank you for being honest with {sourceLabel}. Some things are worth sharing with someone
            who can help. Please read through the options below — take what's useful, and reach out
            when you're ready.
          </p>
        </div>
      </div>

      {/* Immediate support guidance */}
      <SoftCard className="mt-5">
        <h3 className="flex items-center gap-2 font-bold">
          <Icon symbol="HandHeart" size={18} className="text-teal" /> Reach out right now
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If you're thinking of hurting yourself, please do not wait. Talk to someone immediately —
          a trusted person, a crisis line, or your local emergency number. You can call or text a
          support line at any hour. There is no wrong time to ask for help.
        </p>
      </SoftCard>

      {/* Appropriate emergency guidance */}
      <SoftCard className="mt-4">
        <h3 className="flex items-center gap-2 font-bold">
          <Icon symbol="TriangleAlert" size={18} className="text-coral" /> In an emergency
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If you or someone else is in immediate danger, call your local emergency number (in the
          US, call 911) or go to the nearest emergency room. Do not try to handle this alone.
        </p>
      </SoftCard>

      {/* Crisis-support navigation */}
      <SoftCard className="mt-4">
        <h3 className="flex items-center gap-2 font-bold">
          <Icon symbol="PhoneCall" size={18} className="text-mint" /> Crisis support lines
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Free, confidential support from people who are trained to listen.
        </p>
        {isLoading ? (
          <div className="mt-3 grid gap-2" aria-busy="true" aria-live="polite">
            <div className="h-16 animate-pulse rounded-2xl bg-muted/50" />
            <div className="h-16 animate-pulse rounded-2xl bg-muted/50" />
          </div>
        ) : crisis.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Support resources are being configured. In the meantime, please reach out to a trusted
            person or your local emergency services.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {crisis.map((r) => (
              <li key={r.id} className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{r.name}</span>
                  {r.hours ? (
                    <span className="text-xs text-muted-foreground">{r.hours}</span>
                  ) : null}
                </div>
                {r.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-teal">
                  {r.phone ? <span>Call: {r.phone}</span> : null}
                  {r.sms ? <span>Text: {r.sms}</span> : null}
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring underline underline-offset-2"
                    >
                      Visit website
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SoftCard>
      {/* Trusted-person suggestion */}
      <SoftCard className="mt-4">
        <h3 className="flex items-center gap-2 font-bold">
          <Icon symbol="Heart" size={18} className="text-coral" /> Someone you trust
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sometimes it helps to talk to a friend, a family member, or a colleague you trust. You
          don't need to have the perfect words — you just need to start.
        </p>
      </SoftCard>

      {/* Professional-support option */}
      <SoftCard className="mt-4">
        <h3 className="flex items-center gap-2 font-bold">
          <Icon symbol="Stethoscope" size={18} className="text-lavender" /> A qualified professional
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This screening tool is not a diagnosis. A doctor, therapist, or other qualified
          healthcare professional can talk through what you're feeling and help you figure out the
          right next step for you.
        </p>
      </SoftCard>

      {/* Clear navigation controls */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/app/safety"
          onClick={onGoToSafety}
          className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy"
        >
          <Icon symbol="LifeBuoy" size={18} /> Go to Safety Center
        </Link>
        <button
          type="button"
          onClick={onContinue}
          className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-muted px-5 py-3 text-sm font-semibold"
        >
          I understand — continue
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        NuMind does not monitor you or contact anyone on your behalf.
      </p>
    </div>
  );
}

export function SupportCallout({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">{children}</p>
  );
}

