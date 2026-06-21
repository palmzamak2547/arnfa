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
// primary is rate-limited (429), llama-3.1-8b answers in ~1.6s — NOT the 9s llama-3.3-70b
// (which made the chain 24s under load). Both fast → bounded latency for the demo + Vercel.
// Last tier = NVIDIA's OWN Nemotron (only reached if both fast models fail on every key, so
// latency stays bounded) — makes "Arnfah's AI runs on NVIDIA Nemotron" genuinely true.
const MODELS = ["deepseek-ai/deepseek-v4-flash", "meta/llama-3.1-8b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"];

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

/** One chat completion. Tries each model, and within each model each key (a 429 on one
 *  key falls to the next key; any other error moves to the next model). Text or null. */
export async function nimChat(
  messages: ChatMsg[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const keys = nimKeys();
  if (!keys.length) return null;
  for (const model of MODELS) {
    for (const key of keys) {
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
          signal: AbortSignal.timeout(12000),
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
