"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

type TatEvent = {
  eventId: number;
  name: string;
  introduction: string;
  startDate: string;
  endDate: string;
  thumbnailUrl: string;
  location: { province: { name: string } };
};

/**
 * TatEventsStrip — horizontal scrollable strip of real events/festivals from
 * the Tourism Authority of Thailand (TAT) API. Self-contained: fetches its own data
 * and gracefully renders null if no data or API is unavailable.
 */
export function TatEventsStrip() {
  const { en, lang } = useLang();
  const [events, setEvents] = useState<TatEvent[]>([]);

  useEffect(() => {
    fetch("/api/tat?events=1&limit=8")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { events: TatEvent[] }) => setEvents(d.events ?? []))
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  const fmt = (d: Date) =>
    d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { day: "numeric", month: "short" });

  return (
    <section className="arnfa-grid section-minor">
      <div className="col-content">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🎪</span>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-ink">
            {en ? "Events & Festivals" : "งานเด่น/เทศกาลน่าไป"}
          </h2>
          <span className="ml-auto font-thai text-[0.6rem] text-ink-faint">
            {en ? "from TAT" : "ข้อมูลจาก ททท."}
          </span>
        </div>
        <div
          className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {events.map((ev) => {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            return (
              <div key={ev.eventId} className="snap-start shrink-0 w-[280px] group">
                <div className="overflow-hidden rounded-2xl border border-hairline bg-white/60 shadow-sm hover:shadow transition-shadow">
                  {ev.thumbnailUrl && (
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img
                        src={ev.thumbnailUrl}
                        alt={ev.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <span className="absolute bottom-2 left-3 rounded-full bg-white/90 px-2.5 py-1 font-thai text-[0.6rem] font-medium text-ink">
                        {ev.location?.province?.name}
                      </span>
                    </div>
                  )}
                  <div className="p-3.5">
                    <h3 className="font-thai text-sm font-semibold text-ink leading-snug line-clamp-2">
                      {ev.name}
                    </h3>
                    <p className="mt-1 font-thai text-xs text-ink-faint">
                      {fmt(start)} — {fmt(end)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
