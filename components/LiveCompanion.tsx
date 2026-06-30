"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import type { SeedPoi } from "@/lib/plan/buildPlan";
import { nearestShelter, type Shelter } from "@/lib/core/shelter";
import type { Nowcast } from "@/lib/weather/nowcast";

/**
 * LiveCompanion — opt-in "โหมดเดินทาง". While you're out it watches your live
 * position + the 15-minute rain nowcast there; if rain is ~25 min away it alerts
 * and names the nearest shelter to duck into. Uses the real Notification API while
 * the app is active (an in-app banner always shows). Honest scope: this is the
 * foreground companion — push when the app is fully CLOSED needs a background
 * cron storing location server-side, which we don't do (privacy). Your position
 * is only sent to /api/nowcast for the forecast and is never stored.
 */

const ALERT_MIN = 25;

type Coords = { lat: number; lng: number };

export function LiveCompanion({ pois }: { pois: SeedPoi[] }) {
  const { en } = useLang();
  const [active, setActive] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [nowcast, setNowcast] = useState<Nowcast | null>(null);
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [err, setErr] = useState<"" | "denied" | "unsupported" | "error">("");

  const watchRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  const poisRef = useRef<SeedPoi[]>(pois);
  const alertedRef = useRef(false);
  useEffect(() => { poisRef.current = pois; }, [pois]);

  function notify(title: string, body: string) {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon-192.png", tag: "arnfa-rain" });
      }
    } catch { /* notifications are a bonus; never block */ }
  }

  async function poll(c: Coords) {
    try {
      const r = await fetch(`/api/nowcast?lat=${c.lat}&lng=${c.lng}`);
      if (!r.ok) return;
      const nc: Nowcast = await r.json();
      setNowcast(nc);
      if (nc.rainInMin !== null && nc.rainInMin <= ALERT_MIN) {
        const sh = nearestShelter(poisRef.current, c.lat, c.lng);
        setShelter(sh);
        if (!alertedRef.current) {
          alertedRef.current = true;
          const body = sh
            ? (en ? `Duck into ${sh.poi.name} (~${sh.walkMin} min walk)` : `หลบที่ ${sh.poi.name} (เดิน ~${sh.walkMin} นาที)`)
            : (en ? "Find cover nearby" : "หาที่หลบใกล้ๆ ได้เลย");
          notify(en ? `Rain in ~${nc.rainInMin} min` : `ฝนมาในอีก ~${nc.rainInMin} นาที`, body);
        }
      } else if (nc.rainInMin === null) {
        alertedRef.current = false;
        setShelter(null);
      }
    } catch { /* a failed poll just waits for the next one */ }
  }

  function stop() {
    if (watchRef.current !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    watchRef.current = null; pollRef.current = null; alertedRef.current = false;
    setActive(false); setNowcast(null); setShelter(null);
  }

  function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setErr("unsupported"); return; }
    setErr("");
    setActive(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => { /* fine without it */ });
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => { const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }; coordsRef.current = c; setCoords(c); poll(c); },
      (e) => { setErr(e.code === 1 ? "denied" : "error"); stop(); },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 },
    );
    pollRef.current = setInterval(() => { if (coordsRef.current) poll(coordsRef.current); }, 180000);
  }

  // tidy up if the user leaves the page mid-session
  useEffect(() => () => { if (watchRef.current !== null && typeof navigator !== "undefined") navigator.geolocation.clearWatch(watchRef.current); if (pollRef.current) clearInterval(pollRef.current); }, []);

  const raining = nowcast?.rainInMin !== null && nowcast?.rainInMin !== undefined && nowcast.rainInMin <= ALERT_MIN;

  return (
    <div className="rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-thai-serif text-lg font-light text-ink">{en ? "Travel mode" : "โหมดเดินทาง"}</h2>
        {!active ? (
          <button type="button" onClick={start} className="font-thai inline-flex min-h-[44px] items-center rounded-full bg-ink px-4 text-sm text-paper transition-colors hover:bg-ink-muted">
            {en ? "Turn on" : "เปิด"}
          </button>
        ) : (
          <button type="button" onClick={stop} className="font-thai inline-flex min-h-[44px] items-center rounded-full border border-hairline px-4 text-sm text-ink transition-colors hover:bg-paper">
            {en ? "Turn off" : "ปิด"}
          </button>
        )}
      </div>

      {!active && (
        <>
          <p className="font-thai mt-2 text-sm text-ink-muted">{en ? "While you're out, Arnfah watches the rain at your spot and warns you ~25 min ahead — with the nearest place to duck into." : "ระหว่างออกไปข้างนอก Arnfah จะคอยดูฝนตรงที่คุณอยู่ แล้วเตือนล่วงหน้า ~25 นาที พร้อมที่หลบใกล้สุด"}</p>
          <p className="font-thai mt-2 text-[0.7rem] text-ink-faint">{en ? "Your location is used only for the forecast — never stored." : "ตำแหน่งใช้เพื่อเช็คฟ้าเท่านั้น ไม่เก็บขึ้นเซิร์ฟเวอร์"}</p>
        </>
      )}

      {err === "denied" && <p className="font-thai mt-2 text-sm text-ink-faint">{en ? "Location permission off — turn it on to use travel mode." : "ยังไม่ได้เปิดสิทธิ์ตำแหน่ง — เปิดก่อนเพื่อใช้โหมดนี้"}</p>}
      {err === "unsupported" && <p className="font-thai mt-2 text-sm text-ink-faint">{en ? "This device can't share location." : "เครื่องนี้แชร์ตำแหน่งไม่ได้"}</p>}
      {err === "error" && <p className="font-thai mt-2 text-sm text-ink-faint">{en ? "Couldn't read your location — try again." : "อ่านตำแหน่งไม่ได้ ลองใหม่อีกที"}</p>}

      {active && (
        <div className="mt-4">
          {raining && nowcast ? (
            <div className="rounded-2xl border border-indoor-warm/30 bg-indoor-warm/[0.06] px-4 py-3">
              <p className="font-thai text-sm font-medium text-indoor-warm">
                {nowcast.rainInMin === 0 ? (en ? "Rain now" : "ฝนกำลังมา") : (en ? `Rain in ~${nowcast.rainInMin} min` : `ฝนมาในอีก ~${nowcast.rainInMin} นาที`)}
              </p>
              {shelter && (
                <p className="font-thai mt-1 text-sm text-ink">
                  {en ? <>Duck into <b className="font-medium">{shelter.poi.name}</b>, ~{shelter.walkMin} min{shelter.covered ? "" : " (open-air — nearest spot)"}</>
                      : <>หลบที่ <b className="font-medium">{shelter.poi.name}</b>, เดิน ~{shelter.walkMin} นาที{shelter.covered ? "" : " (กลางแจ้ง — ที่ใกล้สุด)"}</>}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden />
              <p className="font-thai text-sm text-ink-muted">
                {coords ? (en ? "Watching your sky — dry for now" : "กำลังดูฟ้าให้ ตอนนี้ยังแห้ง") : (en ? "Getting your location…" : "กำลังหาตำแหน่ง…")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
