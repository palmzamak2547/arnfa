import { Masthead } from "@/components/Masthead";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { HeroVideo } from "@/components/HeroVideo";
import { ScrollProgress } from "@/components/ScrollProgress";
import { LiquidGlass } from "@/components/LiquidGlass";
import { FrontPageTop } from "@/components/FrontPageTop";
import { BandVideo } from "@/components/BandVideo";
import { RibbonStrip } from "@/components/RibbonStrip";
import { FrontPageLead } from "@/components/FrontPageLead";
import { StopPress } from "@/components/StopPress";
import { HowItWorks } from "@/components/HowItWorks";
import { SwapMomentSection } from "@/components/SwapMomentSection";
import { TheSkySection } from "@/components/TheSkySection";
import { TodayPick } from "@/components/TodayPick";
import { CoverageStats } from "@/components/CoverageStats";
import { WhyArnfah } from "@/components/WhyArnfah";
import { TruthSection } from "@/components/TruthSection";
import { FaqSection } from "@/components/FaqSection";
import { GetStartedSection } from "@/components/GetStartedSection";
import { VenuesStrip } from "@/components/VenuesStrip";
import { Colophon } from "@/components/Colophon";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatFab } from "@/components/ChatFab";
import { Reveal } from "@/components/motion/Reveal";

// ISR — the home renders a REAL "today's pick" from live forecast; regenerate every 30 min
// so the Open-Meteo call is cached, not run per request.
export const revalidate = 1800;

export default function Home() {
  return (
    <main className="relative z-10">
      {/* animated sky behind the front page — real current Bangkok sky (sun / clouds / rain) */}
      <SkyBackdrop />
      {/* real Bangkok footage behind the nameplate — masked to melt into the paper page */}
      <HeroVideo />
      {/* defines the liquid-glass refraction filter + enables it on Chromium */}
      <LiquidGlass />
      {/* slim scroll-progress bar pinned at the top of the page */}
      <ScrollProgress />

      <Masthead />

      {/* HERO — folio + eyebrow + nameplate + tagline + dual CTAs, over the Bangkok footage */}
      <FrontPageTop />

      {/* "One city, every sky" — the editorial video intermission band (lazy) */}
      <Reveal><BandVideo /></Reveal>

      {/* ALIVE WEATHER STRIP — the อ่านฟ้า ribbon (real "next six hours" forecast) */}
      <Reveal><RibbonStrip /></Reveal>

      {/* §PLAN — Today's Verdict article + live sky-now glass card (real forecast + air) */}
      <Reveal><FrontPageLead /></Reveal>
      {/* STOP PRESS — the live correction; prints ONLY when rain is genuinely moving in (else null) */}
      <StopPress />

      {/* §I HOW ARNFAH THINKS — forecast → decision in three moves */}
      <Reveal><HowItWorks /></Reveal>

      {/* THE SWAP MOMENT — the signature wow (auto-cycling real SwapCard, drive it yourself) */}
      <Reveal><SwapMomentSection /></Reveal>

      {/* §II HOW TO READ THE SKY — each place keeps its own weather-fit profile */}
      <Reveal><TheSkySection /></Reveal>

      {/* §III CLEAREST TODAY — today's REAL live pick + nationwide ranking (self-reveals) */}
      <TodayPick />

      {/* §IV COVERAGE — the one loud honest number (real POIs) + nationwide reach */}
      <Reveal><CoverageStats /></Reveal>

      {/* §V WHY ARNFAH — three honest promises + the real open-data the engine runs on */}
      <Reveal><WhyArnfah /></Reveal>

      {/* §VI THE IRON RULE — honesty-as-brand: 0 fabricated numbers + sources colophon */}
      <Reveal><TruthSection /></Reveal>

      {/* §VII QUESTIONS — honest FAQ (free / accuracy / nationwide / languages) */}
      <Reveal><FaqSection /></Reveal>

      {/* GET STARTED — full-bleed pre-footer CTA to the real surfaces (Plan · Ask AI) */}
      <Reveal><GetStartedSection /></Reveal>

      {/* FOR VENUES — links to the real /partner intake */}
      <Reveal><VenuesStrip /></Reveal>

      {/* §VIII COLOPHON — type voices · ink = meaning · the drift */}
      <Reveal><Colophon /></Reveal>

      <SiteFooter />

      {/* floating chrome — honest cookie notice + a doorway to the real /ai agent */}
      <CookieConsent />
      <ChatFab />
    </main>
  );
}
