// Server-only helper for Numi's AI replies.
//
// IMPORTANT: This module reads `process.env` (AI_BASE_URL / AI_MODEL /
// AI_API_KEY) and must only be imported from server-side code such as
// `src/lib/server-functions.ts`. Never import it from a route or component —
// that would ship it (and any secrets) to the client bundle.
//
// It talks to any OpenAI-compatible chat/completions endpoint:
//   - Cloudflare Workers AI (the configured default in .env)
//   - Pollinations.ai (keyless)
//   - Groq / Gemini / Ollama, etc.
// `AI_BASE_URL` may be the full `.../chat/completions` URL or the base URL.

export type NumiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionResult = {
  reply: string;
};

const REQUEST_TIMEOUT_MS = 20_000;

function completionsUrl(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

/**
 * Calls the configured OpenAI-compatible endpoint and returns the assistant
 * reply text. Throws on missing config, non-2xx responses, timeouts or empty
 * replies — callers decide how to fall back.
 */
export async function chatCompletion(messages: NumiChatMessage[]): Promise<ChatCompletionResult> {
  const baseUrl = process.env["AI_BASE_URL"];
  const model = process.env["AI_MODEL"];

  if (!baseUrl || !model) {
    throw new Error("Numi AI is not configured (AI_BASE_URL / AI_MODEL missing)");
  }

  const apiKey = process.env["AI_API_KEY"];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Keyless providers (e.g. Pollinations) work without an Authorization header.
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(completionsUrl(baseUrl), {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Numi AI request failed (${response.status}): ${body.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Numi AI returned an empty response");

    return { reply };
  } finally {
    clearTimeout(timer);
  }
}
