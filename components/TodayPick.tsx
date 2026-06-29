import { rankAreasForDay } from "@/lib/where/today";
import { TodayPickView, type TopArea } from "@/components/TodayPickView";

/**
 * TodayPick — the home page's REAL "clearest today" pick (replaces a hand-written mockup that
 * fabricated numbers). Server component, ISR-cached via the page's `revalidate`; it fetches the
 * live ranking and hands it to the (client) TodayPickView so the section can follow the TH/EN
 * toggle. Iron Rule 0: if the forecast call fails, the view shows concept copy with NO invented
 * numbers — never a fabricated pick.
 */
export async function TodayPick() {
  const ranked = await rankAreasForDay(0);
  const areas = ranked?.areas ?? [];
  const a = areas[0];
  const top: TopArea | null = a
    ? { key: a.key, en: a.en, th: a.th, tempC: a.tempC, rainProb: a.rainProb, verdict: a.verdict }
    : null;
  // the mockup's companion "clearest skies now" Top-5 card — real ranking, no fabrication
  const ranking: TopArea[] = areas.slice(0, 5).map((x) => ({ key: x.key, en: x.en, th: x.th, tempC: x.tempC, rainProb: x.rainProb, verdict: x.verdict }));
  return <TodayPickView top={top} ranking={ranking} />;
}
