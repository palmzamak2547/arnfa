import type { SeedDistrict, SeedPoi } from "@/lib/plan/buildPlan";

// Helper to create POIs
function makePoi(
  id: string,
  name: string,
  nameTh: string,
  category: string,
  lat: number,
  lng: number,
  rating: number,
  price: number, // Ticket / average price in THB
  stayMin: number,
  openHrs: string,
  outdoorness: number,
  tags: Record<string, string> = {}
): SeedPoi {
  return {
    id,
    osmId: Math.floor(Math.random() * 10000000),
    name,
    nameTh,
    lat,
    lng,
    category,
    profile: {
      outdoorness,
      indoorness: 1.0 - outdoorness,
      shade: outdoorness > 0.5 ? 0.4 : 0.9,
      covered: outdoorness > 0.5 ? 0.2 : 1.0,
      rainEnjoyment: outdoorness > 0.5 ? 0.1 : 0.8,
      heatTolerance: outdoorness > 0.5 ? 0.3 : 0.8,
      confidence: 0.9,
    },
    openingHoursRaw: openHrs,
    tags: {
      rating: rating.toString(),
      price: price.toString(),
      stay_duration: stayMin.toString(),
      ...tags,
    },
  };
}

// 1. Chiang Mai POIs (15 spots)
const chiangMaiPois: SeedPoi[] = [
  makePoi("cm-wat-phra-singh", "Wat Phra Singh", "วัดพระสิงห์วรมหาวิหาร", "museum", 18.7889, 98.9824, 4.8, 40, 60, "09:00-18:00", 0.4, { province: "Chiang Mai" }),
  makePoi("cm-wat-chedi-luang", "Wat Chedi Luang", "วัดเจดีย์หลวงวรวิหาร", "museum", 18.7870, 98.9865, 4.7, 50, 60, "08:00-17:00", 0.6, { province: "Chiang Mai" }),
  makePoi("cm-doi-suthep", "Wat Phra That Doi Suthep", "วัดพระธาตุดอยสุเทพ", "viewpoint", 18.8049, 98.9216, 4.9, 100, 90, "06:00-20:00", 0.7, { province: "Chiang Mai" }),
  makePoi("cm-night-bazaar", "Chiang Mai Night Bazaar", "ไนท์บาซาร์เชียงใหม่", "market", 18.7853, 99.0003, 4.4, 0, 120, "17:00-23:00", 0.8, { province: "Chiang Mai" }),
  makePoi("cm-jing-jai-market", "Jing Jai Market", "ตลาดจริงใจ", "market", 18.8073, 99.0018, 4.6, 0, 90, "06:00-13:00", 0.7, { province: "Chiang Mai" }),
  makePoi("cm-nimman-soi-9", "Nimmanhaemin Road Soi 9", "นิมมานเหมินท์ ซอย 9", "cafe", 18.7994, 98.9680, 4.5, 120, 60, "09:00-21:00", 0.3, { province: "Chiang Mai" }),
  makePoi("cm-one-nimman", "One Nimman", "วัน นิมมาน", "mall", 18.8005, 98.9682, 4.6, 0, 90, "11:00-22:00", 0.2, { province: "Chiang Mai" }),
  makePoi("cm-huay-tung-tao", "Huay Tung Tao Lake", "อ่างเก็บน้ำห้วยตึงเฒ่า", "park", 18.8643, 98.9430, 4.5, 20, 120, "07:00-18:00", 0.9, { province: "Chiang Mai" }),
  makePoi("cm-royal-flora", "Royal Park Rajapruek", "อุทยานหลวงราชพฤกษ์", "garden", 18.7460, 98.9248, 4.7, 100, 150, "08:00-18:00", 0.95, { province: "Chiang Mai" }),
  makePoi("cm-zoo", "Chiang Mai Night Safari", "เชียงใหม่ไนท์ซาฟารี", "park", 18.7422, 98.9171, 4.5, 300, 180, "11:00-22:00", 0.8, { province: "Chiang Mai" }),
  makePoi("cm-art-in-paradise", "Art in Paradise Chiang Mai", "อาร์ต อิน พาราไดซ์", "gallery", 18.7758, 99.0001, 4.3, 200, 90, "09:00-19:00", 0.05, { province: "Chiang Mai" }),
  makePoi("cm-maiyam-museum", "MAIIAM Contemporary Art Museum", "พิพิธภัณฑ์ศิลปะร่วมสมัยใหม่เอี่ยม", "museum", 18.7944, 99.1022, 4.6, 150, 90, "10:00-18:00", 0.0, { province: "Chiang Mai" }),
  makePoi("cm-woo-cafe", "Woo Cafe & Art Gallery", "วู คาเฟ่ แอนด์ อาร์ต แกลเลอรี", "cafe", 18.7912, 99.0041, 4.5, 250, 60, "10:00-22:00", 0.1, { province: "Chiang Mai" }),
  makePoi("cm-riverside-bar", "The Riverside Bar & Restaurant", "เดอะ ริเวอร์ไซด์ บาร์ แอนด์ เรสเตอรองต์", "bar", 18.7909, 99.0043, 4.4, 400, 120, "17:00-00:00", 0.3, { province: "Chiang Mai" }),
  makePoi("cm-thapae-gate", "Tha Phae Gate", "ประตูท่าแพ", "viewpoint", 18.7878, 98.9932, 4.5, 0, 30, "00:00-23:59", 1.0, { province: "Chiang Mai" }),
];

