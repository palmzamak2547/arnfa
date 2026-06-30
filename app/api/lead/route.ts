import { createClient } from "@supabase/supabase-js";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * /api/lead — the ONLY write path for a merchant lead. Direct anon INSERT on
 * arnfa.merchant_lead is revoked; this route validates + per-IP rate-limits, then
 * calls the validating SECURITY DEFINER fn arnfa.submit_lead (which also dedupes +
 * has a global throttle as a backstop). Closes the anon-spam hole on /partner.
 */
export const runtime = "nodejs";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const rl = rateLimit("lead:" + clientIp(req), 5, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: { place?: unknown; contact?: unknown; note?: unknown };
  try { body = await req.json(); } catch { return json({ ok: false }, 400); }
  const place = String(body.place ?? "").trim().slice(0, 120);
  const contact = String(body.contact ?? "").trim().slice(0, 160);
  const note = body.note != null && String(body.note).trim() ? String(body.note).trim().slice(0, 1000) : null;
  if (place.length < 1 || contact.length < 3) return json({ ok: false }, 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return json({ ok: false }, 503);

  try {
    const sb = createClient(url, key, { db: { schema: "arnfa" }, auth: { persistSession: false } });
    const { data, error } = await sb.rpc("submit_lead", { p_place: place, p_contact: contact, p_note: note });
    return json({ ok: !error && data === true });
  } catch {
    return json({ ok: false }, 502);
  }
}
