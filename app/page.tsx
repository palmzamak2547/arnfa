import Link from "next/link";
import { ArnfaRibbon } from "@/components/ArnfaRibbon";
import { Masthead } from "@/components/Masthead";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { FrontPageTop } from "@/components/FrontPageTop";
import { FrontPageLead } from "@/components/FrontPageLead";
import { TheSkySection } from "@/components/TheSkySection";
import { TruthSection } from "@/components/TruthSection";
import { Colophon } from "@/components/Colophon";
import { TodayPick } from "@/components/TodayPick";
import { Logo } from "@/components/Logo";

// ISR — the home page renders a REAL "today's pick" from live forecast; regenerate
// every 30 min so the Open-Meteo call is cached, not run per request.
export const revalidate = 1800;

export default function Home() {
  return (
    <main className="relative z-10 flex flex-col">
      {/* animated sky behind the front page — real current Bangkok sky (sun / clouds / rain) */}
      <SkyBackdrop />

      <Masthead />

      {/* FRONT PAGE — broadsheet folio + nameplate (the editorial front page, per the brand book) */}
      <FrontPageTop />

      {/* ALIVE WEATHER STRIP — the อ่านฟ้า ribbon (real forecast), the broadsheet's living masthead band */}
      <section className="relative z-10 arnfa-grid section-minor border-b border-hairline">
        <div className="col-content">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-4">
            อ่านฟ้า — next six hours
          </p>
          <ArnfaRibbon />
        </div>
      </section>

      {/* FRONT-PAGE LEAD — Today's Verdict article + sky-now box (real forecast + air) */}
      <FrontPageLead />

      {/* § THE SKY — how to read the sky / place weather-fit profiles */}
      <TheSkySection />

      {/* STOP PRESS — today's REAL live pick (the editorial picks block) */}
      <TodayPick />

      {/* ความจริง · THE IRON RULE — honesty-as-brand: 0 fabricated numbers + sources colophon */}
      <TruthSection />

      {/* COLOPHON — the broadsheet's closing credits (type voices · ink = meaning · the drift) */}
      <Colophon />

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
