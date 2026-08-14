import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, SubmitButton } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in to NuMind" },
      { name: "description", content: "Welcome back to NuMind. Pick up your Daily Reset, quests and Wellness Garden." },
      { property: "og:title", content: "Log in to NuMind" },
      { property: "og:description", content: "Welcome back to your everyday wellness companion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/app" });
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Your garden has been waiting for you."
      footer={
        <>
          New to NuMind?{" "}
          <Link to="/signup" className="focus-ring font-semibold text-foreground underline">
            Sign Up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" id="password" name="password" type="password" autoComplete="current-password" required />
        <div className="text-right">
          <Link to="/forgot-password" className="focus-ring text-sm font-semibold underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton pending={pending}>Log In</SubmitButton>
      </form>
    </AuthCard>
  );
}