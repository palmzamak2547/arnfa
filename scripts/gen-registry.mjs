// Generate lib/poi/registry.generated.ts from whatever district JSONs exist in
// data/seed/. Emits (1) lightweight metadata (key/th/en/tier/zone/count/centroid)
// that is statically imported for the picker, and (2) a lazy-loader map so each
// district's full POI list is a separate chunk fetched on demand — the bundle
// stays tiny no matter how many districts we add. Mirrors the VetMock
// generated-registry pattern. Run after seeding: node scripts/gen-registry.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

// Curated walkable neighbourhoods (no OSM relation id) — shown as "ย่านยอดนิยม".
const NEIGHBORHOOD_ZONE = "ย่านยอดนิยม";

// Geographic zone grouping for the 50 administrative เขต (cosmetic picker grouping).
const ZONE = {
  // กรุงเทพชั้นใน — old town + CBD spine
  "phra-nakhon":"กรุงเทพชั้นใน","pom-prap-sattru-phai":"กรุงเทพชั้นใน","samphanthawong":"กรุงเทพชั้นใน",
  "dusit":"กรุงเทพชั้นใน","pathum-wan":"กรุงเทพชั้นใน","ratchathewi":"กรุงเทพชั้นใน","phaya-thai":"กรุงเทพชั้นใน",
  "bang-rak":"กรุงเทพชั้นใน","sathon":"กรุงเทพชั้นใน","bang-sue":"กรุงเทพชั้นใน",
  // สุขุมวิท–ใต้ — Sukhumvit corridor + riverside south
  "vadhana":"สุขุมวิท–ฝั่งใต้","khlong-toei":"สุขุมวิท–ฝั่งใต้","phra-khanong":"สุขุมวิท–ฝั่งใต้",
  "bang-na":"สุขุมวิท–ฝั่งใต้","yan-nawa":"สุขุมวิท–ฝั่งใต้","bang-kho-laem":"สุขุมวิท–ฝั่งใต้",
  // รัชดา–ลาดพร้าว–เหนือ
  "huai-khwang":"รัชดา–ลาดพร้าว–เหนือ","din-daeng":"รัชดา–ลาดพร้าว–เหนือ","chatuchak":"รัชดา–ลาดพร้าว–เหนือ",
  "lat-phrao":"รัชดา–ลาดพร้าว–เหนือ","wang-thonglang":"รัชดา–ลาดพร้าว–เหนือ","bang-kapi":"รัชดา–ลาดพร้าว–เหนือ",
  "bueng-kum":"รัชดา–ลาดพร้าว–เหนือ","lak-si":"รัชดา–ลาดพร้าว–เหนือ","bang-khen":"รัชดา–ลาดพร้าว–เหนือ",
  "sai-mai":"รัชดา–ลาดพร้าว–เหนือ","don-mueang":"รัชดา–ลาดพร้าว–เหนือ",
  // ตะวันออก
  "suan-luang":"กรุงเทพตะวันออก","prawet":"กรุงเทพตะวันออก","saphan-sung":"กรุงเทพตะวันออก",
  "khan-na-yao":"กรุงเทพตะวันออก","min-buri":"กรุงเทพตะวันออก","nong-chok":"กรุงเทพตะวันออก",
  "lat-krabang":"กรุงเทพตะวันออก","khlong-sam-wa":"กรุงเทพตะวันออก",
  // ฝั่งธนบุรี
  "thon-buri":"ฝั่งธนบุรี","khlong-san":"ฝั่งธนบุรี","bangkok-noi":"ฝั่งธนบุรี","bangkok-yai":"ฝั่งธนบุรี",
  "bang-phlat":"ฝั่งธนบุรี","taling-chan":"ฝั่งธนบุรี","phasi-charoen":"ฝั่งธนบุรี","bang-khae":"ฝั่งธนบุรี",
  "nong-khaem":"ฝั่งธนบุรี","thawi-watthana":"ฝั่งธนบุรี","bang-bon":"ฝั่งธนบุรี","chom-thong":"ฝั่งธนบุรี",
  "bang-khun-thian":"ฝั่งธนบุรี","rat-burana":"ฝั่งธนบุรี","thung-khru":"ฝั่งธนบุรี",
};

// Province → ภาค (official 6-region scheme), keyed by EXACT Thai province name (no
// transliteration ambiguity). Province seed files carry kind:"province".
const REGION_NORTH = "ภาคเหนือ", REGION_NE = "ภาคอีสาน", REGION_CENTRAL = "ภาคกลาง",
  REGION_EAST = "ภาคตะวันออก", REGION_WEST = "ภาคตะวันตก", REGION_SOUTH = "ภาคใต้";
const PROVINCE_REGION = {};
const setRegion = (region, names) => names.forEach((n) => { PROVINCE_REGION[n] = region; });
setRegion(REGION_NORTH, ["เชียงราย","เชียงใหม่","น่าน","พะเยา","แพร่","แม่ฮ่องสอน","ลำปาง","ลำพูน","อุตรดิตถ์"]);
setRegion(REGION_NE, ["กาฬสินธุ์","ขอนแก่น","ชัยภูมิ","นครพนม","นครราชสีมา","บึงกาฬ","บุรีรัมย์","มหาสารคาม","มุกดาหาร","ยโสธร","ร้อยเอ็ด","เลย","ศรีสะเกษ","สกลนคร","สุรินทร์","หนองคาย","หนองบัวลำภู","อำนาจเจริญ","อุดรธานี","อุบลราชธานี"]);
setRegion(REGION_CENTRAL, ["กำแพงเพชร","ชัยนาท","นครนายก","นครปฐม","นครสวรรค์","นนทบุรี","ปทุมธานี","พระนครศรีอยุธยา","พิจิตร","พิษณุโลก","เพชรบูรณ์","ลพบุรี","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สระบุรี","อ่างทอง","อุทัยธานี"]);
setRegion(REGION_EAST, ["จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ตราด","ปราจีนบุรี","ระยอง","สระแก้ว"]);
setRegion(REGION_WEST, ["กาญจนบุรี","ตาก","ประจวบคีรีขันธ์","เพชรบุรี","ราชบุรี"]);
setRegion(REGION_SOUTH, ["กระบี่","ชุมพร","ตรัง","นครศรีธรรมราช","นราธิวาส","ปัตตานี","พังงา","พัทลุง","ภูเก็ต","ยะลา","ระนอง","สงขลา","สตูล","สุราษฎร์ธานี"]);

