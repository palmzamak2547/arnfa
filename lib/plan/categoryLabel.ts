/** Human labels for every POI category (TH + EN). Single source for the plan list
 *  and the map popups, so a new category never shows as a raw key or "สถานที่". */

const TH: Record<string, string> = {
  cafe: "คาเฟ่", restaurant: "ร้านอาหาร", bar: "บาร์", park: "สวน", garden: "สวน",
  market: "ตลาด", mall: "ห้าง", museum: "พิพิธภัณฑ์", gallery: "แกลเลอรี", library: "ห้องสมุด",
  viewpoint: "จุดชมวิว", playground: "สนามเด็กเล่น", temple: "วัด", nature: "ธรรมชาติ",
  spa: "สปา/นวด", entertainment: "บันเทิง", themepark: "สวนสนุก", other: "สถานที่",
};
const EN: Record<string, string> = {
  cafe: "Café", restaurant: "Restaurant", bar: "Bar", park: "Park", garden: "Garden",
  market: "Market", mall: "Mall", museum: "Museum", gallery: "Gallery", library: "Library",
  viewpoint: "Viewpoint", playground: "Playground", temple: "Temple", nature: "Nature",
  spa: "Spa", entertainment: "Entertainment", themepark: "Theme park", other: "Place",
};

export const categoryTh = (cat: string): string => TH[cat] ?? "สถานที่";
export const categoryEn = (cat: string): string => EN[cat] ?? "Place";
export const categoryLabel = (cat: string, en: boolean): string => (en ? categoryEn(cat) : categoryTh(cat));
