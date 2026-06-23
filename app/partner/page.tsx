"use client";

import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { MerchantCTA } from "@/components/MerchantCTA";
import { useLang } from "@/lib/i18n/useLang";

/**
 * /partner — the B2B revenue front door (business model v3). Venues (cafés, malls, restaurants)
 * sign up to be the weather-matched recommendation. The sell = rainy-day demand: when it rains,
 * people don't know where to go indoors → Arnfah routes them to a partner venue → the venue
 * captures demand it would otherwise LOSE. Users stay free. Honest: this is a lead intake
 * (writes to arnfa.merchant_lead via MerchantCTA) — early access, we reach out; no fake deals.
 */
export default function PartnerPage() {
  const { en, lang } = useLang();
  const tx = (th: string, enS: string, zh: string) => (lang === "zh" ? zh : en ? enS : th);

  const steps = [
    { n: "๑", th: ["ฝนเข้า ฟ้าปิด", "ลูกค้าไม่รู้จะไปไหน"], en: ["Rain rolls in", "people don't know where to go"], zh: ["下雨了", "客人不知道去哪儿"] },
    { n: "๒", th: ["Arnfah สลับแผน", "เป็นที่ในร่มที่ดีตอนฝน — ร้านคุณ"], en: ["Arnfah swaps the plan", "to a great rainy-day indoor spot — yours"], zh: ["Arnfah 切换行程", "到适合雨天的室内地点 — 你的店"] },
    { n: "๓", th: ["ลูกค้าเดินเข้า", "demand ที่ปกติคุณจะเสียไป"], en: ["A customer walks in", "demand you'd otherwise have lost"], zh: ["客人上门", "本会流失的客流"] },
  ];

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />

      <section className="arnfa-grid section-minor">
        <div className="col-content">
          <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-ink-faint">{tx("สำหรับร้านค้า", "For venues", "商家合作")}</p>
          <h1 className="mb-4 text-balance font-thai-serif fs-h2 font-light text-ink">
            {tx("ให้ลูกค้าเจอคุณ ตอนที่ฟ้าพาเขามา", "Reach customers when the weather sends them your way", "天气把客人带向你")}
          </h1>
          <p className="max-w-[56ch] font-thai fs-lead leading-relaxed text-ink-muted">
            {tx(
              "ตอนฝนตก คนไม่รู้จะหลบเข้าที่ไหน — Arnfah ส่งเขามาที่ร้านในร่มที่เข้ากับอากาศตอนนั้น. คุณได้ลูกค้าในวันที่ปกติจะเงียบ. ผู้ใช้ฟรีตลอด คุณจ่ายเฉพาะตอนเป็นตัวเลือกที่ถูกแนะนำ.",
              "When it rains, people don't know where to take shelter — Arnfah routes them to an indoor spot that fits the weather. You win customers on the days you'd usually be quiet. Users are free forever; you pay only to be the weather-matched pick.",
              "下雨时，人们不知道去哪里避雨 — Arnfah 把他们引导到适合当下天气的室内地点。你在平时冷清的日子也能获客。用户永久免费，你只为成为天气匹配的推荐而付费。",
            )}
          </p>
        </div>
      </section>

      {/* How rainy-day demand-routing works */}
      <section className="arnfa-grid section-minor">
        <div className="col-content border-t border-hairline pt-7">
          <h2 className="mb-5 font-display text-sm uppercase tracking-[0.2em] text-ink">{tx("ทำงานยังไง", "How it works", "如何运作")}</h2>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {steps.map((s) => {
              const lines = lang === "zh" ? s.zh : en ? s.en : s.th;
              return (
                <div key={s.n}>
                  <span className="font-thai-serif text-2xl font-light text-ink-faint">{s.n}</span>
                  <p className="mt-1 font-thai-serif text-lg font-light leading-snug text-ink">{lines[0]}</p>
                  <p className="mt-0.5 font-thai text-sm text-ink-muted">{lines[1]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why it's fair + the intake */}
      <section className="arnfa-grid section-minor">
        <div className="col-content grid gap-8 border-t border-hairline pt-7 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-thai-serif text-2xl font-light text-ink">{tx("แฟร์ และจริง", "Fair, and real", "公平、真实")}</h2>
            <ul className="space-y-2 font-thai text-sm leading-relaxed text-ink-muted">
              <li>• {tx("เราไม่ขึ้นดีลปลอม — โชว์เฉพาะของจริง", "No fake deals — only real ones ever show", "绝不虚构优惠 — 只显示真实优惠")}</li>
              <li>• {tx("demand เพิ่ม ไม่ใช่แย่ง — ลูกค้าที่ฝนพัดมา", "Incremental demand, not cannibalised — the foot traffic rain sends you", "增量客流，而非抢夺 — 雨天为你带来的客人")}</li>
              <li>• {tx("ติดป้าย ◆ พาร์ทเนอร์ ชัดเจน", "Labelled ◆ partner, transparent", "明确标注 ◆ 合作伙伴")}</li>
              <li>• {tx("ผู้ใช้ฟรีตลอด — เราโตไปด้วยกัน", "Users free forever — we grow together", "用户永久免费 — 共同成长")}</li>
            </ul>
          </div>
          <div className="arnfa-glass rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.34)" }}>
            <p className="mb-3 font-display text-[0.7rem] uppercase tracking-[0.18em] text-success">{tx("เปิดรับร้านพาร์ทเนอร์ (early access)", "Partner early access", "合作招募（抢先体验）")}</p>
            <MerchantCTA />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
