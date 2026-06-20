import { Masthead } from "@/components/Masthead";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { FrontPageTop } from "@/components/FrontPageTop";
import { RibbonStrip } from "@/components/RibbonStrip";
import { FrontPageLead } from "@/components/FrontPageLead";
import { TheSkySection } from "@/components/TheSkySection";
import { TruthSection } from "@/components/TruthSection";
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

      <Masthead />

      {/* FRONT PAGE — broadsheet folio + nameplate (the editorial front page, per the brand book) */}
      <FrontPageTop />

      {/* ALIVE WEATHER STRIP — the อ่านฟ้า ribbon (real forecast), bilingual eyebrow */}
      <RibbonStrip />

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

      <SiteFooter />
    </main>
  );
}
