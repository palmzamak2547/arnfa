"use client";

import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { CATEGORY_GROUPS } from "@/lib/plan/categories";

/**
 * CategoryFilter — "อยากเที่ยวแนวไหน": clear meta-group chips so the user shapes the
 * plan (cafés / eat / nature / culture / shopping / relax). Multi-select; empty =
 * everything. Only groups that exist in the chosen area are shown.
 */
export function CategoryFilter({
  available, selected, onChange,
}: {
  available: Set<string>;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";
  const groups = CATEGORY_GROUPS.filter((g) => available.has(g.key));
  if (groups.length <= 1) return null; // nothing meaningful to choose between

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  }

  return (
    <div>
      <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">{en ? "Vibe" : "อยากเที่ยวแนวไหน"}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className={clsx(
            "font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]",
            selected.size === 0 ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface",
          )}
        >
          {en ? "All" : "ทั้งหมด"}
        </button>
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            aria-pressed={selected.has(g.key)}
            onClick={() => toggle(g.key)}
            className={clsx(
              "font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]",
              selected.has(g.key) ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface",
            )}
          >
            {en ? g.en : g.th}
          </button>
        ))}
      </div>
    </div>
  );
}
