/**
 * sun.ts — sunrise / sunset / golden hour from lat·lng·date, computed locally (no
 * API, instant, offline-safe). Standard solar-position algorithm (the SunCalc core,
 * which is widely verified). Returns UTC instants; callers format in Bangkok time.
 *
 * Golden hour (evening) = the sun between +6° and the horizon — the warm window
 * Arnfa nudges you toward for the nicest light.
 */

const RAD = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = RAD * 23.4397; // obliquity of the Earth

const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (d: Date) => toJulian(d) - J2000;

const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d);
function eclipticLongitude(M: number) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}
const declination = (l: number) => Math.asin(Math.sin(0) * Math.cos(e) + Math.cos(0) * Math.sin(e) * Math.sin(l));

const J0 = 0.0009;
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h: number, phi: number, d: number) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number) {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

export type SunTimes = { sunrise: Date | null; sunset: Date | null; goldenEveningStart: Date | null };

export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);

  function event(h: number): { rise: Date | null; set: Date | null } {
    const arg = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (arg <= -1 || arg >= 1) return { rise: null, set: null }; // polar day/night
    const Jset = getSetJ(h, lw, phi, dec, n, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return { rise: fromJulian(Jrise), set: fromJulian(Jset) };
  }

  const horizon = event(RAD * -0.833);
  const golden = event(RAD * 6); // sun at +6°: the evening golden-hour boundary
  return { sunrise: horizon.rise, sunset: horizon.set, goldenEveningStart: golden.set };
}

/** Format a UTC instant as HH:MM in Bangkok time (24h). */
export function bkkTime(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
}
