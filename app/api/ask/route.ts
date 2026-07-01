import { NextRequest, NextResponse } from "next/server";
import { nimChat, nimConfigured, extractJson } from "@/lib/ai/nim";
import { sovereignConfigured, sovereignChat, isMostlyThai } from "@/lib/ai/sovereign";
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { districtMeta, loadDistrict } from "@/lib/poi/districts";
import { getForecast } from "@/lib/weather/chain";
import { buildPlan } from "@/lib/plan/buildPlan";
import { overlayCrowd } from "@/lib/poi/crowd";
import { startIndexForDay } from "@/lib/plan/days";
import { filterByGroups } from "@/lib/plan/categories";
import { bkkNow } from "@/lib/bkkNow";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";
import { fetchAirForecast, dayPeak, airPeakIsBad } from "@/lib/air/forecast";
import { fetchFloodTrend } from "@/lib/flood/flood";
import { TfIdfRecommender } from "@/lib/ai/recommender";
import { getNvidiaEmbedding, cosineSimilarity } from "@/lib/ai/embeddings";
import fs from "fs";
import path from "path";

/**
 * POST /api/ask — "Arnfa AI": an agent that turns a free-text Thai request into a
 * REAL weather-fit plan. (1) NVIDIA NIM extracts intent → (2) the SAME engine the UI
 * uses builds the plan from real forecast + POIs → (3) NIM narrates that real plan.
 * Iron Rule 0: the model only summarises the engine's output — it never invents a
 * place or the weather. Dormant-until-key ({ available:false } without NVIDIA_API_KEY).
 */

export const runtime = "nodejs";
export const maxDuration = 45; // Pro headroom; the nimChat deadline budgets keep real latency well under this

// Module-level cache for NVIDIA POI embeddings (persists across requests)
let _poiEmbeddingsCache: Record<string, number[]> | null = null;

const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const VIBES = ["cafe", "eat", "nature", "culture", "shopping", "relax"];

type Intent = { area?: string; day?: number; budget?: number; vibes?: string[]; avoidRain?: boolean };

/** Real live traffic incidents (Longdo public feed) within ~km of a point — so the agent can warn
 *  about an actual accident/flood/closure near the area. Iron Rule 0: only real rows, capped; the
 *  model summarises these, it never invents one. Returns [] on any failure. */
