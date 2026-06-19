/**
 * sources — the single registry of every REAL data source Arnfa runs on. One list →
 * the home provenance ledger AND the /data "FACT not estimation" page derive from it, so
 * the source count is never a magic number and a new source shows up everywhere at once.
 * This is the BDI "cite source + License" rule made structural: open data, Thai-government
 * data flagged, each with what it powers and a link. Iron Rule 0: if it's not real, it's
 * not here.
 */
export type DataKind = "forecast" | "air" | "places" | "green" | "safety" | "map" | "satellite" | "routing";

export type DataSource = {
  key: string;
  name: string;
  org: string;        // หน่วยงาน (Thai)
  orgEn: string;
  url: string;
  license: string;
  kind: DataKind;
  role: string;       // ใช้ทำอะไร (Thai)
  roleEn: string;
  thaiGov?: boolean;  // Thai-government open data — the credibility anchor for BDI
  dormant?: boolean;  // wired, lights up when a key is set
};

export const KIND_LABEL: Record<DataKind, { th: string; en: string }> = {
  forecast: { th: "พยากรณ์อากาศ", en: "Forecast" },
  air: { th: "คุณภาพอากาศ / ฝุ่น", en: "Air quality" },
  places: { th: "สถานที่", en: "Places" },
  green: { th: "พื้นที่สีเขียว (ทางการ)", en: "Green space (official)" },
  safety: { th: "ความปลอดภัย (ทางการ)", en: "Safety (official)" },
  map: { th: "แผนที่ + เรดาร์", en: "Map + radar" },
  satellite: { th: "ดาวเทียม", en: "Satellite" },
  routing: { th: "การเดินทาง", en: "Navigation" },
};

export const KIND_ORDER: DataKind[] = ["forecast", "air", "green", "safety", "places", "map", "satellite", "routing"];

export const DATA_SOURCES: DataSource[] = [
  { key: "open-meteo", name: "Open-Meteo", org: "Open-Meteo", orgEn: "Open-Meteo", url: "https://open-meteo.com", license: "CC-BY 4.0", kind: "forecast", role: "พยากรณ์รายชั่วโมง (หลัก)", roleEn: "Hourly forecast (primary)" },
  { key: "met-norway", name: "MET Norway", org: "สถาบันอุตุนิยมวิทยานอร์เวย์", orgEn: "Norwegian Met Institute", url: "https://api.met.no", license: "NLOD / CC-BY 4.0", kind: "forecast", role: "พยากรณ์สำรองชั้น 2", roleEn: "Forecast fallback L2" },
  { key: "open-meteo-marine", name: "Open-Meteo Marine", org: "Open-Meteo", orgEn: "Open-Meteo", url: "https://open-meteo.com/en/docs/marine-weather-api", license: "CC-BY 4.0", kind: "forecast", role: "คลื่น + อุณหภูมิน้ำทะเล", roleEn: "Waves + sea temp" },

  { key: "air4thai", name: "Air4Thai", org: "กรมควบคุมมลพิษ (คพ.)", orgEn: "Thai Pollution Control Dept", url: "http://air4thai.pcd.go.th", license: "ข้อมูลเปิดภาครัฐไทย", kind: "air", role: "PM2.5 รายสถานี", roleEn: "PM2.5 by station", thaiGov: true },
  { key: "nasa-firms", name: "NASA FIRMS", org: "NASA", orgEn: "NASA", url: "https://firms.modaps.eosdis.nasa.gov", license: "NASA open data", kind: "air", role: "จุดความร้อน/ไฟ · หมอกควัน (VIIRS)", roleEn: "Active fire / haze (VIIRS)" },

  { key: "bma-parks", name: "สวนสาธารณะ กทม.", org: "กรุงเทพมหานคร", orgEn: "Bangkok (BMA)", url: "https://data.bangkok.go.th/dataset/park", license: "ข้อมูลเปิด กทม.", kind: "green", role: "สวนทางการ 47 แห่ง (พิกัด+เวลา+ขนาด)", roleEn: "47 official parks", thaiGov: true },

  { key: "bma-cooling", name: "ห้องหลบร้อน กทม.", org: "กรุงเทพมหานคร", orgEn: "Bangkok (BMA)", url: "https://bmamap.bangkok.go.th", license: "ข้อมูลเปิด กทม.", kind: "safety", role: "ที่หลบร้อน/ฝุ่นทางการ 592 จุด", roleEn: "592 official heat/haze refuges", thaiGov: true },

  { key: "osm", name: "OpenStreetMap", org: "OSM Foundation", orgEn: "OSM Foundation", url: "https://www.openstreetmap.org", license: "ODbL", kind: "places", role: "สถานที่ + แท็กโครงสร้าง (20k+ จุด)", roleEn: "POIs + structured tags (20k+)" },

  { key: "openfreemap", name: "OpenFreeMap", org: "OpenFreeMap", orgEn: "OpenFreeMap", url: "https://openfreemap.org", license: "ODbL", kind: "map", role: "แผนที่ฐาน", roleEn: "Basemap" },
  { key: "rainviewer", name: "RainViewer", org: "RainViewer", orgEn: "RainViewer", url: "https://www.rainviewer.com", license: "free API", kind: "map", role: "เรดาร์ฝน", roleEn: "Rain radar" },

  { key: "nasa-gibs", name: "NASA GIBS", org: "NASA", orgEn: "NASA", url: "https://nasa-gibs.github.io/gibs-api-docs/", license: "NASA open data", kind: "satellite", role: "ภาพถ่ายดาวเทียม · ละอองลอย", roleEn: "Satellite imagery · aerosol" },

  { key: "ors", name: "OpenRouteService", org: "HeiGIT / OSM", orgEn: "HeiGIT / OSM", url: "https://openrouteservice.org", license: "open · key-gated", kind: "routing", role: "เวลาเดินจริง (เมื่อใส่ key)", roleEn: "Real walking times (when keyed)", dormant: true },
];

export const ACTIVE_SOURCE_COUNT = DATA_SOURCES.filter((s) => !s.dormant).length;
export const THAI_GOV_COUNT = DATA_SOURCES.filter((s) => s.thaiGov).length;
