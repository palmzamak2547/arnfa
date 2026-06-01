"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { deferIdle } from "@/lib/util/deferIdle";

/**
 * SatelliteHaze — "ไฟป่าจากดาวเทียม". Reads /api/fires (NASA FIRMS / VIIRS) for the
 * area and, when real heat sources are detected nearby, explains the haze the way
 * no Thai weather app does: not just "PM2.5 high → stay in", but *why* — fires the
 * satellite actually saw. Self-hiding: renders nothing when FIRMS has no key
 * (dormant) or when there are zero fires. Never fabricates a fire.
 */

type FireData = {
  available: boolean;
  count?: number;
  nearestKm?: number | null;
  radiusKm?: number;
  days?: number;
  maxFrp?: number | null;
};

const HAZY = new Set(["warn", "unhealthy", "very-unhealthy"]);

export function SatelliteHaze({ lat, lng, airLevel }: { lat: number; lng: number; airLevel?: string }) {
  const { en } = useLang();
  const [data, setData] = useState<FireData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    // below-the-fold + often hidden → fetch when idle, off the critical path
    const cancel = deferIdle(() => {
      fetch(`/api/fires?lat=${lat}&lng=${lng}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled) setData(d); })
        .catch(() => { if (!cancelled) setData(null); });
    });
    return () => { cancelled = true; cancel(); };
  }, [lat, lng]);

  if (!data?.available || !data.count) return null;
  const hazy = !!airLevel && HAZY.has(airLevel);

  return (
    <div className="rounded-3xl border border-indoor-warm/25 bg-indoor-warm/[0.05] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span aria-hidden>🛰️</span>
        <h2 className="font-thai-serif text-lg font-light text-ink">{en ? "Fires from space" : "ไฟป่าจากดาวเทียม"}</h2>
      </div>

      <p className="font-thai mt-2 text-sm text-ink">
        {en ? (
          <>NASA satellites detected <b className="font-medium">{data.count}</b> heat source{data.count > 1 ? "s" : ""} within ~{data.radiusKm} km in the last {data.days === 1 ? "24 h" : `${data.days} days`}{data.nearestKm != null ? `, nearest ~${data.nearestKm} km away` : ""}.</>
        ) : (
          <>ดาวเทียม NASA เห็นจุดความร้อน <b className="font-medium">{data.count}</b> จุด ในรัศมี ~{data.radiusKm} กม. ช่วง {data.days === 1 ? "24 ชม." : `${data.days} วัน`}ล่าสุด{data.nearestKm != null ? ` ใกล้สุด ~${data.nearestKm} กม.` : ""}</>
        )}
      </p>

      {hazy && (
        <p className="font-thai mt-2 text-sm text-indoor-warm">
          {en
            ? "PM2.5 is elevated today too — these are a likely source of the haze."
            : "วันนี้ฝุ่น PM2.5 สูงด้วย ไฟพวกนี้น่าจะเป็นต้นเหตุของหมอกควัน"}
        </p>
      )}

      <p className="font-thai mt-2 text-[0.7rem] text-ink-faint">
        {en
          ? "NASA FIRMS (VIIRS active fire) — open the Haze layer on the map to see it"
          : "NASA FIRMS (VIIRS) — เปิดชั้นหมอกควันบนแผนที่เพื่อดูภาพ"}
      </p>
    </div>
  );
}
