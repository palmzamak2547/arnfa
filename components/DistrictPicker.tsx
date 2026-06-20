"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { DISTRICTS, districtMeta, groupedDistricts, nearestDistrict } from "@/lib/poi/districts";
import { useLang } from "@/lib/i18n/useLang";

/**
 * DistrictPicker — covers all of Bangkok without drowning the user in 55 pills.
 * A trigger opens a popover: search + "ใกล้ฉัน" geolocation + zone-grouped list.
 * Closed by default so SSR and the first client render match (no hydration flash).
 */
export function DistrictPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const { en } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "denied" | "unsupported">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const current = districtMeta(value) ?? DISTRICTS[0];
  const groups = useMemo(() => groupedDistricts(q), [q]);
  const total = DISTRICTS.length;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open]);

  function pick(key: string) { onChange(key); setOpen(false); setQ(""); }

  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeoState("unsupported"); return; }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => { const d = nearestDistrict(pos.coords.latitude, pos.coords.longitude); setGeoState("idle"); pick(d.key); },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="font-thai inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 py-2 text-paper text-sm font-medium transition-colors duration-[var(--dur-fast)] hover:bg-ink-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="opacity-80" aria-hidden>
          <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        <span className="max-w-[10rem] truncate">{en ? current.en : current.th}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={clsx("transition-transform duration-[var(--dur-fast)]", open && "rotate-180")} aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* click-outside backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="listbox"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(92vw,22rem)] overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_18px_50px_-20px_rgba(26,31,43,0.35)]"
          >
            <div className="border-b border-hairline p-3">
              <div className="flex items-center gap-2 rounded-2xl bg-paper px-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-faint" aria-hidden>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={en ? `Search ${total} areas across Thailand` : `ค้นหา ${total} พื้นที่ทั่วไทย`}
                  className="font-thai h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              <button
                type="button"
                onClick={locateMe}
                className="font-thai mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm text-rain transition-colors hover:bg-rain/5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 2v3M12 19v3M22 12h-3M5 12H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {geoState === "locating" ? (en ? "Locating…" : "กำลังหาตำแหน่ง…") : (en ? "Near me" : "ใกล้ฉัน")}
              </button>
              {geoState === "denied" && <span className="font-thai ml-1 text-xs text-ink-faint">{en ? "Couldn't get your location — just pick one" : "เปิดสิทธิ์ตำแหน่งไม่ได้ — เลือกเองได้เลย"}</span>}
              {geoState === "unsupported" && <span className="font-thai ml-1 text-xs text-ink-faint">{en ? "Location isn't available on this device" : "เครื่องนี้หาตำแหน่งไม่ได้"}</span>}
            </div>

            <div className="max-h-[min(56vh,26rem)] overflow-y-auto overscroll-contain p-2">
              {groups.length === 0 && (
                <p className="font-thai px-3 py-6 text-center text-sm text-ink-faint">{en ? `No area matches “${q}”` : `ไม่พบย่าน “${q}”`}</p>
              )}
              {groups.map((g) => (
                <div key={g.zone} className="mb-1">
                  <p className="font-thai px-3 pb-1 pt-2 text-[0.7rem] font-medium uppercase tracking-wider text-ink-faint">{g.zone}</p>
                  {g.items.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      role="option"
                      aria-selected={d.key === value}
                      onClick={() => pick(d.key)}
                      className={clsx(
                        "font-thai flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm transition-colors",
                        d.key === value ? "bg-ink text-paper" : "text-ink hover:bg-paper",
                      )}
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate">{d.th}</span>
                        <span className={clsx("truncate text-xs", d.key === value ? "text-paper/60" : "text-ink-faint")}>{d.en}</span>
                      </span>
                      <span className={clsx("shrink-0 text-xs tabular-nums", d.key === value ? "text-paper/70" : "text-ink-faint")}>{d.count}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
