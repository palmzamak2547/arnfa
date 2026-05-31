/**
 * RainViewer — radar nowcast availability check (DEFENSIVE).
 *
 * Per research: RainViewer's public API narrowed in 2025; `nowcast[]` is often
 * empty. So we NEVER promise "rain in N minutes". We only report whether live
 * radar frames + a near-term nowcast exist for the region, so the UI can show an
 * honest "เรดาร์ฝนใกล้ตัว" availability state and a link, not a fabricated countdown.
 *
 * Spec: projects/arnfa/03-data-sources.md § RainViewer (defensive)
 */

const MAPS_JSON = "https://api.rainviewer.com/public/weather-maps.json";

export type RadarStatus = {
  /** radar host + path base for tile building, if available */
  available: boolean;
  pastFrames: number;
  nowcastFrames: number;
  /** ISO of the most recent past frame, if any */
  latestISO: string | null;
};

type MapsJson = {
  host?: string;
  radar?: {
    past?: { time: number; path: string }[];
    nowcast?: { time: number; path: string }[];
  };
};

export async function fetchRadarStatus(signal?: AbortSignal): Promise<RadarStatus> {
  const res = await fetch(MAPS_JSON, { signal, headers: { "User-Agent": "Arnfa/0.1" } });
  if (!res.ok) throw new Error(`RainViewer ${res.status}`);
  const data = (await res.json()) as MapsJson;
  const past = data.radar?.past ?? [];
  const nowcast = data.radar?.nowcast ?? [];
  const latest = past.length ? past[past.length - 1].time : null;
  return {
    available: past.length > 0,
    pastFrames: past.length,
    nowcastFrames: nowcast.length,
    latestISO: latest ? new Date(latest * 1000).toISOString() : null,
  };
}
