import type { ChatMsg } from "./nim";

/**
 * sovereign — Thai-sovereign LLM mode ("อธิปไตยทาง AI", per the BDI field notes): a Thai-language
 * model serving Thai users. Wired to the **ThaiLLM Playground** — the BDI × NECTEC × VISTEC ×
 * SCB10X national sovereign-AI initiative (thaillm.or.th) — which is OpenAI-compatible:
 *
 *     POST https://thaillm.or.th/api/v1/chat/completions      (Authorization: Bearer <key>)
 *     model: e.g. "Typhoon-S-ThaiLLM-8B-Instruct"             (confirm the exact id on the Playground)
 *
 * Get a free API key at thaillm.or.th → "API Key" (free, explicitly for hackathon use). Dormant
 * until set: provide THAI_LLM_API_KEY + THAI_LLM_MODEL (THAI_LLM_BASE_URL is OPTIONAL — it defaults
 * to the ThaiLLM Playground). When configured, the agent prefers it for Thai narration; otherwise
 * it falls back to NVIDIA NIM. The engine still owns the plan either way (Iron Rule 0) — the LLM
 * only narrates, never invents a place or the weather.
 *
 * Using Thailand's national LLM is also the BDI-aligned hackathon story: BDI co-runs ThaiLLM, so
 * "Arnfah's Thai voice runs on Thailand's own sovereign model" is a host-aligned differentiator.
 */
const DEFAULT_BASE = "https://thaillm.or.th/api/v1";

export function sovereignConfigured(): boolean {
  // base URL has a sensible default (the ThaiLLM Playground) — only the key + model are required.
  return !!(process.env.THAI_LLM_API_KEY && process.env.THAI_LLM_MODEL);
}

export async function sovereignChat(
  messages: ChatMsg[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const base = process.env.THAI_LLM_BASE_URL || DEFAULT_BASE;
  const key = process.env.THAI_LLM_API_KEY, model = process.env.THAI_LLM_MODEL;
  if (!key || !model) return null;
  try {
    const r = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: opts.maxTokens ?? 400, temperature: opts.temperature ?? 0.5 }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const c: string | undefined = j?.choices?.[0]?.message?.content;
    return c && c.trim() ? c.trim() : null;
  } catch {
    return null;
  }
}
