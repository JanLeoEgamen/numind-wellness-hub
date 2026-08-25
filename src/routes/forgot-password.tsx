import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, SubmitButton } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your NuMind password" },
      { name: "description", content: "Send yourself a NuMind password reset link and get back to your wellness journey." },
      { property: "og:title", content: "Reset your NuMind password" },
      { property: "og:description", content: "Send yourself a password reset link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(String(form.get("email") ?? ""), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="It happens. We'll send you a link to set a new one."
      footer={
        <Link to="/login" className="focus-ring font-semibold text-foreground underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          If that email belongs to a NuMind account, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
          <SubmitButton pending={pending}>Send Reset Link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}