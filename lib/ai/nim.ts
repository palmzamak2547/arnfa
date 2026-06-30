/**
 * nim.ts — NVIDIA NIM (build.nvidia.com) chat client. Powers "Arnfa AI": the agent
 * understands a free-text Thai request and narrates the REAL plan the engine builds.
 *
 * Server-only — `NVIDIA_API_KEY` is never NEXT_PUBLIC. Dormant-until-key (returns null
 * so the route degrades gracefully, never fabricates). Model picked by a live Thai test
 * (deepseek-v4-flash: best Thai + fastest ~1.4s); llama-3.1-8b is the fast fallback (~1.6s).
 */

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
// Primary = best Thai (deepseek-v4-flash ~1.4s). Fallback MUST also be fast: when the
// primary is rate-limited (429), llama-3.1-8b answers in ~1.6s. BOTH fast → bounded latency.
// (Dropped the slow nemotron-70b tier: under a primary stall it cannot finish inside the route's
// time budget and was the cause of the /api/ask 504s — a hung demo beats a "runs on Nemotron" line.)
const MODELS = ["deepseek-ai/deepseek-v4-flash", "meta/llama-3.1-8b-instruct"];

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/** All configured NVIDIA keys (NVIDIA_API_KEY + optional NVIDIA_API_KEY_2, each may be
 *  comma-separated). Multiple keys = more rate-limit headroom — a 429 on one key falls
 *  to the next before dropping to the slower model. */
function nimKeys(): string[] {
  return [process.env.NVIDIA_API_KEY, process.env.NVIDIA_API_KEY_2]
    .filter((k): k is string => !!k)
    .flatMap((k) => k.split(",").map((s) => s.trim()).filter(Boolean));
}

export function nimConfigured(): boolean {
  return nimKeys().length > 0;
}

/** One chat completion. Tries each model, and within each model each key (a 429 on one key
 *  falls to the next key; any other error moves to the next model). A shared `deadlineMs`
 *  budget bounds the whole call so /api/ask can never blow past Vercel's function timeout
 *  (the cause of the live 504s); each attempt is capped at min(6s, remaining budget). Null
 *  on exhaustion → the route degrades gracefully (never fabricates). */
export async function nimChat(
  messages: ChatMsg[],
  opts: { maxTokens?: number; temperature?: number; deadlineMs?: number } = {},
): Promise<string | null> {
  const keys = nimKeys();
  if (!keys.length) return null;
  const deadline = opts.deadlineMs ?? Date.now() + 14000;
  for (const model of MODELS) {
    for (const key of keys) {
      const remaining = deadline - Date.now();
      if (remaining <= 800) return null; // out of budget → degrade now, never risk the 504
      try {
        const r = await fetch(NIM_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: opts.maxTokens ?? 400,
            temperature: opts.temperature ?? 0.5,
          }),
          signal: AbortSignal.timeout(Math.min(6000, remaining)),
        });
        if (r.status === 429) continue; // rate-limited → try the next key
        if (!r.ok) break;               // other model error → next model
        const j = await r.json();
        const c: string | undefined = j?.choices?.[0]?.message?.content;
        if (c && c.trim()) return c.trim();
      } catch {
        /* timeout / network → try the next key */
      }
    }
  }
  return null;
}

/** Pull the first JSON object out of an LLM reply (handles ```json fences + stray prose). */
export function extractJson<T = Record<string, unknown>>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
