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
  opts: { maxTokens?: number; temperature?: number; deadlineMs?: number } = {},
): Promise<string | null> {
  const base = process.env.THAI_LLM_BASE_URL || DEFAULT_BASE;
  const key = process.env.THAI_LLM_API_KEY, model = process.env.THAI_LLM_MODEL;
  if (!key || !model) return null;
  // Bound the attempt so a flaky 8B preview can't blow the /api/ask time budget — when it's
  // slow we want to fall straight back to NIM, not 504.
  const remaining = opts.deadlineMs ? opts.deadlineMs - Date.now() : 7000;
  if (remaining <= 800) return null;
  try {
    const r = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: opts.maxTokens ?? 400, temperature: opts.temperature ?? 0.5 }),
      signal: AbortSignal.timeout(Math.min(7000, remaining)),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const c: string | undefined = j?.choices?.[0]?.message?.content;
    return c && c.trim() ? c.trim() : null;
  } catch {
    return null;
  }
}

/** The 8B ThaiLLM preview sometimes answers a Thai prompt in Chinese/English. For a Thai weather
 *  app that's worse than falling back to NIM, so the route only accepts sovereign output that is
 *  actually mostly Thai. */
export function isMostlyThai(text: string): boolean {
  const thai = (text.match(/[฀-๿]/g) || []).length;
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  return thai >= 8 && thai >= cjk * 2; // enough Thai, and not dominated by Chinese
}
