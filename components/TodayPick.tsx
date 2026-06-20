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
  const a = ranked?.areas?.[0];
  const top: TopArea | null = a
    ? { key: a.key, en: a.en, th: a.th, tempC: a.tempC, rainProb: a.rainProb, verdict: a.verdict }
    : null;
  return <TodayPickView top={top} />;
}
