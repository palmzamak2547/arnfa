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
const TOURIST_AREAS = [
  { key: "thonglor", en: "Sukhumvit", zh: "素坤逸", tagEn: "Rooftops, cafés, malls", tagZh: "天台酒吧、咖啡馆、商场", icon: "🍸" },
  { key: "phra-nakhon", en: "Old City", zh: "老城", tagEn: "Grand Palace, Wat Pho, temples", tagZh: "大皇宫、卧佛寺、寺庙", icon: "🛕" },
  { key: "pathum-wan", en: "Siam", zh: "暹罗", tagEn: "Malls, Jim Thompson House", tagZh: "商场、金汤普森之家", icon: "🛍️" },
  { key: "chatuchak", en: "Chatuchak", zh: "札都甲", tagEn: "Weekend Market, parks", tagZh: "周末市场、公园", icon: "🛒" },
  { key: "samphanthawong", en: "Chinatown", zh: "唐人街", tagEn: "Yaowarat street food", tagZh: "耀华力美食街", icon: "🥟" },
  { key: "bang-rak", en: "Riverside", zh: "河滨", tagEn: "Asiatique, river, hotels", tagZh: "河滨夜市、河景、酒店", icon: "🚤" },
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
                  <p className="font-thai text-sm text-ink-muted">{best.tempC}° · {tx("ฝน", "rain", "降雨")} {best.rainProb}%</p>
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
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {TOURIST_AREAS.map((a, i) => (
              <Link key={a.key} href={`/plan?y=${a.key}`} className="group">
                <div className="flex items-baseline gap-2">
                  <span aria-hidden className="text-lg">{a.icon}</span>
                  <h3 className="font-thai-serif text-xl font-light text-ink transition-colors group-hover:text-ink-muted">
                    {lang === "zh" ? a.zh : a.en}{i === 0 && <span className="ml-2 align-middle font-display text-[0.55rem] uppercase tracking-wider text-success">★ {tx("เริ่มที่นี่", "start here", "首选")}</span>}
                  </h3>
                </div>
                <p className="mt-0.5 font-thai text-sm text-ink-faint">{lang === "zh" ? a.tagZh : a.tagEn}</p>
                <p className="mt-1 font-thai text-xs text-rain opacity-0 transition-opacity group-hover:opacity-100">{tx("วางแผนตามฟ้า →", "Plan it around the sky →", "按天气规划 →")}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
