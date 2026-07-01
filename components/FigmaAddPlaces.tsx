"use client";

import { useState, useMemo } from "react";
import type { SeedPoi } from "@/lib/plan/buildPlan";
import { PoiPhoto } from "@/components/PoiPhoto";

const CATEGORIES = [
  { key: "all", th: "ทั้งหมด", en: "All", icon: "🌐" },
  { key: "eat", th: "ร้านอาหาร", en: "Eat", icon: "🍽️" },
  { key: "cafe", th: "คาเฟ่", en: "Cafe", icon: "☕" },
  { key: "nature", th: "ธรรมชาติ", en: "Nature", icon: "🌳" },
  { key: "culture", th: "วัฒนธรรม", en: "Culture", icon: "🛕" },
  { key: "shopping", th: "ช้อปปิ้ง", en: "Shopping", icon: "🛍️" },
  { key: "relax", th: "พักผ่อน", en: "Relax", icon: "🛋️" },
];

type FigmaAddPlacesProps = {
  pois: SeedPoi[];
  boostedPoiIds: Set<string>;
  onToggleBoost: (id: string) => void;
  en: boolean;
  sky: string;
};

export function FigmaAddPlaces({ pois, boostedPoiIds, onToggleBoost, en, sky }: FigmaAddPlacesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredPois = useMemo(() => {
    return pois.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nameTh && p.nameTh.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        activeCategory === "all" || p.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [pois, searchQuery, activeCategory]);

  return (
    <section className="arnfa-grid mt-6 mb-8">
      <div className="col-content bg-white/40 backdrop-blur-md border border-hairline rounded-[32px] p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">✨</span>
            <h3 className="font-display text-[0.8rem] uppercase tracking-[0.25em] text-ink">
              {en ? "Discover & Add Places" : "ค้นหาและเพิ่มที่เที่ยวเข้าระหว่างเดินทาง"}
            </h3>
          </div>
          <p className="font-thai text-xs text-ink-muted leading-relaxed">
            {en 
              ? "Browse local spots in this district. Click Add to Trip and the AI will optimize the best hour for you to arrive!" 
              : "ค้นหาจุดท่องเที่ยว ย่านคาเฟ่ ร้านอร่อย หรือที่หลบฝนในย่านนี้ แล้วกดปุ่มเพิ่มเพื่อจัดตารางทริปให้แบบอัตโนมัติ!"}
          </p>
        </div>

        {/* Search Bar - Figma Pill Shape */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={en ? "Search places in this district..." : "ค้นหาสถานที่ในย่านนี้..."}
            className="w-full font-thai text-sm px-5 py-3.5 pl-12 rounded-full border border-hairline bg-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-sun/50 transition-all text-ink placeholder:text-ink-faint"
          />
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-faint text-lg" aria-hidden="true">🔍</span>
        </div>

        {/* Category Icons - Figma Circular Style */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-6 -mx-2 px-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className="flex flex-col items-center gap-1.5 shrink-0 select-none group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all duration-300 shadow-sm ${
                    isActive
                      ? "bg-ink text-paper scale-110 shadow-md ring-2 ring-sun/30"
                      : "bg-white/90 text-ink-muted border border-hairline hover:bg-white hover:scale-105"
                  }`}
                >
                  {cat.icon}
                </div>
                <span className={`font-thai text-[0.65rem] ${isActive ? "font-bold text-ink" : "text-ink-muted"}`}>
                  {en ? cat.en : cat.th}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results Grid - Figma Cards style */}
        {filteredPois.length === 0 ? (
          <div className="text-center py-10 font-thai text-sm text-ink-faint border border-dashed border-hairline rounded-2xl bg-white/20">
            {en ? "No matching places found in this district." : "ไม่พบสถานที่ที่ตรงเงื่อนไขในย่านนี้"}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredPois.slice(0, 15).map(poi => {
              const isAdded = boostedPoiIds.has(poi.id);
              return (
                <div
                  key={poi.id}
                  className="group overflow-hidden rounded-[24px] border border-hairline bg-white/80 p-3 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
                >
                  <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden mb-3 bg-surface/50 border border-hairline">
                    <PoiPhoto poi={poi} skyState={sky as any} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    
                    {/* Floating top badge */}
                    <span className="absolute top-2 left-2 rounded-full bg-ink/80 backdrop-blur-sm px-2 py-0.5 font-thai text-[0.6rem] text-paper uppercase tracking-wider">
                      {poi.category}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between px-1">
                    <div className="mb-2">
                      <h4 className="font-thai font-semibold text-sm text-ink leading-snug line-clamp-1">
                        {poi.nameTh || poi.name}
                      </h4>
                      {poi.nameTh && poi.nameTh !== poi.name && (
                        <p className="font-thai text-[0.65rem] text-ink-faint truncate">{poi.name}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleBoost(poi.id)}
                      className={`w-full font-thai text-xs font-semibold py-2.5 px-4 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center gap-1.5 ${
                        isAdded
                          ? "bg-indoor-warm/15 text-indoor-warm border border-indoor-warm/40 hover:bg-indoor-warm/25"
                          : "bg-ink text-paper hover:bg-ink-muted"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <span>✓</span>
                          <span>{en ? "Remove from Trip" : "นำออกจากทริป"}</span>
                        </>
                      ) : (
                        <>
                          <span>➕</span>
                          <span>{en ? "Add to Trip" : "เพิ่มเข้าทริป"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