async function nearbyIncidents(lat: number, lng: number, km = 15): Promise<{ title: string; titleEn: string }[]> {
  try {
    const r = await fetch("https://event.longdo.com/feed/json", { signal: AbortSignal.timeout(4000) });
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
  const rl = rateLimit(`ask:${clientIp(req)}`, 12, 60_000); // protect the free NIM/ThaiLLM quota from a flood
  if (!rl.ok) return tooMany(rl.retryAfter);

  let message = "";
  let prior: Intent | null = null;
  let customSovereign: { apiKey?: string; model?: string; baseUrl?: string } | null = null;
  try {
    const b = await req.json();
    message = String(b?.message ?? "").slice(0, 500);
    if (b?.prior && typeof b.prior === "object") prior = b.prior as Intent;
    if (b?.customSovereign && typeof b.customSovereign === "object") {
      customSovereign = b.customSovereign;
    }
  } catch { /* bad body */ }
  if (!message.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const isSovereignActive = sovereignConfigured() || !!(customSovereign?.apiKey && customSovereign?.model);
  const hasLlmAccess = nimConfigured() || isSovereignActive;
  if (!hasLlmAccess) return NextResponse.json({ available: false, reason: "no_key" });

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

  let extractRaw: string | null = null;
  if (nimConfigured()) {
    extractRaw = await nimChat(
      [{ role: "system", content: extractSys }, { role: "user", content: priorCtx + message }],
      { maxTokens: 220, temperature: 0.15, deadlineMs: Date.now() + 9000 },
    );
  } else if (isSovereignActive) {
    extractRaw = await sovereignChat(
      [{ role: "system", content: extractSys }, { role: "user", content: priorCtx + message }],
      {
        maxTokens: 220,
        temperature: 0.15,
        deadlineMs: Date.now() + 9000,
        apiKey: customSovereign?.apiKey,
        model: customSovereign?.model,
        baseUrl: customSovereign?.baseUrl,
      },
    );
  }
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
  let stops: { id: string; name: string; category: string; sky: string; arrival: string; tempC: number; rainProb: number; reason: string; crowd: { n: number; okRate: number } | null }[] = [];
  let provider = "";
  try {
    const [districtRaw, forecast] = await Promise.all([loadDistrict(meta.key), getForecast(meta.lat, meta.lng, 168)]);
    const district = await overlayCrowd(districtRaw); // flywheel read-back (crowd-refined profiles)
    let pois = district.pois;
    const query = message + " " + vibes.join(" ");
    
    if (query.trim().length > 0) {
      // 1) Try NVIDIA Embeddings first

      let nvidiaScores: Array<{id: string, score: number}> = [];
      try {
        if (!_poiEmbeddingsCache) {
          const embeddingsPath = path.join(process.cwd(), "data", "poi_embeddings.json");
          if (fs.existsSync(embeddingsPath)) {
            _poiEmbeddingsCache = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));
          }
        }
        
        if (_poiEmbeddingsCache) {
          const queryVecArray = await getNvidiaEmbedding(query);
          
          if (queryVecArray && queryVecArray.length > 0) {
            const queryVec = queryVecArray[0];
            nvidiaScores = district.pois.map(p => {
              const vec = _poiEmbeddingsCache![p.id];
              return { id: p.id, score: vec ? cosineSimilarity(queryVec, vec) : 0 };
            });
          }
        }
      } catch (e) {
        console.error("NVIDIA Embedding search failed", e);
      }

      // 2) Fallback to TF-IDF if NVIDIA API failed or cache is missing
      if (nvidiaScores.length === 0) {
        const recommender = new TfIdfRecommender();
        for (const p of district.pois) {
          const text = `${p.name} ${p.category} ${p.th || p.en || ""}`;
          recommender.addDocument(p.id, text);
        }
        recommender.build();
        nvidiaScores = recommender.recommend(query, 20);
      }

      // 3) Filter and Rank Top POIs
      const scoredIds = new Set(nvidiaScores.filter(s => s.score > 0.05).map(s => s.id));
      if (scoredIds.size > 0) {
        pois = district.pois.filter(p => scoredIds.has(p.id));
        const scoreMap = new Map(nvidiaScores.map(s => [s.id, s.score]));
        pois.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));
        pois = pois.slice(0, 20); // Top 20 best matches
      } else {
        pois = vibes.length ? filterByGroups(district.pois, new Set(vibes)) : district.pois;
      }
    } else {
      pois = vibes.length ? filterByGroups(district.pois, new Set(vibes)) : district.pois;
    }

    const startHourIndex = startIndexForDay(forecast.hours, day, bkkNow());
    const plan = buildPlan({ ...district, pois }, forecast.hours, { startHourIndex, budgetMin: budget, start: { lat: meta.lat, lng: meta.lng } });
    provider = forecast.providerUsed ?? "";
    stops = plan.stops.map((s, i) => {
      const isRaining = s.skyState === "rain" || s.skyState === "storm";
      
      let routeFromPrev = undefined;
      if (i > 0) {
        // Mock Citymapper-style route
        if (isRaining) {
          routeFromPrev = {
            summary: "แท็กซี่ / Grab",
            summaryEn: "Taxi / Grab",
            mode: "taxi",
            durationMin: Math.floor(Math.random() * 15) + 10,
            totalCost: Math.floor(Math.random() * 50) + 60,
            weatherWarning: "ฝนกำลังตก แนะนำให้นั่งรถเพื่อความสะดวก",
            weatherWarningEn: "It's raining. Taking a taxi is recommended.",
            steps: [
              { mode: "walk", instruction: "เดินไปจุดเรียกฝั่งตรงข้าม", instructionEn: "Walk to pickup point", timeMin: 1 },
              { mode: "taxi", instruction: `นั่งรถไปยัง ${s.poi.name}`, instructionEn: `Ride to ${s.poi.name}`, timeMin: 12, price: 85, icon: "🚕" }
            ]
          };
        } else {
          const isFar = Math.random() > 0.5;
          if (isFar) {
            routeFromPrev = {
              summary: "รถไฟฟ้า BTS",
              summaryEn: "BTS Skytrain",
              mode: "transit",
              durationMin: Math.floor(Math.random() * 10) + 5,
              totalCost: 35,
              steps: [
                { mode: "walk", instruction: "เดินไปสถานี", instructionEn: "Walk to station", timeMin: 3 },
                { mode: "bts", instruction: "สายสีเขียว อ่อนนุช", instructionEn: "Green Line to On Nut", timeMin: 8, price: 35, lineColor: "#10B981" },
                { mode: "walk", instruction: `เดินไป ${s.poi.name}`, instructionEn: `Walk to ${s.poi.name}`, timeMin: 2 }
              ]
            };
          } else {
            routeFromPrev = {
              summary: "เดิน",
              summaryEn: "Walk",
              mode: "walk",
              durationMin: Math.floor(Math.random() * 10) + 3,
              steps: [
                { mode: "walk", instruction: `เดินลัดซอยไป ${s.poi.name}`, instructionEn: `Walk through alley to ${s.poi.name}`, timeMin: 5 }
              ]
            };
          }
        }
      }

      return {
        id: s.poi.id,
        name: s.poi.name, category: s.poi.category, sky: s.skyState, arrival: s.arrivalLabel,
        tempC: Math.round(s.tempC), rainProb: Math.round(s.rainProb * 100), reason: s.reason,
        crowd: s.poi.crowd ?? null,
        routeFromPrev,
      };
    });
  } catch (e) {
    console.error("Engine failed:", e);
    return NextResponse.json({ error: "engine_unavailable" }, { status: 503 });
  }

  const dayLabel = day === 0 ? "วันนี้" : day === 1 ? "พรุ่งนี้" : TH_DOW[(dow + day) % 7];

  // Real environmental signals near the area (parallel, all real open data, tight timeouts):
  //  · live traffic incidents (Longdo, today only) · air-quality FORECAST peak (Open-Meteo CAMS) ·
  //  · river-basin discharge trend (GloFAS). The model may mention these but never invents them.
  const [incidents, airPeak, flood] = await Promise.all([
    day === 0 ? nearbyIncidents(meta.lat, meta.lng) : Promise.resolve([]),
    fetchAirForecast(meta.lat, meta.lng, Math.min(day + 1, 7), AbortSignal.timeout(4000))
      .then((h) => dayPeak(h, day)).catch(() => null),
    fetchFloodTrend(meta.lat, meta.lng, AbortSignal.timeout(4000)).catch(() => null),
  ]);

  // 3) Narrate the REAL plan (the model only summarises what the engine produced).
  const planText = stops.length
    ? stops.map((s, i) => `${i + 1}. ${s.name} (${s.category}) ฟ้า:${s.sky} ${s.tempC}° ฝน${s.rainProb}% ~${s.arrival} — ${s.reason}`).join("\n")
    : "ไม่มีสถานที่ที่เข้ากับเงื่อนไขในช่วงเวลานี้";
  const hazardLine = incidents.length
    ? `\nเหตุจราจรจริงใกล้พื้นที่ตอนนี้ (ข้อมูล Longdo จริง ห้ามแต่งเพิ่ม): ${incidents.map((i) => i.title).join(" / ")}`
    : "";
  // Forward dust warning (real CAMS forecast, framed as forecast not measured-now).
  const airLine = airPeak && airPeakIsBad(airPeak)
    ? `\nพยากรณ์ฝุ่นล่วงหน้า (Open-Meteo CAMS จริง — เป็น "พยากรณ์" ไม่ใช่ค่าวัดสด): วันนั้นฝุ่นจะขึ้นไปแตะ PM2.5 ~${airPeak.pm25} (US-AQI ${airPeak.usAqi}) ราว ${airPeak.iso.slice(11, 16)} น. — เตือนให้เลี่ยงกิจกรรมกลางแจ้งช่วงนั้นได้`
    : "";
  // River-basin trend (GloFAS) — ONLY as basin context, never street flooding.
  const floodLine = flood && flood.trend === "rising"
    ? `\nระดับน้ำในแม่น้ำสายหลัก (ลุ่มเจ้าพระยา, GloFAS จริง) มีแนวโน้มสูงขึ้นช่วงสัปดาห์นี้ — พูดได้แค่เป็น "บริบทลุ่มน้ำ" ⛔ ห้ามบอกว่าถนน/ย่านจะน้ำท่วม (ข้อมูลนี้ไม่ได้บอกน้ำท่วมถนน)`
    : "";

  const narrateSys =
    `คุณคือ "อ่านฟ้า" ผู้ช่วยวางแผนเที่ยวส่วนตัวตามสภาพอากาศจริง ตอบเป็นภาษาไทยที่สุภาพ อบอุ่น เป็นกันเอง และเข้าใจง่ายสำหรับคนทั่วไป ` +
    `ตอบสรุปกระชับความยาว 2-4 ประโยคเป็น "ย่อหน้าเดียว" เท่านั้น เพื่อแนะนำทริปแบบเพื่อนสนิทชวนเที่ยว ` +
    `⛔ ห้ามตอบด้วยภาษาอื่นที่ไม่ใช่ภาษาไทยเด็ดขาด ` +
    `⛔ ห้ามใส่สัญลักษณ์ลิสต์ บูลเล็ต หัวข้อ ย่อย หรือตัวเลขข้อเด็ดขาด (เพราะ UI จะวาดการ์ดแสดงรายการให้อยู่แล้ว) ` +
    `⛔ ห้ามใช้ตัวหนา (**) หรือสัญลักษณ์พิเศษในการตกแต่งข้อความ ` +
    `⛔ ห้ามแต่งชื่อสถานที่ พยากรณ์อากาศ หรือตัวเลขเพิ่มเติมเองเด็ดขาด ให้ใช้เฉพาะข้อมูลตามที่ระบุไว้เท่านั้น ` +
    `ถ้าในทริปมีการหลบฝนหรือหลบฝุ่นให้บอกเหตุผลสั้นๆ ถ้ามีเหตุจราจรติดขัดหรืออุบัติเหตุให้เตือนเบาๆ 1 ประโยค และหากมีระดับน้ำแม่น้ำสูงให้พูดถึงในฐานะ "ข้อมูลลุ่มน้ำทั่วไป" โดยห้ามบอกว่าถนนจะน้ำท่วม`;

  const narrateUser = `คำขอผู้ใช้: "${message}"\nพื้นที่: ${meta.th} ${dayLabel}\nแผนจริงจาก engine:\n${planText}${hazardLine}${airLine}${floodLine}`;
  // Thai-sovereign LLM narrates when configured (อธิปไตย AI), else NVIDIA NIM. Either way
  // it only narrates the engine's real plan.
  const narrateMsgs = [{ role: "system" as const, content: narrateSys }, { role: "user" as const, content: narrateUser }];
  let llm = "nim";
  let answer: string | null = null;

  if (isSovereignActive) {
    const s = await sovereignChat(narrateMsgs, {
      maxTokens: 220,
      temperature: 0.5,
      deadlineMs: Date.now() + 7000,
      apiKey: customSovereign?.apiKey,
      model: customSovereign?.model,
      baseUrl: customSovereign?.baseUrl,
    });
    // only accept it if it actually came back in Thai (the 8B preview occasionally replies in
    // Chinese/English — fall back to NIM rather than show that on a Thai app)
    if (s && isMostlyThai(s)) { answer = s; llm = "thai-sovereign"; }
  }

  if (!answer && nimConfigured()) {
    answer = await nimChat(narrateMsgs, { maxTokens: 220, temperature: 0.55, deadlineMs: Date.now() + 11000 });
  }

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
    airForecast: airPeak && airPeakIsBad(airPeak) ? airPeak : null, // forward dust peak (CAMS), only if unhealthy
    flood: flood ? { trend: flood.trend, todayDischarge: flood.todayDischarge } : null, // river-basin context only
    provider,
    llm,
    planUrl: `/plan?y=${meta.key}&d=${day}`,
  });
}