const files = readdirSync("data/seed").filter((f) => f.endsWith(".json"));
const metas = [];
for (const f of files) {
  const key = f.replace(/\.json$/, "");
  const d = JSON.parse(readFileSync(`data/seed/${f}`, "utf8"));
  const pois = d.pois || [];
  if (!pois.length) { console.warn(`skip ${key}: 0 POIs`); continue; }
  const lat = pois.reduce((a, p) => a + p.lat, 0) / pois.length;
  const lng = pois.reduce((a, p) => a + p.lng, 0) / pois.length;
  // tier: spot (tourist) > province > neighbourhood (no relation id) > Bangkok district
  let tier, zone;
  if (d.kind === "spot") { tier = "spot"; zone = "จุดเที่ยวยอดนิยม"; }
  else if (d.kind === "province") { tier = "province"; zone = PROVINCE_REGION[d.districtTh] || "พื้นที่อื่น"; }
  else if (d.osmRelationId == null) { tier = "neighborhood"; zone = NEIGHBORHOOD_ZONE; }
  else { tier = "district"; zone = ZONE[key] || "พื้นที่อื่น"; }
  metas.push({ key, th: d.districtTh, en: d.districtEn || d.district, tier, zone, count: pois.length, lat: +lat.toFixed(5), lng: +lng.toFixed(5) });
}

// Order: neighbourhoods, then Bangkok districts, then provinces — each by count desc.
// (The picker regroups by zone; this controls within-zone ordering = densest first.)
const TIER_RANK = { neighborhood: 0, spot: 1, district: 2, province: 3 };
metas.sort((a, b) => {
  if (a.tier !== b.tier) return TIER_RANK[a.tier] - TIER_RANK[b.tier];
  return b.count - a.count;
});

const anyUnzoned = metas.filter((m) => m.zone === "พื้นที่อื่น").map((m) => m.key);
if (anyUnzoned.length) console.warn(`unzoned districts (fell back to พื้นที่อื่น): ${anyUnzoned.join(", ")}`);

const metaLines = metas.map((m) =>
  `  { key: ${JSON.stringify(m.key)}, th: ${JSON.stringify(m.th)}, en: ${JSON.stringify(m.en)}, tier: ${JSON.stringify(m.tier)}, zone: ${JSON.stringify(m.zone)}, count: ${m.count}, lat: ${m.lat}, lng: ${m.lng} },`
).join("\n");

const loaderLines = metas.map((m) =>
  `  ${JSON.stringify(m.key)}: () => import(${JSON.stringify(`@/data/seed/${m.key}.json`)}).then((mod) => mod.default as unknown as SeedDistrict),`
).join("\n");

const out = `// AUTO-GENERATED by scripts/gen-registry.mjs — do not edit by hand.
// Regenerate after seeding: \`node scripts/gen-registry.mjs\`.
// Metadata (below) is tiny and statically imported for the picker; each district's
// full POI list loads lazily via DISTRICT_LOADERS so the bundle stays small.
import type { SeedDistrict } from "@/lib/plan/buildPlan";

export type DistrictTier = "neighborhood" | "spot" | "district" | "province";
export interface DistrictMeta {
  key: string;
  th: string;
  en: string;
  tier: DistrictTier;
  zone: string;
  count: number;
  lat: number;
  lng: number;
}

export const DISTRICTS: DistrictMeta[] = [
${metaLines}
];

export const DISTRICT_KEYS: string[] = DISTRICTS.map((d) => d.key);

export const DISTRICT_LOADERS: Record<string, () => Promise<SeedDistrict>> = {
${loaderLines}
};

// Picker grouping order: Bangkok (neighbourhoods + zones) first, then the 6 ภาค.
export const ZONE_ORDER: string[] = [
  ${JSON.stringify(NEIGHBORHOOD_ZONE)},
  "จุดเที่ยวยอดนิยม",
  "กรุงเทพชั้นใน",
  "สุขุมวิท–ฝั่งใต้",
  "รัชดา–ลาดพร้าว–เหนือ",
  "ฝั่งธนบุรี",
  "กรุงเทพตะวันออก",
  "ภาคกลาง",
  "ภาคตะวันออก",
  "ภาคเหนือ",
  "ภาคอีสาน",
  "ภาคตะวันตก",
  "ภาคใต้",
  "พื้นที่อื่น",
];
`;

writeFileSync("lib/poi/registry.generated.ts", out);
const byTier = (t) => metas.filter((m) => m.tier === t).length;
console.log(`✓ wrote lib/poi/registry.generated.ts — ${metas.length} areas (${byTier("neighborhood")} neighbourhoods + ${byTier("district")} BKK districts + ${byTier("province")} provinces), ${metas.reduce((a, m) => a + m.count, 0)} POIs`);
