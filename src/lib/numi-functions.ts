// Numi AI backend.
//
// AI generation is keyless + free by default via Pollinations AI — a free,
// OpenAI-compatible endpoint that requires no API key or signup. All calls run
// server-side through TanStack Start server functions protected by
// requireSupabaseAuth, and conversations are persisted in ai_conversations /
// ai_conversation_messages so they survive a refresh.
//
// Because Pollinations exposes an OpenAI-compatible API, you can swap in any
// other OpenAI-compatible provider later via env vars (AI_BASE_URL, AI_API_KEY,
// AI_MODEL) — e.g. Groq free tier, Google Gemini, Cloudflare Workers AI, or a
// local Ollama instance. If the upstream call fails or rate-limits, Numi
// degrades gracefully to a warm offline reply (flagged `fallback: true`)
// instead of breaking the chat.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NUMI_SYSTEM_PROMPT = `You are Numi, the warm, encouraging AI wellness companion in NuMind — a consumer wellness and personal-growth app. The app's motto is "Reset. Focus. Grow."

Personality: friendly, encouraging, calming, playful, uplifting and lightly futuristic. Never clinical, never preachy, never guilt-tripping. Write short, warm replies (usually 1-4 sentences). Use an occasional emoji, but not in every message.

What you help with: gentle motivation, habit-building, mindfulness and breathing, focus, setting small goals, journaling prompts, celebrating progress, and winding down. When suggesting habits, keep them small and specific. Encourage celebrating small wins.

Boundaries: You are NOT a healthcare professional, therapist or crisis counselor. Never give medical advice, diagnosis or treatment, and never claim to monitor the user. If someone expresses self-harm or a crisis, respond with compassion and immediately point them to a local crisis line or the app's Safety Center (e.g., "Please reach out to a trusted person or a local crisis line — you deserve support.") and keep it brief and caring.`;

const FALLBACK_REPLY =
  "I'm here with you 💚 That's the most important part. Numi's words are warming up right now — try again in a moment and I'll answer you back. Want a tiny suggestion for your next step in the meantime?";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type NumiConversation = {
  conversationId: string | null;
  messages: ConversationMessage[];
};

export type NumiChatResult = {
  conversationId: string;
  assistant: string;
  fallback: boolean;
};

async function callNumiAI(
  firstName: string | null,
  history: { role: "user" | "assistant" | "system"; content: string }[],
): Promise<string> {
  // Default: Pollinations AI — free, keyless, OpenAI-compatible.
  // Override with any OpenAI-compatible chat-completions endpoint via env:
  //   Cloudflare Workers AI (free daily allowance + fits this app's CF deploy):
  //     AI_BASE_URL="https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1/chat/completions"
  //     AI_MODEL="@cf/meta/llama-3.2-3b-instruct"  AI_API_KEY="<Cloudflare API token>"
  //   Groq free tier:
  //     AI_BASE_URL="https://api.groq.com/openai/v1/chat/completions"  AI_MODEL="llama-3.3-70b-versatile"
  //   Google Gemini free tier:
  //     AI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"  AI_MODEL="gemini-2.0-flash"
  //   Ollama (local, 100% offline):
  //     AI_BASE_URL="http://localhost:11434/v1/chat/completions"  AI_MODEL="llama3.1"
  const base = (process.env["AI_BASE_URL"] || "https://text.pollinations.ai/openai").replace(/\/+$/, "");
  const primaryModel = process.env["AI_MODEL"] || "openai";
  const apiKey = process.env["AI_API_KEY"] || "";

  const system = `${NUMI_SYSTEM_PROMPT}${
    firstName ? `\n\nThe person you are talking to is named ${firstName}. Use their name occasionally.` : ""
  }`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  // If the configured model was deprecated (HTTP 410), automatically retry with
  // a current free-tier Cloudflare model so Numi self-heals instead of failing.
  const FALLBACK_MODEL = "@cf/meta/llama-3.2-3b-instruct";
  const models = primaryModel === FALLBACK_MODEL ? [primaryModel] : [primaryModel, FALLBACK_MODEL];

  let lastError: unknown = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(base, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: system }, ...history],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        // Deprecated model -> stop this loop, try the fallback model next.
        if (res.status === 410) {
          throw Object.assign(new Error(`Model discontinued: ${model}`), { deprecated: true });
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 200)}`);
        }

        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) return content;
        throw new Error("Empty AI response");
      } catch (err) {
        const deprecated = (err as Error & { deprecated?: boolean })?.deprecated;
        if (deprecated) {
          lastError = err;
          break; // move on to the fallback model
        }
        lastError = err;
        // Retry once on rate-limit/transient failures with a short backoff.
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  throw lastError ?? new Error("AI provider failed");
}

// ---------------------------------------------------------------------------
// Get the current user's conversation + history (for hydration after refresh)
// ---------------------------------------------------------------------------
export const getNumiConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NumiConversation> => {
    const { supabase, userId } = context;

    const { data: convo } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!convo) return { conversationId: null, messages: [] };

    const { data: msgs } = await supabase
      .from("ai_conversation_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true })
      .limit(50);

    return {
      conversationId: convo.id,
      messages: (msgs ?? []) as ConversationMessage[],
    };
  });

// ---------------------------------------------------------------------------
// Send a message: persist it, ask the model, persist the reply
// ---------------------------------------------------------------------------
export const numiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { message: string; conversationId?: string }) => d)
  .handler(async ({ context, data }): Promise<NumiChatResult> => {
    const { supabase, userId } = context;
    const message = data.message.trim().slice(0, 2000);
    if (!message) throw new Error("Empty message");

    // Resolve (or create) the user's conversation with ownership checks via RLS.
    let conversationId = data.conversationId ?? "";
    if (conversationId) {
      const { data: own } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!own) conversationId = "";
    }

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title: message.slice(0, 48) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = (created as unknown as { id: string }).id;
    } else {
      await supabase
        .from("ai_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    // Persist the user message.
    await supabase
      .from("ai_conversation_messages")
      .insert({ conversation_id: conversationId, user_id: userId, role: "user", content: message });

    // Build recent context for the model (newest first, then reversed).
    const { data: history } = await supabase
      .from("ai_conversation_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);
    const ordered = [...(history ?? [])]
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Personalize with the user's first name when available.
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, nickname")
      .eq("id", userId)
      .maybeSingle();
    const firstName =
      profile?.first_name || (profile?.nickname ? profile.nickname.replace(/^./, (c) => c.toUpperCase()) : null);

    let assistant: string;
    let fallback = false;
    try {
      assistant = await callNumiAI(firstName, ordered);
    } catch (err) {
      console.error("[Numi] AI provider failed:", err);
      assistant = FALLBACK_REPLY;
      fallback = true;
    }
    if (!assistant?.trim()) {
      assistant = FALLBACK_REPLY;
      fallback = true;
    }

    // Persist the reply (best-effort so a DB hiccup never loses the answer).
    await supabase
      .from("ai_conversation_messages")
      .insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: assistant });

    return { conversationId, assistant, fallback };
  });

// ---------------------------------------------------------------------------
// Start a fresh conversation (deletes the current one + its messages)
// ---------------------------------------------------------------------------
export const clearNumiConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", data.conversationId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
