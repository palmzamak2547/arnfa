import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { districtMeta } from "@/lib/poi/districts";
import { scoreDay } from "@/lib/where/rank";
import { skyVerdict, type SkyVerdict } from "@/lib/core/skyScore";

/**
 * GET /api/og?area=&day= — the shareable "sky card". Dynamic per-area/day OG image
 * a friend sees when a plan link is shared (LINE/FB/X). Reads the REAL forecast for
 * the area's centroid and renders today's honest verdict — never a generic stock card.
 *
 * Thai needs a real font in Satori (system fonts render tofu). We bundle one TTF in
 * /public and fs-read it; on Vercel the function may not have /public on disk, so we
 * fall back to fetching the static file same-origin (proven pattern).
 */

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const pad = (n: number) => String(n).padStart(2, "0");

const HEAD: Record<SkyVerdict, { th: string; en: string; sun: string; sky: string }> = {
  clearish: { th: "วันนี้ฟ้าเปิด", en: "Clear skies", sun: "#F2A65A", sky: "#A8C6E8" },
  ok: { th: "ฟ้าพอไหว", en: "Decent skies", sun: "#F2A65A", sky: "#C9D6E4" },
  closing: { th: "ฟ้าเริ่มปิด", en: "Clouding over", sun: "#9FB0C3", sky: "#B7C2D0" },
  poor: { th: "ฟ้าไม่ค่อยเป็นใจ", en: "Rough skies", sun: "#8FA0B3", sky: "#9AA7B8" },
};

async function loadFont(req: Request): Promise<ArrayBuffer | Buffer> {
  try {
    return await readFile(join(process.cwd(), "public", "og-thai.ttf"));
  } catch {
    const r = await fetch(new URL("/og-thai.ttf", req.url));
    return await r.arrayBuffer();
  }
}

async function dayVerdict(lat: number, lng: number, day: number): Promise<{ verdict: SkyVerdict; tempC: number; rain: number } | null> {
  const bkk = new Date(Date.now() + 7 * 3600 * 1000 + day * 86400000);
  const date = `${bkk.getUTCFullYear()}-${pad(bkk.getUTCMonth() + 1)}-${pad(bkk.getUTCDate())}`;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=precipitation_probability,cloud_cover,temperature_2m,apparent_temperature` +
    `&start_date=${date}&end_date=${date}&timezone=Asia%2FBangkok`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const h = (await r.json()).hourly;
    const idx: number[] = [];
    for (let i = 0; i < h.time.length; i++) { const hh = +h.time[i].slice(11, 13); if (hh >= 8 && hh <= 18) idx.push(i); }
    if (!idx.length) return null;
    let rpS = 0, rpM = 0, clS = 0, apM = -99, tM = -99;
    for (const i of idx) {
      const rp = (h.precipitation_probability[i] ?? 0) / 100; rpS += rp; if (rp > rpM) rpM = rp;
      clS += (h.cloud_cover[i] ?? 0) / 100;
      const ap = h.apparent_temperature[i] ?? h.temperature_2m[i] ?? 30; if (ap > apM) apM = ap;
      const tt = h.temperature_2m[i] ?? ap; if (tt > tM) tM = tt;
    }
    const score = scoreDay({ rainProbMean: rpS / idx.length, rainProbMax: rpM, cloudMean: clS / idx.length, apparentMaxC: apM });
    return { verdict: skyVerdict(score), tempC: Math.round(tM), rain: Math.round((rpS / idx.length) * 100) };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area") ?? "";
  const day = Math.min(6, Math.max(0, parseInt(searchParams.get("day") ?? "0", 10)));
  const meta = districtMeta(area);
  const font = await loadFont(req);

  let head = HEAD.ok;
  let bigLine = "วางแผนทริปตามฟ้า";
  let sub = "decision engine ที่อ่านฟ้าให้คุณ";
  if (meta) {
    const v = await dayVerdict(meta.lat, meta.lng, day);
    if (v) head = HEAD[v.verdict];
    bigLine = `${head.th} ที่${meta.th}`;
    sub = v ? `${v.tempC}°   ฝน ${v.rain}%   ${day === 0 ? "วันนี้" : day === 1 ? "พรุ่งนี้" : "ที่กำลังจะถึง"}` : `วางแผนทริปที่${meta.th}`;
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, backgroundImage: `linear-gradient(160deg, ${head.sky} 0%, #C9D6E4 40%, #F4EFE6 100%)`, fontFamily: "Thai" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="58" height="58" viewBox="0 0 48 48">
            <circle cx="24" cy="22" r="13" fill={head.sun} />
            <path d="M8 40 a8 8 0 0 1 1.5 -15.7 a11 11 0 0 1 21 1.5 a7 7 0 0 1 -1.5 14.2 Z" fill="#1A1F2B" />
            <line x1="6" y1="40" x2="42" y2="40" stroke="#5B7FB8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 30, color: "#4B5263" }}>อ่านฟ้า · Arnfah</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 88, lineHeight: 1.05, color: "#1A1F2B" }}>{bigLine}</div>
          <div style={{ display: "flex", fontSize: 40, color: "#4B5263" }}>{sub}</div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#8A8F9B" }}>
          พยากรณ์จริง Open-Meteo — ไม่เดาฟ้าให้
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Thai", data: font, weight: 600, style: "normal" }] },
  );
}
