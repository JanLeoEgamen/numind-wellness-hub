// Shared auth helpers for route guards.
//
// getAuthenticatedUser() resolves the current user and, on a cold start right
// after an email-verification link is clicked, lets Supabase finish its PKCE
// code exchange (the page loads with ?code=… in the URL) before we decide
// whether the user is allowed in.
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export async function getAuthenticatedUser(): Promise<User | null> {
  let { data, error } = await supabase.auth.getUser();

  // Right after clicking an email link the page hard-loads with a PKCE code
  // in the URL. getUser() awaits Supabase's initialization (which performs the
  // code exchange), but give it a short grace window in case the exchange was
  // slow, so we don't bounce the user to /login prematurely.
  if ((error || !data.user) && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.has("code") || params.has("access_token") || params.has("token_hash")) {
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        ({ data, error } = await supabase.auth.getUser());
        if (data.user) break;
      }
    }
  }

  if (error || !data.user) return null;
  return data.user;
}

export async function getOnboardingCompleted(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  return data ? data.onboarding_completed : false;
}
