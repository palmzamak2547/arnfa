/**
 * i18n resources — TH primary, EN fallback.
 * Spec: projects/arnfa/05-phase-0-scope.md § i18n
 */

export const resources = {
  th: {
    translation: {
      brand: "อ่านฟ้า",
      "hero.kicker": "อ่านฟ้า — Arnfah",
      "hero.title1": "วันนี้ฟ้าเปิด",
      "hero.title2": "— ไปไหนดี?",
      "hero.sub": "Decision engine ที่อ่านฟ้าให้คุณ. วางแผนทริปทั่วไทยให้ลงล็อกกับอากาศ ณ เวลาที่จะไปถึง — ฝนมาเมื่อไหร่ Arnfah บอกที่ดีกว่าให้เอง.",
      "hero.cta.plan": "เริ่มวางแผนวันนี้",
      "hero.cta.how": "Arnfah คิดยังไง",
      "plan.title": "วางแผนทริป",
      "plan.area": "ย่าน",
      "plan.time": "เวลา",
      "plan.loading": "กำลังอ่านฟ้า",
      "plan.error": "ดูฟ้าตอนนี้ไม่ได้",
      "plan.empty": "ไม่มีที่แนะนำในเวลานี้ — ลองเพิ่มเวลาหรือเปลี่ยนย่านดู",
      "budget.half": "ครึ่งวัน",
      "budget.full": "เต็มวัน",
      "budget.quick": "แวบเดียว",
    },
  },
  en: {
    translation: {
      brand: "Arnfah",
      "hero.kicker": "อ่านฟ้า — Arnfah",
      "hero.title1": "Clear skies today",
      "hero.title2": "— where to?",
      "hero.sub": "A decision engine that reads the sky for you. Plan a day anywhere in Thailand that fits the weather at the moment you arrive — when rain comes, Arnfah names a better place.",
      "hero.cta.plan": "Plan today",
      "hero.cta.how": "How Arnfah thinks",
      "plan.title": "Plan a trip",
      "plan.area": "Area",
      "plan.time": "Time",
      "plan.loading": "Reading the sky over",
      "plan.error": "Can't read the sky right now",
      "plan.empty": "Nothing to suggest right now — try more time or another area",
      "budget.half": "Half day",
      "budget.full": "Full day",
      "budget.quick": "Quick stop",
    },
  },
  zh: {
    translation: {
      brand: "Arnfah",
      "hero.kicker": "อ่านฟ้า · Arnfah",
      "hero.title1": "今天天气晴朗",
      "hero.title2": "— 去哪儿好？",
      "hero.sub": "为你读懂天气的决策引擎。规划泰国各地的行程，贴合你到达时的天气 — 下雨了，Arnfah 会帮你换个更合适的地方。",
      "hero.cta.plan": "开始规划",
      "hero.cta.how": "Arnfah 如何思考",
      "plan.title": "规划行程",
      "plan.area": "区域",
      "plan.time": "时间",
      "plan.loading": "正在读取天气",
      "plan.error": "暂时无法读取天气",
      "plan.empty": "暂无推荐 — 试试增加时间或换个区域",
      "budget.half": "半天",
      "budget.full": "全天",
      "budget.quick": "快速",
    },
  },
} as const;

export type Locale = keyof typeof resources;
export const LOCALES: Locale[] = ["th", "en", "zh"];
