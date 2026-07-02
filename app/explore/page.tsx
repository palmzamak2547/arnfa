"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { useLang } from "@/lib/i18n/useLang";

/**
 * /explore — "Bangkok, planned around the weather" — the TOURIST surface (business model v3:
 * tourists-first). EN/中文-first, attraction-first: a visitor lands with a free afternoon and no
 * idea where to go given the sky → Arnfah picks the weather-clearest iconic area right now + a grid
 * of the must-see zones, each → the real weather-fit planner. Sukhumvit (the beachhead) leads.
 * Iron Rule 0: the "clearest now" spotlight is live from /api/where; degrades to the grid if down.
 */

type Area = { key: string; th: string; en: string; tempC: number; rainProb: number; verdict: string };

// Iconic visitor zones → real district keys (verified). Sukhumvit beachhead first.
// `bg` = a tasteful per-zone gradient derived from the brand palette (sun/rain/success/indoor
// tints) — NOT a fake photo / stock image. Iron Rule 0: a neutral non-fabricated visual.
const TOURIST_AREAS = [
  { key: "thonglor", en: "Sukhumvit", zh: "素坤逸", tagEn: "Rooftops, cafés, malls", tagZh: "天台酒吧、咖啡馆、商场", icon: "🍸", bg: "linear-gradient(150deg,#3E4C63,#6E5A4E)" },
  { key: "phra-nakhon", en: "Old City", zh: "老城", tagEn: "Grand Palace, Wat Pho, temples", tagZh: "大皇宫、卧佛寺、寺庙", icon: "🛕", bg: "linear-gradient(150deg,#C9A24B,#8A6A3A)" },
  { key: "pathum-wan", en: "Siam", zh: "暹罗", tagEn: "Malls, Jim Thompson House", tagZh: "商场、金汤普森之家", icon: "🛍️", bg: "linear-gradient(150deg,#5B7FB8,#3E5680)" },
  { key: "chatuchak", en: "Chatuchak", zh: "札都甲", tagEn: "Weekend Market, parks", tagZh: "周末市场、公园", icon: "🛒", bg: "linear-gradient(150deg,#7BA68A,#4F7A5E)" },
  { key: "samphanthawong", en: "Chinatown", zh: "唐人街", tagEn: "Yaowarat street food", tagZh: "耀华力美食街", icon: "🥟", bg: "linear-gradient(150deg,#D9534A,#9A3B36)" },
  { key: "bang-rak", en: "Riverside", zh: "河滨", tagEn: "Asiatique, river, hotels", tagZh: "河滨夜市、河景、酒店", icon: "🚤", bg: "linear-gradient(150deg,#4A6B8A,#2F4A63)" },
];
const KEYS = new Set(TOURIST_AREAS.map((a) => a.key));

