import type { ChatMsg } from "./nim";

/**
 * sovereign — Thai-sovereign LLM mode (BDI/NECTEC ThaiLLM, or any OpenAI-compatible Thai
 * model). The BDI field notes push "อธิปไตยทาง AI": a Thai-language model for Thai service.
 * Dormant-until-env: set THAI_LLM_BASE_URL + THAI_LLM_API_KEY + THAI_LLM_MODEL and the agent
 * prefers it for Thai narration; otherwise it falls back to NVIDIA NIM. The engine still owns
 * the plan either way (Iron Rule 0) — the LLM only narrates.
 */
export function sovereignConfigured(): boolean {
  return !!(process.env.THAI_LLM_BASE_URL && process.env.THAI_LLM_API_KEY && process.env.THAI_LLM_MODEL);
}

export async function sovereignChat(
  messages: ChatMsg[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const base = process.env.THAI_LLM_BASE_URL, key = process.env.THAI_LLM_API_KEY, model = process.env.THAI_LLM_MODEL;
  if (!base || !key || !model) return null;
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
