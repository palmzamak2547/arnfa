"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { DATA_SOURCES, KIND_LABEL, KIND_ORDER, ACTIVE_SOURCE_COUNT, THAI_GOV_COUNT, type DataKind } from "@/lib/data/sources";
import districtAir from "@/lib/data/bmaDistrictAir.snapshot.json";

/**
 * /data — "FACT not estimation" made auditable. Every real source Arnfah runs on, with its
 * organisation, license, and what it powers — the BDI "cite source + License" rule as a page.
 * Derived from lib/data/sources so it can never drift from what the app actually uses.
 */
const TOTAL_POIS = DISTRICTS.reduce((a, d) => a + d.count, 0);

export default function DataPage() {
  const { en } = useLang();
  const grouped = KIND_ORDER.map((k) => ({ kind: k as DataKind, items: DATA_SOURCES.filter((s) => s.kind === k) })).filter((g) => g.items.length);

  const stats = [
    { n: ACTIVE_SOURCE_COUNT, th: "แหล่งข้อมูลเปิด", en: "open sources" },
    { n: THAI_GOV_COUNT, th: "ข้อมูลทางการรัฐไทย", en: "Thai-gov sources" },
    { n: TOTAL_POIS.toLocaleString("en-US"), th: "สถานที่จริง", en: "real places" },
    { n: 0, th: "ตัวเลขที่กุขึ้น", en: "fabricated numbers" },
  ];

  return (
    <main className="relative z-10 min-h-screen">
      <header className="arnfa-grid section-minor pad-safe-t">
        <div className="col-content flex items-center justify-between">
          <Link href="/" className="text-ink hover:text-ink-muted transition-colors"><Logo className="text-xl" animate={false} /></Link>
          <div className="flex items-center gap-4">
            <Link href="/status" className="font-thai text-sm text-rain hover:underline">{en ? "Live status" : "สถานะระบบ"}</Link>
            <Link href="/plan" className="font-thai text-sm text-rain hover:underline">{en ? "Plan" : "วางแผน"}</Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <section className="arnfa-grid">
        <div className="col-content max-w-3xl">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-4">{en ? "FACT, not estimation" : "FACT ไม่ใช่การประมาณการ"}</p>
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-4 text-balance">{en ? "Every number, traced to its source" : "ทุกตัวเลข สืบไปถึงแหล่งที่มาได้"}</h1>
          <p className="font-thai fs-lead text-ink-muted leading-relaxed mb-6">
            {en
              ? "Arnfah is built on open data — including official Thai-government datasets. Nothing here is invented: when the data isn't available, the app says so."
              : "อ่านฟ้าสร้างบนข้อมูลเปิด รวมถึงชุดข้อมูลทางการของรัฐไทย ไม่มีการกุข้อมูลขึ้นเอง ถ้าไม่มีข้อมูล แอปจะบอกตรงๆ"}
          </p>

          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 border-y border-hairline py-7 mb-10">
            {stats.map((s) => (
              <div key={s.en}>
                <div className="font-display text-3xl sm:text-4xl text-ink tabular-nums">{s.n}</div>
                <p className="font-thai text-xs text-ink-faint mt-1">{en ? s.en : s.th}</p>
              </div>
            ))}
          </div>

          {/* the catalog */}
          <div className="space-y-9">
            {grouped.map((g) => (
              <div key={g.kind}>
                <h2 className="font-display text-xs uppercase tracking-[0.18em] text-ink-faint mb-3 pb-2 border-b border-hairline">{en ? KIND_LABEL[g.kind].en : KIND_LABEL[g.kind].th}</h2>
                <ul className="divide-y divide-hairline">
                  {g.items.map((it) => (
                    <li key={it.key} className="py-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-ink hover:text-rain transition-colors">{it.name}</a>
                        {it.thaiGov && <span className="ml-2 font-thai text-[0.6rem] rounded-full bg-rain/10 px-1.5 py-0.5 text-rain align-middle">{en ? "Thai gov" : "ทางการ"}</span>}
                        {it.dormant && <span className="ml-2 font-thai text-[0.6rem] rounded-full bg-ink-faint/10 px-1.5 py-0.5 text-ink-faint align-middle">{en ? "ready (needs key)" : "พร้อม (รอ key)"}</span>}
                        <p className="font-thai text-sm text-ink-muted mt-0.5">{en ? it.roleEn : it.role} · <span className="text-ink-faint">{en ? it.orgEn : it.org}</span></p>
                      </div>
                      <span className="font-thai text-xs text-ink-faint shrink-0">{it.license}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* official monthly PM2.5 by monitoring point — the "เข้าใจเมือง" context layer */}
          {districtAir.districts.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xs uppercase tracking-[0.18em] text-ink-faint mb-1">{en ? "PM2.5 by monitoring point · BMA (latest month)" : "PM2.5 รายจุดตรวจ กทม. (เดือนล่าสุด)"}</h2>
              <p className="font-thai text-sm text-ink-muted mb-3">{en ? "Official monthly context — which areas usually carry the most dust. Real-time PM2.5 comes from Air4Thai (above)." : "บริบทตามฤดูจากข้อมูลทางการ — จุดไหนฝุ่นเยอะเป็นปกติ (ค่าเรียลไทม์มาจาก Air4Thai ด้านบน)"}</p>
              <ul className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                {districtAir.districts.slice(0, 8).map((d) => (
                  <li key={d.district} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-hairline/60">
                    <span className="font-thai text-sm text-ink truncate">{d.district}</span>
                    <span className="font-thai text-xs text-ink-faint shrink-0 tabular-nums">{d.avg} µg/m³ · {en ? `${d.exceedDays}d over std` : `เกินมาตรฐาน ${d.exceedDays} วัน`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* honesty note */}
          <div className="mt-10 rounded-2xl border border-hairline bg-surface/50 p-5">
            <p className="font-thai text-sm text-ink-muted leading-relaxed">
              {en
                ? "Some Thai-government portals block cloud servers, so for those (e.g. BMA parks + cooling centers) we bundle a dated snapshot of the real official data and refresh it live whenever the portal is reachable — it's the official dataset either way."
                : "บาง portal ของรัฐไทยบล็อกเซิร์ฟเวอร์คลาวด์ สำหรับชุดนั้น (เช่น สวน + ห้องหลบร้อน กทม.) เราเก็บ snapshot ของข้อมูลจริงทางการไว้พร้อมวันที่ และดึงสดเมื่อ portal เข้าถึงได้ ทั้งสองทางคือข้อมูลทางการชุดเดียวกัน"}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/status" className="font-thai text-sm font-medium text-rain hover:underline">{en ? "Live endpoint status →" : "สถานะ endpoint สด →"}</Link>
            <a href="/api/forecast?lat=13.7563&lng=100.5018&hours=6" target="_blank" rel="noopener noreferrer" className="font-thai text-sm text-rain hover:underline">{en ? "View raw forecast →" : "ดูพยากรณ์ดิบ →"}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
