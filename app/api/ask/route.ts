import { NextRequest, NextResponse } from "next/server";
import { nimChat, nimConfigured, extractJson } from "@/lib/ai/nim";
import { sovereignConfigured, sovereignChat } from "@/lib/ai/sovereign";
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { districtMeta, loadDistrict } from "@/lib/poi/districts";
import { getForecast } from "@/lib/weather/chain";
import { buildPlan } from "@/lib/plan/buildPlan";
import { overlayCrowd } from "@/lib/poi/crowd";
import { startIndexForDay } from "@/lib/plan/days";
import { filterByGroups } from "@/lib/plan/categories";
import { bkkNow } from "@/lib/bkkNow";

/**
 * POST /api/ask — "Arnfa AI": an agent that turns a free-text Thai request into a
 * REAL weather-fit plan. (1) NVIDIA NIM extracts intent → (2) the SAME engine the UI
 * uses builds the plan from real forecast + POIs → (3) NIM narrates that real plan.
 * Iron Rule 0: the model only summarises the engine's output — it never invents a
 * place or the weather. Dormant-until-key ({ available:false } without NVIDIA_API_KEY).
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const VIBES = ["cafe", "eat", "nature", "culture", "shopping", "relax"];

type Intent = { area?: string; day?: number; budget?: number; vibes?: string[]; avoidRain?: boolean };

/** Real live traffic incidents (Longdo public feed) within ~km of a point — so the agent can warn
 *  about an actual accident/flood/closure near the area. Iron Rule 0: only real rows, capped; the
 *  model summarises these, it never invents one. Returns [] on any failure. */
