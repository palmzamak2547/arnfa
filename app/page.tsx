import Link from "next/link";
import { ArnfaRibbon } from "@/components/ArnfaRibbon";
import { HomeHero } from "@/components/HomeHero";
import { SiteHeader } from "@/components/SiteHeader";
import { SkyWindow } from "@/components/SkyWindow";
import { DataSources } from "@/components/DataSources";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/motion/Reveal";

export default function Home() {
  return (
    <main className="relative z-10 flex flex-col">
      <SiteHeader />

      {/* HERO — full-bleed R3F sky with real BKK clock + weather */}
      <HomeHero />

      {/* SKY WINDOW — today's go/wait/stay verdict (real forecast) */}
      <SkyWindow />

      {/* NOW STRIP — อ่านฟ้า ribbon, full-bleed, minor rhythm */}
      <section className="arnfa-grid section-minor border-y border-hairline bg-surface/50 backdrop-blur-sm">
        <div className="col-content">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-4">
            อ่านฟ้า — next six hours
          </p>
          <ArnfaRibbon />
        </div>
      </section>

      {/* TODAY'S PICK — left-anchored editorial block (cols 1–7) */}
      <section className="arnfa-grid section-major">
        <Reveal className="col-content col-left-7">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
            Today&apos;s pick
          </p>
          <h2 className="font-thai-serif fs-h2 font-light text-ink leading-[1.08] mb-8 text-balance">
            บ่ายนี้ฟ้าเปิด — <span className="font-display italic text-sun">the rooftop</span> reads better than the cafe.
          </h2>
          <p className="font-thai fs-lead text-ink-muted leading-relaxed max-w-[52ch]">
            หลังคาเปิด มุมลม แต่ไม่ร้อนเพราะร่ม. UV ปานกลาง 14:00–16:00.
            ใกล้ MRT คลองเตย เดิน 6 นาที. ฝนตามพยากรณ์ 18% — Arnfa เผื่อทาง
            ในร่มไว้ที่ห่าง 280 ม.
          </p>
        </Reveal>
      </section>

      {/* HOW ARNFA THINKS — right-anchored (cols 7–12), breaks the left rhythm */}
      <section id="how" className="arnfa-grid section-major border-t border-hairline">
        <Reveal className="col-content col-right-7">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
            How Arnfa thinks
          </p>
          <h2 className="font-thai-serif fs-h2 font-light text-ink leading-snug mb-8 text-balance">
            แต่ละสถานที่มี <em>โปรไฟล์ความเข้ากับอากาศ</em> ของตัวเอง.
          </h2>
          <p className="font-thai fs-lead text-ink-muted leading-relaxed mb-6 max-w-[54ch]">
            สวนกลางแจ้งเหมาะกับฟ้าเปิด แต่ไม่ใช่ทุกสวนเหมือนกัน — บางที่มีร่มไม้เยอะ
            ไม่สะดวกตอนฝนตก. คาเฟ่ริมหน้าต่างไม่ใช่แค่ &ldquo;ทน&rdquo; ฝนได้ —{" "}
            <em>มันดีขึ้น เมื่อฝนตก.</em>
          </p>
          <p className="font-thai fs-lead text-ink-muted leading-relaxed max-w-[54ch]">
            Arnfa อ่านโปรไฟล์เหล่านี้จาก OpenStreetMap structured tags + รีวิวจริงของผู้ใช้ +
            ฟ้าจาก Open-Meteo + เรดาร์ใกล้ตัวจาก RainViewer. ทุกคำแนะนำมี
            <em> เหตุผล</em> เสมอ — ไม่ใช่กล่องดำ.
          </p>
        </Reveal>
      </section>

      {/* PROVENANCE — data-as-trust (BDI differentiator) */}
      <DataSources />

      <footer className="arnfa-grid section-minor border-t border-hairline pad-safe-b">
        <div className="col-content flex flex-col sm:flex-row items-start justify-between gap-4 text-sm text-ink-faint">
          <div className="flex flex-col gap-2">
            <Logo className="text-lg" animate={false} />
            <div className="flex gap-4">
              <Link href="/plan" className="font-thai hover:text-ink transition-colors">วางแผนทริป</Link>
              <Link href="/status" className="font-thai hover:text-ink transition-colors">สถานะระบบ</Link>
            </div>
          </div>
          <p className="font-thai max-w-md sm:text-right">
            ข้อมูลเปิดจาก Open-Meteo, MET Norway, OpenStreetMap, OpenFreeMap, RainViewer,
            และ Air4Thai (กรมควบคุมมลพิษ) — ทำเพื่อคนไทย
          </p>
        </div>
      </footer>
    </main>
  );
}
