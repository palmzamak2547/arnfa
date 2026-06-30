/** Parse a Traffy/ISO timestamp robustly — handles "YYYY-MM-DD HH:mm:ss.ffffff+00" (2-digit offset)
 *  and plain ISO. Returns epoch ms, or null if unparseable. */
export function parseTs(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const s = ts.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"); // "+00" → "+00:00"
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

/** Short relative time in Thai / English: "เมื่อกี้" / "5 นาทีก่อน" / "3 ชม.ก่อน" / "2 วันก่อน". */
export function timeAgo(ms: number, en: boolean): string {
  const sec = Math.max(0, (Date.now() - ms) / 1000);
  if (sec < 90) return en ? "just now" : "เมื่อกี้";
  const m = sec / 60;
  if (m < 60) return en ? `${Math.round(m)}m ago` : `${Math.round(m)} นาทีก่อน`;
  const h = m / 60;
  if (h < 24) return en ? `${Math.round(h)}h ago` : `${Math.round(h)} ชม.ก่อน`;
  const d = h / 24;
  return en ? `${Math.round(d)}d ago` : `${Math.round(d)} วันก่อน`;
}