async function nearbyIncidents(lat: number, lng: number, km = 15): Promise<{ title: string; titleEn: string }[]> {
  try {
    const r = await fetch("https://event.longdo.com/feed/json", { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const raw = (await r.json()) as { title?: string; title_en?: string; latitude?: string; longitude?: string }[];
    const coslat = Math.cos((lat * Math.PI) / 180);
    return (Array.isArray(raw) ? raw : [])
      .map((e) => ({ title: String(e.title ?? ""), titleEn: String(e.title_en ?? e.title ?? ""), lat: Number(e.latitude), lng: Number(e.longitude) }))
      .filter((e) => e.title && Number.isFinite(e.lat) && Number.isFinite(e.lng))
      .filter((e) => { const dx = (e.lng - lng) * coslat, dy = e.lat - lat; return Math.sqrt(dx * dx + dy * dy) * 111 <= km; })
      .slice(0, 4)
      .map(({ title, titleEn }) => ({ title, titleEn }));
  } catch { return []; }
}

export async function POST(req: NextRequest) {
  if (!nimConfigured()) return NextResponse.json({ available: false, reason: "no_key" });

  let message = "";
  let prior: Intent | null = null;
  try {
    const b = await req.json();
    message = String(b?.message ?? "").slice(0, 500);
    if (b?.prior && typeof b.prior === "object") prior = b.prior as Intent;
  } catch { /* bad body */ }
  if (!message.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  // Ground the day words to offsets (Bangkok local).
  const bkk = new Date(Date.now() + 7 * 3600 * 1000);
  const dow = bkk.getUTCDay();
  const dayLines = Array.from({ length: 7 }, (_, o) => `${o}=${o === 0 ? "วันนี้" : o === 1 ? "พรุ่งนี้" : TH_DOW[(dow + o) % 7]}`).join(", ");
  const areaList = DISTRICTS.map((d) => `${d.key}:${d.th}`).join("\n");

  // 1) Extract intent (JSON) — grounded to real area keys + day offsets.
  const extractSys =
    `คุณคือตัวแยกความต้องการของแอป "อ่านฟ้า" (วางแผนเที่ยวตามสภาพอากาศในไทย) จากข้อความผู้ใช้ ตอบเป็น JSON เท่านั้น:\n` +
    `{"area":"<areaKey ที่ตรงกับย่าน/สถานที่ที่พูดถึงมากสุด ถ้าไม่ระบุให้เลือกที่เหมาะกับแนวที่อยากได้>","day":<0-6>,"budget":<150|240|420>,"vibes":<ส่วนย่อยของ ${JSON.stringify(VIBES)}>,"avoidRain":<true|false>}\n` +
    `วัน: ${dayLines} (default 0) · budget: 150=แวบเดียว 240=ครึ่งวัน 420=ทั้งวัน (default 240)\n` +
    `พื้นที่ทั้งหมด (areaKey:ชื่อไทย):\n${areaList}\nตอบเป็น JSON อย่างเดียว ห้ามมีข้อความอื่น`;
  // Multi-turn: if there's a prior intent, this message PATCHES it (keep unchanged fields)
  // — "เปลี่ยนเป็นพรุ่งนี้" / "แล้วถ้าฝนตกล่ะ" / "ย่านอื่นบ้าง". The engine still owns the plan.
  const priorCtx = prior
    ? `[intent เดิมของผู้ใช้: ${JSON.stringify(prior)} — ข้อความนี้คือการแก้ไข/ต่อยอดจากอันนี้ คงค่าที่ผู้ใช้ไม่ได้เปลี่ยนไว้]\n`
    : "";
  const extractRaw = await nimChat(
    [{ role: "system", content: extractSys }, { role: "user", content: priorCtx + message }],
    { maxTokens: 220, temperature: 0.15 },
  );
  const intent = extractRaw ? extractJson<Intent>(extractRaw) : null;

  // Resolve to a real area key (LLM key → fuzzy name-in-message → default).
  let meta = intent?.area ? districtMeta(intent.area) : undefined;
  if (!meta) {
    const hit = DISTRICTS.find((d) => message.includes(d.th) || (d.en && message.toLowerCase().includes(d.en.toLowerCase())));
    meta = hit ? districtMeta(hit.key) : districtMeta("thonglor");
  }
  if (!meta) return NextResponse.json({ error: "no_area" }, { status: 500 });

  const day = Math.min(6, Math.max(0, Number(intent?.day) || 0));
  const budget = [150, 240, 420].includes(Number(intent?.budget)) ? Number(intent!.budget) : 240;
  const vibes = Array.isArray(intent?.vibes) ? intent!.vibes!.filter((v) => VIBES.includes(v)) : [];
  const avoidRain = !!intent?.avoidRain;

  // 2) Run the REAL engine (same pure code the UI uses).
  let stops: { name: string; category: string; sky: string; arrival: string; tempC: number; rainProb: number; reason: string; crowd: { n: number; okRate: number } | null }[] = [];
  let provider = "";
  try {
    const [districtRaw, forecast] = await Promise.all([loadDistrict(meta.key), getForecast(meta.lat, meta.lng, 168)]);
    const district = await overlayCrowd(districtRaw); // flywheel read-back (crowd-refined profiles)
    const pois = vibes.length ? filterByGroups(district.pois, new Set(vibes)) : district.pois;
    const startHourIndex = startIndexForDay(forecast.hours, day, bkkNow());
    const plan = buildPlan({ ...district, pois }, forecast.hours, { startHourIndex, budgetMin: budget, start: { lat: meta.lat, lng: meta.lng } });
    provider = forecast.providerUsed ?? "";
    stops = plan.stops.map((s) => ({
      name: s.poi.name, category: s.poi.category, sky: s.skyState, arrival: s.arrivalLabel,
      tempC: Math.round(s.tempC), rainProb: Math.round(s.rainProb * 100), reason: s.reason,
      crowd: s.poi.crowd ?? null,
    }));
  } catch {
    return NextResponse.json({ error: "engine_unavailable" }, { status: 503 });
  }

  const dayLabel = day === 0 ? "วันนี้" : day === 1 ? "พรุ่งนี้" : TH_DOW[(dow + day) % 7];

  // Live traffic incidents near the area (real, Longdo) — only meaningful for TODAY's plan.
  const incidents = day === 0 ? await nearbyIncidents(meta.lat, meta.lng) : [];

  // 3) Narrate the REAL plan (the model only summarises what the engine produced).
  const planText = stops.length
    ? stops.map((s, i) => `${i + 1}. ${s.name} (${s.category}) ฟ้า:${s.sky} ${s.tempC}° ฝน${s.rainProb}% ~${s.arrival} — ${s.reason}`).join("\n")
    : "ไม่มีสถานที่ที่เข้ากับเงื่อนไขในช่วงเวลานี้";
  const hazardLine = incidents.length
    ? `\nเหตุจราจรจริงใกล้พื้นที่ตอนนี้ (ข้อมูล Longdo จริง ห้ามแต่งเพิ่ม): ${incidents.map((i) => i.title).join(" / ")}`
    : "";
  const narrateSys =
    `คุณคือ "อ่านฟ้า" ผู้ช่วยวางแผนเที่ยวตามฟ้า ตอบเป็น "ย่อหน้าเดียว" ภาษาไทยอบอุ่นเป็นกันเอง 2-4 ประโยค สรุปแผนจริงด้านล่างแบบเพื่อนแนะนำ ` +
    `⛔ ห้ามใส่ลิสต์ บูลเล็ต หัวข้อ ตัวหนา หรือเลขข้อ เด็ดขาด (ระบบโชว์การ์ดแผนให้อยู่แล้ว) ⛔ ห้ามแต่งชื่อสถานที่ สภาพอากาศ หรือเหตุจราจรเอง ใช้เฉพาะข้อมูลที่ให้ ` +
    `ถ้าแผนช่วยหลบฝน/ฝุ่นให้บอกเหตุผลสั้นๆ ถ้ามีเหตุจราจรจริงใกล้ๆ ให้เตือนสั้นๆ ไม่เกิน 1 ประโยค`;
  const narrateUser = `คำขอผู้ใช้: "${message}"\nพื้นที่: ${meta.th} ${dayLabel}\nแผนจริงจาก engine:\n${planText}${hazardLine}`;
  // Thai-sovereign LLM narrates when configured (อธิปไตย AI), else NVIDIA NIM. Either way
  // it only narrates the engine's real plan.
  const narrateMsgs = [{ role: "system" as const, content: narrateSys }, { role: "user" as const, content: narrateUser }];
  let llm = "nim";
  let answer: string | null = null;
  if (sovereignConfigured()) {
    answer = await sovereignChat(narrateMsgs, { maxTokens: 220, temperature: 0.55 });
    if (answer) llm = "thai-sovereign";
  }
  if (!answer) answer = await nimChat(narrateMsgs, { maxTokens: 220, temperature: 0.55 });
  // Keep only the prose intro — drop any list/header the model still tacks on (the UI shows the cards).
  if (answer) answer = answer.replace(/\n\s*(?:\*\*|[-•*]|\d+[.)])[\s\S]*$/, "").replace(/\*\*/g, "").trim();
  if (!answer) {
    answer = stops.length
      ? `จัดให้แล้วสำหรับ${meta.th} (${dayLabel}) — เริ่มที่ ${stops[0].name} แล้วไล่ตามฟ้าทั้งวัน`
      : `ตอนนี้ยังไม่มีที่แนะนำใน${meta.th} ลองเปลี่ยนวันหรือแนวดูนะ`;
  }

  return NextResponse.json({
    available: true,
    answer,
    plan: { areaKey: meta.key, areaTh: meta.th, areaEn: meta.en, day, dayLabel, budget, stops },
    intent: { area: meta.key, day, budget, vibes, avoidRain }, // echo for the next turn to patch (keep avoidRain so follow-ups don't lose it)
    incidents, // real live traffic incidents near the area (today only) — the UI can surface them too
    provider,
    llm,
    planUrl: `/plan?y=${meta.key}&d=${day}`,
  });
}
