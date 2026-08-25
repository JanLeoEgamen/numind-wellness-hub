import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Icon } from "@/components/numind/icon";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-hero px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="focus-ring mx-auto flex w-fit items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-lg" aria-hidden>
            <Icon symbol="Brain" size={20} className="text-navy" />
          </span>
          <span className="text-xl font-bold">NuMind</span>
        </Link>
        <div className="card-soft mt-6 p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className="focus-ring w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none"
        {...props}
      />
    </div>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-navy shadow-glow disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}