export default function ExplorePage() {
  const { lang } = useLang();
  const tx = (th: string, en: string, zh: string) => (lang === "th" ? th : lang === "zh" ? zh : en);
  const [best, setBest] = useState<Area | null | undefined>(undefined); // undefined=loading, null=none

  useEffect(() => {
    let c = false;
    fetch("/api/where?day=0")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { areas?: Area[] }) => {
        if (c) return;
        const pick = (d.areas ?? []).filter((a) => KEYS.has(a.key)).sort((a, b) => a.rainProb - b.rainProb)[0];
        setBest(pick ?? null);
      })
      .catch(() => { if (!c) setBest(null); });
    return () => { c = true; };
  }, []);

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />

      <section className="arnfa-grid section-minor">
        <div className="col-content">
          <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-ink-faint">{tx("เที่ยวกรุงเทพ", "Bangkok for visitors", "曼谷旅行")}</p>
          <h1 className="mb-4 text-balance font-thai-serif fs-h2 font-light text-ink">{tx("มาเที่ยวกรุงเทพ? เราวางแผนวันให้ตามฟ้า", "New to Bangkok? We plan your day around the weather.", "初来曼谷？让天气帮你安排今天")}</h1>
          <p className="max-w-[56ch] font-thai fs-lead leading-relaxed text-ink-muted">
            {tx(
              "ฟ้าเปิดตรงไหน ฝน/ฝุ่นเลี่ยงยังไง — Arnfah อ่านฟ้าจริง แล้วบอกที่ที่เข้ากับอากาศ ณ เวลาที่คุณจะไปถึง ฝนมาก็สลับเป็นที่ในร่มให้",
              "Where's the sky clearest, how to dodge the rain + dust — Arnfah reads the real sky and matches a place to the weather at the moment you arrive. When rain comes, it swaps you indoors.",
              "哪里天气最好、如何避开雨和雾霾 — Arnfah 读取真实天气，为你匹配到达时最合适的地方。下雨了，就帮你换到室内。",
            )}
          </p>
        </div>
      </section>

      {/* Live spotlight — clearest iconic area right now */}
      {best && (
        <section className="arnfa-grid section-minor">
          <div className="col-content">
            <div className="af-rise overflow-hidden rounded-2xl arnfa-glass" style={{ background: "rgba(255,255,255,0.34)", borderLeft: "3px solid var(--arnfa-success)" }}>
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <p className="mb-1 flex items-center gap-2 font-display text-[0.7rem] uppercase tracking-[0.22em] text-success">
                    <span className="af-blink h-[7px] w-[7px] rounded-full bg-success" />
                    {tx("ตอนนี้ฟ้าโปร่งสุด", "Clearest right now", "现在天气最好")}
                  </p>
                  <h2 className="font-thai-serif text-2xl font-light text-ink">{lang === "th" ? best.th : best.en}</h2>
                  <p className="font-thai text-sm text-ink-muted">{best.tempC}° {tx("ฝน", "rain", "降雨")} {best.rainProb}%</p>
                </div>
                <Link href={`/plan?y=${best.key}`} className="inline-flex h-11 shrink-0 items-center self-start rounded-full bg-ink px-6 font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted sm:self-center">
                  {tx("วางแผนที่นี่ →", "Plan an afternoon here →", "在这里安排行程 →")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* The iconic zones */}
      <section className="arnfa-grid section-minor">
        <div className="col-content">
          <h2 className="mb-5 border-t border-hairline pt-7 font-display text-sm uppercase tracking-[0.2em] text-ink">{tx("ย่านห้ามพลาด", "Must-see zones", "必去区域")}</h2>
          <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {TOURIST_AREAS.map((a, i) => (
              <Link key={a.key} href={`/plan?y=${a.key}`} className="group af-lift block">
                <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-hairline">
                  <div
                    aria-hidden
                    className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    style={{ background: a.bg }}
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(26,31,43,0.62)]" />
                  <span aria-hidden className="absolute right-3 top-3 text-2xl opacity-80 drop-shadow-[0_1px_4px_rgba(26,31,43,0.5)]">{a.icon}</span>
                  {i === 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-paper px-2.5 py-1 font-display text-[0.55rem] uppercase tracking-wider text-success">
                      ★ {tx("เริ่มที่นี่", "start here", "首选")}
                    </span>
                  )}
                  <div className="absolute inset-x-4 bottom-3.5">
                    <h3 className="font-thai-serif text-xl font-light leading-tight text-paper">{lang === "zh" ? a.zh : a.en}</h3>
                    <p className="mt-0.5 font-thai text-xs text-paper/85">{lang === "zh" ? a.tagZh : a.tagEn}</p>
                  </div>
                </div>
                <p className="mt-2 px-0.5 font-thai text-xs text-rain opacity-0 transition-opacity duration-300 group-hover:opacity-100">{tx("วางแผนรอบฟ้า →", "Plan it around the sky →", "按天气规划 →")}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TAT Events — real festivals & events from การท่องเที่ยวแห่งประเทศไทย ── */}
      <TatEventsSection lang={lang} tx={tx} />

      {/* ── TAT Routes — recommended travel routes from ททท. ── */}
      <TatRoutesSection lang={lang} tx={tx} />

      {/* Tourist tips — rain backup + partner mobility */}
      <section className="arnfa-grid section-minor">
        <div className="col-content grid gap-6 border-t border-hairline pt-7 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-display text-[0.7rem] uppercase tracking-[0.18em] text-indoor-warm">{tx("ฝนมาก็ไม่พัง", "Rain won't ruin it", "下雨也不怕")}</p>
            <p className="font-thai text-sm leading-relaxed text-ink-muted">{tx("ฝนเข้าเมื่อไหร่ Arnfah สลับให้เป็นคาเฟ่/ห้าง/พิพิธภัณฑ์ในร่มที่ดีกว่าตรงนั้น อัตโนมัติ", "When rain hits, Arnfah swaps your plan to a café, mall or museum that's better indoors — automatically.", "下雨时，Arnfah 自动把行程换成更适合的咖啡馆、商场或博物馆。")}</p>
          </div>
          <div>
            <p className="mb-1 font-display text-[0.7rem] uppercase tracking-[0.18em] text-ink-faint">{tx("ไปง่าย", "Getting around", "交通")}</p>
            <p className="font-thai text-sm leading-relaxed text-ink-muted">{tx("รถไฟฟ้า BTS/MRT, MuvMi (รถ EV), Grab — บอกให้ในแต่ละแผน", "BTS/MRT trains, MuvMi (EV tuk-tuk) + Grab — surfaced in every plan.", "BTS/MRT 轻轨、MuvMi（电动嘟嘟车）、Grab — 每个行程都会提示。")}</p>
          </div>
        </div>
      </section>

      {/* Travel Choice ML Showcase */}
      <section className="arnfa-grid section-minor">
        <div className="col-content border-t border-hairline pt-7">
          <div className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-r from-sky-50/60 to-indigo-50/20 p-6 shadow-sm hover:shadow transition-shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="mb-1 font-display text-[0.7rem] uppercase tracking-[0.18em] text-sky-600 font-semibold">{tx("การเรียนรู้ของเครื่อง", "Machine Learning Showcase", "机器学习")}</p>
                <h3 className="font-thai-serif text-xl font-light text-ink">{tx("จำลองโหมดการเดินทาง (ML Choice)", "Interactive Travel Mode Choice Sandbox", "出行选择交互式沙盒")}</h3>
                <p className="mt-1.5 max-w-[60ch] font-thai text-xs leading-relaxed text-ink-muted">
                  {tx(
                    "ศึกษาและเปรียบเทียบพฤติกรรมการตัดสินใจเลือกพาหนะ ระหว่างการเดินเท้า จักรยาน รถสาธารณะ และรถยนต์ส่วนตัว ผ่านตัวแบบทางพฤติกรรมดั้งเดิมกับโมเดลโครงข่ายยุคใหม่ (Random Forest, Gradient Boosting, Deep Neural Networks) บนฐานข้อมูลจริง",
                    "Simulate and compare travel choices (Walk, Bike, Public Transit, or Driving) using classical behavioral models versus state-of-the-art machine learning models trained on actual travel survey data.",
                    "通过实际出行调查数据训练的经典行为模型与最先进的机器学习模型，模拟并对比步行、自行车、公共交通和自驾的选择。"
                  )}
                </p>
              </div>
              <Link href="/explore/travel-mode-choice" className="inline-flex h-11 shrink-0 items-center rounded-full bg-ink px-6 font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted">
                {tx("ทดลองเล่นโมเดล →", "Explore Sandbox →", "探索沙盒 →")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="arnfa-grid section-major">
        <div className="col-content">
          <Link href="/plan" className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-thai text-base font-medium text-paper transition-colors hover:bg-ink-muted">
            {tx("วางแผนบ่ายนี้ →", "Plan your afternoon →", "安排今天下午 →")}
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

// ── TAT Events sub-component ────────────────────────────────────────────────
type TatEvent = { eventId: number; name: string; introduction: string; startDate: string; endDate: string; thumbnailUrl: string; location: { province: { name: string } } };
type Tx = (th: string, en: string, zh: string) => string;

function TatEventsSection({ lang, tx }: { lang: string; tx: Tx }) {
  const [events, setEvents] = useState<TatEvent[]>([]);
  useEffect(() => {
    fetch("/api/tat?events=1&limit=6")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { events: TatEvent[] }) => setEvents(d.events ?? []))
      .catch(() => {});
  }, []);
  if (events.length === 0) return null;
  return (
    <section className="arnfa-grid section-minor">
      <div className="col-content">
        <h2 className="mb-5 border-t border-hairline pt-7 font-display text-sm uppercase tracking-[0.2em] text-ink flex items-center gap-2">
          <span>🎪</span> {tx("งาน/เทศกาลน่าไป", "Events & Festivals", "活动和节日")}
          <span className="ml-auto font-thai text-[0.65rem] font-normal normal-case tracking-normal text-ink-faint">{tx("ข้อมูลจาก ททท.", "from TAT", "来自TAT")}</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(ev => {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            const fmt = (d: Date) => d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short" });
            return (
              <div key={ev.eventId} className="group overflow-hidden rounded-2xl border border-hairline bg-white/60 shadow-sm hover:shadow transition-shadow">
                {ev.thumbnailUrl && (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={ev.thumbnailUrl} alt={ev.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute bottom-2 left-3 rounded-full bg-white/90 px-2.5 py-1 font-thai text-[0.6rem] font-medium text-ink">{ev.location?.province?.name}</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-thai text-sm font-semibold text-ink leading-snug line-clamp-2">{ev.name}</h3>
                  <p className="mt-1 font-thai text-xs text-ink-faint">{fmt(start)} — {fmt(end)}</p>
                  {ev.introduction && <p className="mt-2 font-thai text-xs text-ink-muted line-clamp-2">{ev.introduction}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── TAT Routes sub-component ────────────────────────────────────────────────
type TatRoute = { routeId: number; name: string; introduction: string; numberOfDays: number; thumbnailUrl: string; placeImageUrls: string[] };

function TatRoutesSection({ lang, tx }: { lang: string; tx: Tx }) {
  const [routes, setRoutes] = useState<TatRoute[]>([]);
  useEffect(() => {
    fetch("/api/tat?routes=1&limit=4")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { routes: TatRoute[] }) => setRoutes(d.routes ?? []))
      .catch(() => {});
  }, []);
  if (routes.length === 0) return null;
  return (
    <section className="arnfa-grid section-minor">
      <div className="col-content">
        <h2 className="mb-5 border-t border-hairline pt-7 font-display text-sm uppercase tracking-[0.2em] text-ink flex items-center gap-2">
          <span>🗺️</span> {tx("เส้นทางแนะนำจาก ททท.", "Recommended Routes", "推荐路线")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {routes.map(rt => (
            <div key={rt.routeId} className="group overflow-hidden rounded-2xl border border-hairline bg-white/60 shadow-sm hover:shadow transition-shadow">
              {rt.thumbnailUrl && (
                <div className="relative aspect-[21/9] overflow-hidden">
                  <img src={rt.thumbnailUrl} alt={rt.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute bottom-2 right-3 rounded-full bg-white/90 px-2.5 py-1 font-thai text-[0.6rem] font-medium text-ink">{rt.numberOfDays} {tx("วัน", "days", "天")}</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-thai text-sm font-semibold text-ink leading-snug line-clamp-2">{rt.name}</h3>
                {rt.introduction && <p className="mt-1 font-thai text-xs text-ink-muted line-clamp-2">{rt.introduction}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
