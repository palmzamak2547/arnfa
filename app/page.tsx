import { Masthead } from "@/components/Masthead";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { HeroVideo } from "@/components/HeroVideo";
import { ScrollProgress } from "@/components/ScrollProgress";
import { LiquidGlass } from "@/components/LiquidGlass";
import { FrontPageTop } from "@/components/FrontPageTop";
import { RibbonStrip } from "@/components/RibbonStrip";
import { FrontPageLead } from "@/components/FrontPageLead";
import { StopPress } from "@/components/StopPress";
import { TheSkySection } from "@/components/TheSkySection";
import { CoverageStats } from "@/components/CoverageStats";
import { TruthSection } from "@/components/TruthSection";
import { FaqSection } from "@/components/FaqSection";
import { GetStartedSection } from "@/components/GetStartedSection";
import { Colophon } from "@/components/Colophon";
import { TodayPick } from "@/components/TodayPick";
import { SiteFooter } from "@/components/SiteFooter";

// ISR — the home page renders a REAL "today's pick" from live forecast; regenerate
// every 30 min so the Open-Meteo call is cached, not run per request.
export const revalidate = 1800;

export default function Home() {
  return (
    <main className="relative z-10 flex flex-col">
      {/* animated sky behind the front page — real current Bangkok sky (sun / clouds / rain) */}
      <SkyBackdrop />
      {/* real Bangkok footage behind the nameplate — masked to melt into the paper page */}
      <HeroVideo />
      {/* defines the liquid-glass refraction filter + enables it on Chromium */}
      <LiquidGlass />
      {/* slim scroll-progress bar pinned at the top of the page */}
      <ScrollProgress />

      <Masthead />

      {/* FRONT PAGE — broadsheet folio + nameplate (the editorial front page, per the brand book) */}
      <FrontPageTop />

      {/* ALIVE WEATHER STRIP — the อ่านฟ้า ribbon (real forecast), bilingual eyebrow */}
      <RibbonStrip />

      {/* FRONT-PAGE LEAD — Today's Verdict article + sky-now box (real forecast + air) */}
      <FrontPageLead />

      {/* STOP PRESS — the live correction; prints ONLY when rain is genuinely moving in (else null) */}
      <StopPress />

      {/* § THE SKY — how to read the sky / place weather-fit profiles */}
      <TheSkySection />

      {/* STOP PRESS — today's REAL live pick (the editorial picks block) */}
      <TodayPick />

      {/* COVERAGE — the one loud honest number (real POIs) + nationwide reach */}
      <CoverageStats />

      {/* ความจริง · THE IRON RULE — honesty-as-brand: 0 fabricated numbers + sources colophon */}
      <TruthSection />

      {/* คำถามที่พบบ่อย · FAQ — honest answers (free / accuracy / nationwide / languages) */}
      <FaqSection />

      {/* GET STARTED — full-bleed pre-footer CTA to the real surfaces (Plan · Ask AI), no fake stores */}
      <GetStartedSection />

      {/* COLOPHON — the broadsheet's closing credits (type voices · ink = meaning · the drift) */}
      <Colophon />

      <SiteFooter />
    </main>
  );
}
