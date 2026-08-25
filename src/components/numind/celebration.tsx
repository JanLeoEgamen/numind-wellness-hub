import { Confetti } from "./ui-kit";
import { useNuMind } from "@/lib/numind-store";
import { Icon } from "./icon";

export function CelebrationModal() {
  const { celebration, dismissCelebration } = useNuMind();
  if (!celebration) return null;
  return (
    <>
      <Confetti />
      <div
        className="fixed inset-0 z-[61] grid place-items-center bg-navy/50 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-label={celebration.title}
        onClick={dismissCelebration}
      >
        <div
          className="card-soft animate-pop w-full max-w-sm p-7 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-garden" aria-hidden>
            <Icon symbol={celebration.emoji} size={40} className="text-mint" />
          </div>
          <h2 className="mt-4 text-xl font-bold">{celebration.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{celebration.message}</p>
          {celebration.xp ? (
            <p className="mt-4 inline-flex rounded-full bg-sun/20 px-4 py-1.5 text-sm font-bold">
              +{celebration.xp} XP
            </p>
          ) : null}
          {celebration.chain ? (
            <ul className="mt-5 grid gap-1.5 text-left text-xs text-muted-foreground">
              {celebration.chain.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Icon symbol="Check" size={14} strokeWidth={3} className="shrink-0 text-teal" />
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            autoFocus
            onClick={dismissCelebration}
            className="focus-ring mt-6 w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy"
          >
            Nice!
          </button>
        </div>
      </div>
    </>
  );
}