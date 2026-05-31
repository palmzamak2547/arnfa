/**
 * categories.ts — clear, human meta-groups over the ~18 raw POI categories, so the
 * user can choose what KINDS of places a plan should include ("กิน", "ธรรมชาติ",
 * "วัฒนธรรม"…) instead of facing a wall of raw tags. Used by the CategoryFilter on
 * /plan: selected groups hard-filter the POIs the planner considers.
 */

export type CategoryGroup = { key: string; th: string; en: string; cats: string[] };

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { key: "cafe",    th: "คาเฟ่",          en: "Cafés",      cats: ["cafe"] },
  { key: "eat",     th: "กิน-ดื่ม",       en: "Eat & drink", cats: ["restaurant", "bar"] },
  { key: "nature",  th: "ธรรมชาติ",       en: "Nature",     cats: ["park", "garden", "nature", "viewpoint", "playground"] },
  { key: "culture", th: "วัฒนธรรม",       en: "Culture",    cats: ["temple", "museum", "gallery", "library"] },
  { key: "shop",    th: "ช้อปปิ้ง",       en: "Shopping",   cats: ["mall", "market"] },
  { key: "relax",   th: "ผ่อนคลาย-บันเทิง", en: "Relax & fun", cats: ["spa", "entertainment", "themepark"] },
];

const CAT_TO_GROUP = new Map<string, string>();
for (const g of CATEGORY_GROUPS) for (const c of g.cats) CAT_TO_GROUP.set(c, g.key);

export function groupOf(category: string): string | null {
  return CAT_TO_GROUP.get(category) ?? null;
}

/** Keep only POIs whose category falls in one of the selected groups. Empty set = keep all. */
export function filterByGroups<T extends { category: string }>(pois: T[], selected: Set<string>): T[] {
  if (selected.size === 0) return pois;
  return pois.filter((p) => {
    const g = CAT_TO_GROUP.get(p.category);
    return g ? selected.has(g) : false; // "other" is excluded once the user narrows
  });
}

/** Which groups actually have ≥1 POI in this set — so we only show usable chips. */
export function availableGroups(pois: { category: string }[]): Set<string> {
  const s = new Set<string>();
  for (const p of pois) { const g = CAT_TO_GROUP.get(p.category); if (g) s.add(g); }
  return s;
}
