import snapshot from "./transitStations.snapshot.json"; // 454 rail stations, from the Namtang GTFS

/**
 * transitStations — Bangkok/Thailand RAIL stations (BTS · MRT · ARL · SRT) from the
 * Namtang open transit feed (namtang.otp.go.th — a senior's OTP project). Powers the
 * "how do I get to this area by train" answer = the BDI Track-1 "การเดินทาง" axis, with
 * real public-transit data. Static feed → served from the bundled snapshot.
 */
export type RailStation = { th: string; en: string; lat: number; lng: number; system: string };

export const TRANSIT_SOURCE = "namtang.otp.go.th";

export const SYSTEM_META: Record<string, { th: string; en: string; color: string }> = {
  BTS: { th: "บีทีเอส", en: "BTS Skytrain", color: "#3aa537" },
  MRT: { th: "เอ็มอาร์ที", en: "MRT Metro", color: "#1964B7" },
  ARL: { th: "แอร์พอร์ตลิงก์", en: "Airport Rail Link", color: "#C8102E" },
  SRT: { th: "รถไฟ/สายสีแดง", en: "SRT / Red Line", color: "#A6192E" },
};

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const STATIONS = (snapshot as { stations: RailStation[] }).stations;

/** Nearest rail stations to a point, with distance (km). Prefers metro (BTS/MRT/ARL) for
 *  urban trips by giving long-distance SRT a small distance penalty so a 200m BTS wins. */
export function nearestStations(lat: number, lng: number, n: number): (RailStation & { km: number })[] {
  return STATIONS
    .map((s) => {
      const d = km(lat, lng, s.lat, s.lng);
      return { ...s, km: d, _rank: d * (s.system === "SRT" ? 1.4 : 1) };
    })
    .sort((a, b) => a._rank - b._rank)
    .slice(0, n)
    .map(({ _rank, ...s }) => s);
}
