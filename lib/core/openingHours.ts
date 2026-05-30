/**
 * openingHours.ts — parse OSM `opening_hours` and answer "is this open at hour X?".
 *
 * This is what makes Arnfa's plans HONEST: we never recommend a place that's
 * closed at your projected arrival time. Pure, no I/O, fully tested.
 *
 * Supports the common Bangkok subset of the OSM opening_hours grammar:
 *   "24/7"
 *   "Mo-Su 10:00-22:00"
 *   "Mo-Fr 08:00-17:00; Sa-Su 09:00-18:00"
 *   "Mo-Su 11:00-14:00,17:00-22:00"   (split shifts)
 *   "Tu-Su 18:00-02:00"               (overnight wrap)
 *   "Mo off" / "Su closed"            (explicit closed days)
 *   "Mo,We,Fr 10:00-20:00"            (day lists)
 *
 * Anything it can't confidently parse → "unknown" (we keep the place eligible
 * but the UI flags it, rather than fabricating an open/closed claim — Iron Rule 0).
 *
 * Spec: projects/arnfa/02-architecture.md § Opening hours
 */

export type OpenStatus = "open" | "closed" | "unknown";

/** JS getUTCDay(): 0=Sun … 6=Sat. OSM day tokens mapped to the same index. */
const DAY_IDX: Record<string, number> = {
  su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6,
};

type Rule = { days: number[]; ranges: [number, number][]; off: boolean };

/**
 * Answer whether `raw` is open at the moment described by `hourISO`
 * (e.g. "2026-06-01T15:00" — local Bangkok wall-clock from Open-Meteo).
 *
 * We parse Y-M-D-H-M out of the string directly so the result is independent of
 * the runtime timezone (Vercel servers run UTC; relying on `new Date()` getHours
 * would be wrong there).
 */
export function isOpenAtISO(raw: string | null | undefined, hourISO: string): OpenStatus {
  if (!raw) return "unknown";
  const s = raw.trim().toLowerCase();
  if (!s) return "unknown";
  if (s === "24/7" || s === "24/7 open") return "open";

  const m = /(\d{4})-(\d{2})-(\d{2})t(\d{1,2}):(\d{2})/.exec(hourISO.toLowerCase());
  if (!m) return "unknown";
  const [, yy, mo, dd, hh, mm] = m;
  const dow = new Date(Date.UTC(+yy, +mo - 1, +dd)).getUTCDay();
  const minutes = +hh * 60 + +mm;

  const rules = s.split(";").map((r) => r.trim()).filter(Boolean);
  let parsedAny = false;

  for (const ruleStr of rules) {
    if (ruleStr === "24/7") return "open";
    const rule = parseRule(ruleStr);
    if (!rule) continue;
    // We understood this rule, so the spec defines this place's week. A day the
    // spec never opens (e.g. Tue under "Mo,We,Fr ...") is therefore CLOSED, not unknown.
    parsedAny = true;
    if (!rule.days.includes(dow)) continue;
    if (rule.off) continue; // explicit closed for this day (a later rule may still open)
    for (const [a, b] of rule.ranges) {
      if (b > a) {
        if (minutes >= a && minutes < b) return "open";
      } else {
        // overnight wrap, e.g. 18:00-02:00
        if (minutes >= a || minutes < b) return "open";
      }
    }
  }

  // Understood ≥1 rule but none opened → closed. Understood nothing → unknown (never fabricate).
  return parsedAny ? "closed" : "unknown";
}

function parseRule(rule: string): Rule | null {
  const off = /\b(off|closed)\b/.test(rule);

  const ranges: [number, number][] = [];
  const timeRe = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  let t: RegExpExecArray | null;
  while ((t = timeRe.exec(rule))) {
    ranges.push([+t[1] * 60 + +t[2], +t[3] * 60 + +t[4]]);
  }

  const days = parseDays(rule);
  if (!off && ranges.length === 0) return null; // nothing we understand

  return {
    days: days.length ? days : [0, 1, 2, 3, 4, 5, 6], // no day token → all week
    ranges,
    off: off && ranges.length === 0,
  };
}

function parseDays(rule: string): number[] {
  const out = new Set<number>();
  const dayRe = /\b(mo|tu|we|th|fr|sa|su)\b(?:\s*-\s*(mo|tu|we|th|fr|sa|su))?/g;
  let m: RegExpExecArray | null;
  while ((m = dayRe.exec(rule))) {
    const start = DAY_IDX[m[1]];
    if (m[2]) {
      const end = DAY_IDX[m[2]];
      let i = start;
      for (let c = 0; c < 7; c++) {
        out.add(i);
        if (i === end) break;
        i = (i + 1) % 7;
      }
    } else {
      out.add(start);
    }
  }
  return [...out];
}

/** Convenience for UI: Thai label for a status. */
export function openStatusLabelTh(s: OpenStatus): string {
  if (s === "open") return "เปิดอยู่";
  if (s === "closed") return "ปิดตอนนี้";
  return "เวลาเปิดไม่แน่ชัด";
}
