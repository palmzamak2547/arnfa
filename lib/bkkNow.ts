/**
 * bkkNow — "now" as a Date whose getHours()/getDate()/getDay() read BANGKOK wall-clock,
 * regardless of the runtime timezone. The Vercel server runs in UTC (a raw `new Date()` is
 * 7h behind Bangkok), and a tourist's device may be in any zone — both skew the "today /
 * start-hour / weekday" math that the forecast (always Asia/Bangkok) assumes. Same +offset
 * shift SkyHero uses for the sun. ponytail: a real instant is wrong here; we want wall-clock.
 */
export function bkkNow(): Date {
  return new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
}
