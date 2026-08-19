import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, SubmitButton } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your NuMind account" },
      { name: "description", content: "Start your NuMind wellness journey — Daily Reset, Mind Gym, Numi and your Wellness Garden." },
      { property: "og:title", content: "Create your NuMind account" },
      { property: "og:description", content: "Start your NuMind wellness journey in under a minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      toast.error("Those passwords don't match yet.");
      return;
    }
    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email") ?? ""),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          first_name: String(form.get("first_name") ?? ""),
          last_name: String(form.get("last_name") ?? ""),
          nickname: String(form.get("nickname") ?? ""),
        },
      },
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/app" });
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Create My Account"
      subtitle="A gentle place to reset, focus and grow."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="focus-ring font-semibold text-foreground underline">
            Log In
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="grid gap-3 text-sm">
          <p className="text-base font-semibold">Check your inbox 🌱</p>
          <p className="text-muted-foreground">
            We sent a confirmation link to your email. Click it and we'll set up your first day together — your
            goals, your avatar and your first seed.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" id="first_name" name="first_name" autoComplete="given-name" required />
            <Field label="Last name" id="last_name" name="last_name" autoComplete="family-name" required />
          </div>
          <Field label="Nickname" id="nickname" name="nickname" placeholder="What should Numi call you?" required />
          <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <Field label="Confirm password" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-border" />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="focus-ring font-semibold text-foreground underline">Terms</Link> and{" "}
              <Link to="/privacy" className="focus-ring font-semibold text-foreground underline">Privacy Policy</Link>.
            </span>
          </label>
          <SubmitButton pending={pending}>Create My Account</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}