// 2. Phuket POIs (15 spots)
const phuketPois: SeedPoi[] = [
  makePoi("pk-wat-chalong", "Wat Chalong (Wat Chaithararam)", "วัดฉลอง (วัดไชยธาราราม)", "museum", 7.8468, 98.3369, 4.8, 0, 60, "08:00-17:00", 0.5, { province: "Phuket" }),
  makePoi("pk-big-buddha", "Phuket Big Buddha", "พระพุทธมิ่งมงคลเอกนาคคีรี", "viewpoint", 7.8277, 98.3128, 4.7, 0, 60, "06:00-18:30", 0.8, { province: "Phuket" }),
  makePoi("pk-phromthep", "Phromthep Cape", "แหลมพรหมเทพ", "viewpoint", 7.7621, 98.3039, 4.8, 0, 95, "00:00-23:59", 1.0, { province: "Phuket" }),
  makePoi("pk-patong-beach", "Patong Beach", "หาดป่าตอง", "park", 7.8988, 98.2965, 4.5, 0, 120, "00:00-23:59", 1.0, { province: "Phuket" }),
  makePoi("pk-kata-beach", "Kata Beach", "หาดกะตะ", "park", 7.8202, 98.2996, 4.6, 0, 120, "00:00-23:59", 1.0, { province: "Phuket" }),
  makePoi("pk-old-town", "Phuket Old Town", "ย่านเมืองเก่าภูเก็ต", "market", 7.8848, 98.3891, 4.6, 0, 120, "00:00-23:59", 0.7, { province: "Phuket" }),
  makePoi("pk-sunday-market", "Phuket Sunday Walking Street Market", "หลาดใหญ่", "market", 7.8847, 98.3892, 4.7, 0, 90, "16:00-22:00", 0.8, { province: "Phuket" }),
  makePoi("pk-aquaria", "Aquaria Phuket", "อควาเรีย ภูเก็ต", "museum", 7.8920, 98.3678, 4.6, 850, 120, "10:30-19:00", 0.05, { province: "Phuket" }),
  makePoi("pk-central", "Central Phuket Floresta", "เซ็นทรัล ภูเก็ต ฟลอเรสต้า", "mall", 7.8919, 98.3675, 4.5, 0, 120, "10:00-22:00", 0.1, { province: "Phuket" }),
  makePoi("pk-trickeye", "Phuket 3D Museum (Trickeye)", "พิพิธภัณฑ์ภาพ 3 มิติ ภูเก็ต", "gallery", 7.8837, 98.3917, 4.4, 300, 90, "10:00-19:00", 0.0, { province: "Phuket" }),
  makePoi("pk-book-hemian", "Bookhemian Cafe", "บุ๊คเฮเมียน คาเฟ่", "cafe", 7.8844, 98.3893, 4.5, 150, 60, "09:00-19:00", 0.1, { province: "Phuket" }),
  makePoi("pk-chalong-bay", "Chalong Bay Rum Distillery", "โรงกลั่นเหล้าฉลองเบย์", "bar", 7.8228, 98.3496, 4.6, 450, 90, "11:00-22:00", 0.3, { province: "Phuket" }),
  makePoi("pk-karon-viewpoint", "Karon Viewpoint", "จุดชมวิวสามอ่าว", "viewpoint", 7.7972, 98.3023, 4.6, 0, 30, "00:00-23:59", 0.95, { province: "Phuket" }),
  makePoi("pk-cafe-del-mar", "Cafe Del Mar Phuket", "คาเฟ่ เดล มาร์ ภูเก็ต", "bar", 7.9734, 98.2774, 4.3, 600, 120, "11:00-02:00", 0.6, { province: "Phuket" }),
  makePoi("pk-mookda-spa", "Mookda Spa", "มุกดา สปา", "other", 7.9045, 98.3082, 4.5, 1200, 120, "10:00-22:00", 0.0, { province: "Phuket" }),
];

