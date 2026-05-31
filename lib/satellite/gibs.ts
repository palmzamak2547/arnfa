/**
 * NASA GIBS (Global Imagery Browse Services) — free, no-key satellite imagery as
 * map raster tiles. We expose two layers verified to serve over Thailand:
 *   - true-color   (MODIS Terra CorrectedReflectance) — the actual photograph
 *   - aerosol/haze (MODIS Combined Value-Added AOD)    — where the haze/dust is
 *
 * HONEST: these are polar-orbiter products — the satellite passes ~once a day, so
 * each layer is a DAILY snapshot, not live-moving cloud. We default to yesterday
 * UTC (today often isn't processed yet) and label it as a daily image in the UI.
 * Missing tiles simply don't render; the plan never depends on imagery.
 *
 * Docs: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
 */

export type GibsLayerKey = "truecolor" | "aerosol";

export type GibsLayer = {
  key: GibsLayerKey;
  id: string;
  matrixSet: string;
  ext: "jpg" | "png";
  /** Highest zoom the matrix set actually serves; MapLibre overzooms past this. */
  maxNativeZoom: number;
  /** How many days back is reliably processed (true-color D-1, AOD D-2). */
  lagDays: number;
  opacity: number;
  th: string;
  en: string;
  descTh: string;
  descEn: string;
};

export const GIBS_LAYERS: GibsLayer[] = [
  {
    key: "truecolor",
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    matrixSet: "GoogleMapsCompatible_Level9",
    ext: "jpg",
    maxNativeZoom: 9,
    lagDays: 1,
    opacity: 1,
    th: "ภาพถ่ายจริง",
    en: "Satellite",
    descTh: "ภาพถ่ายดาวเทียม NASA",
    descEn: "NASA true-colour",
  },
  {
    key: "aerosol",
    id: "MODIS_Combined_Value_Added_AOD",
    matrixSet: "GoogleMapsCompatible_Level6",
    ext: "png",
    maxNativeZoom: 6,
    lagDays: 2,
    opacity: 0.72,
    th: "หมอกควัน",
    en: "Haze",
    descTh: "ความหนาแน่นละออง (หมอกควัน/ฝุ่น)",
    descEn: "Aerosol depth (haze/dust)",
  },
];

const BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

/** Most-recent reliably-processed GIBS date in UTC, `lagDays` back (today isn't ready). */
export function gibsDate(now: Date, lagDays = 1): string {
  const d = new Date(now.getTime() - lagDays * 24 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A MapLibre raster `tiles` template ({z}/{y}/{x}) for the given layer + date. */
export function gibsTileUrl(layer: GibsLayer, dateISO: string): string {
  return `${BASE}/${layer.id}/default/${dateISO}/${layer.matrixSet}/{z}/{y}/{x}.${layer.ext}`;
}

export function gibsLayer(key: GibsLayerKey): GibsLayer {
  const l = GIBS_LAYERS.find((x) => x.key === key);
  if (!l) throw new Error(`unknown GIBS layer: ${key}`);
  return l;
}
