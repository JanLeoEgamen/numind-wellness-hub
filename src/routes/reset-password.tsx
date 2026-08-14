import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, SubmitButton } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new NuMind password" },
      { name: "description", content: "Choose a new password for your NuMind account and get back to growing." },
      { property: "og:title", content: "Set a new NuMind password" },
      { property: "og:description", content: "Choose a new password for your NuMind account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      toast.error("Those passwords don't match yet.");
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated 🌿");
    navigate({ to: "/app" });
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose something you'll remember."
      footer={
        <Link to="/login" className="focus-ring font-semibold text-foreground underline">
          Back to log in
        </Link>
      }
    >
      {ready ? (
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="New password" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <Field label="Confirm password" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          <SubmitButton pending={pending}>Update Password</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Open this page from the reset link in your email, then you can choose a new password here.
        </p>
      )}
    </AuthCard>
  );
}