// 3. Chonburi / Pattaya POIs (15 spots)
const chonburiPois: SeedPoi[] = [
  makePoi("cb-sanctuary-truth", "Sanctuary of Truth", "ปราสาทสัจธรรม", "museum", 12.9727, 100.8891, 4.8, 500, 120, "08:00-18:00", 0.7, { province: "Chonburi" }),
  makePoi("cb-nong-nooch", "Nong Nooch Tropical Garden", "สวนนงนุชพัทยา", "garden", 12.7663, 100.9338, 4.6, 500, 180, "08:00-18:00", 0.9, { province: "Chonburi" }),
  makePoi("cb-khao-kheow", "Khao Kheow Open Zoo", "สวนสัตว์เปิดเขาเขียว", "park", 13.2155, 101.0566, 4.5, 250, 180, "08:00-18:00", 0.95, { province: "Chonburi" }),
  makePoi("cb-pattaya-beach", "Pattaya Beach", "หาดพัทยา", "park", 12.9352, 100.8757, 4.3, 0, 120, "00:00-23:59", 1.0, { province: "Chonburi" }),
  makePoi("cb-bangsaen-beach", "Bangsaen Beach", "หาดบางแสน", "park", 13.2844, 100.9038, 4.4, 0, 120, "00:00-23:59", 1.0, { province: "Chonburi" }),
  makePoi("cb-lan-pho-market", "Lan Pho Na Klua Market", "ตลาดลานโพธิ์นาเกลือ", "market", 12.9712, 100.9056, 4.5, 0, 90, "06:00-18:00", 0.75, { province: "Chonburi" }),
  makePoi("cb-terminal-21", "Terminal 21 Pattaya", "เทอร์มินอล 21 พัทยา", "mall", 12.9493, 100.8887, 4.6, 0, 120, "11:00-22:00", 0.1, { province: "Chonburi" }),
  makePoi("cb-art-in-bottle", "Art in Bottle Museum", "พิพิธภัณฑ์ศิลปะในขวดแก้ว", "museum", 12.9427, 100.8998, 4.3, 200, 60, "09:00-18:00", 0.0, { province: "Chonburi" }),
  makePoi("cb-pattaya-viewpoint", "Pattaya Viewpoint (Khao Pattaya)", "จุดชมวิวเขาพระตำหนัก", "viewpoint", 12.9218, 100.8656, 4.7, 0, 45, "07:00-22:00", 0.8, { province: "Chonburi" }),
  makePoi("cb-ramayana", "Ramayana Water Park", "สวนน้ำรามายณะ", "park", 12.7523, 100.9632, 4.7, 1190, 240, "11:00-18:00", 0.9, { province: "Chonburi" }),
  makePoi("cb-the-glass-house", "The Glass House Pattaya", "เดอะ กลาสเฮ้าส์ พัทยา", "restaurant", 12.8482, 100.8988, 4.5, 450, 90, "11:00-23:00", 0.4, { province: "Chonburi" }),
  makePoi("cb-sky-gallery", "The Sky Gallery Pattaya", "เดอะ สกาย แกลเลอรี พัทยา", "restaurant", 12.9213, 100.8596, 4.4, 400, 90, "08:00-22:00", 0.6, { province: "Chonburi" }),
  makePoi("cb-cave-beach", "Cave Beach Club", "เคฟ บีช คลับ", "cafe", 12.8475, 100.8992, 4.4, 300, 75, "11:00-00:00", 0.5, { province: "Chonburi" }),
  makePoi("cb-beer-garden", "Pattaya Beer Garden", "พัทยาเบียร์การ์เดน", "bar", 12.9255, 100.8724, 4.3, 350, 90, "10:00-02:00", 0.4, { province: "Chonburi" }),
  makePoi("cb-underwater-world", "Underwater World Pattaya", "อันเดอร์วอเตอร์ เวิลด์ พัทยา", "museum", 12.8967, 100.8963, 4.4, 450, 90, "09:00-18:00", 0.05, { province: "Chonburi" }),
];

/**
 * Returns a fully formatted SeedDistrict district for Chiang Mai, Phuket, or Chonburi.
 */
export function getMockProvinceDistrict(key: string): SeedDistrict {
  if (key === "chiang-mai") {
    return {
      district: "chiang-mai",
      districtTh: "เชียงใหม่ (เมือง)",
      bbox: [18.70, 98.88, 18.88, 99.08],
      fetchedAt: new Date().toISOString(),
      count: chiangMaiPois.length,
      pois: chiangMaiPois,
    };
  }
  if (key === "phuket") {
    return {
      district: "phuket",
      districtTh: "ภูเก็ต (ป่าตอง/เมือง)",
      bbox: [7.70, 98.20, 8.00, 98.50],
      fetchedAt: new Date().toISOString(),
      count: phuketPois.length,
      pois: phuketPois,
    };
  }
  if (key === "chonburi") {
    return {
      district: "chonburi",
      districtTh: "ชลบุรี (พัทยา/บางแสน)",
      bbox: [12.70, 100.80, 13.35, 101.10],
      fetchedAt: new Date().toISOString(),
      count: chonburiPois.length,
      pois: chonburiPois,
    };
  }
  throw new Error(`unknown mock province: ${key}`);
}
