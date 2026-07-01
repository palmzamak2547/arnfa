import { NextRequest, NextResponse } from "next/server";
import { loadDistrict } from "@/lib/poi/districts";
import { getNvidiaEmbedding, cosineSimilarity } from "@/lib/ai/embeddings";
import { TfIdfRecommender } from "@/lib/ai/recommender";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

let _poiEmbeddingsCache: Record<string, number[]> | null = null;

/**
 * GET /api/recommend
 * Returns top 3 recommended POIs for a district based on weather (sky) and vibes.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const districtKey = sp.get("district") || "";
  const sky = sp.get("sky") || "clear";
  const vibesStr = sp.get("vibes") || "";
  const vibes = vibesStr ? vibesStr.split(",") : [];

  if (!districtKey) {
    return NextResponse.json({ error: "District key is required" }, { status: 400 });
  }

  try {
    const district = await loadDistrict(districtKey);
    if (!district || !district.pois || district.pois.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // Construct semantic search query based on current weather + vibes
    let weatherKeywordEn = "outdoor attraction, sights, walking around";
    let weatherKeywordTh = "สถานที่ท่องเที่ยวกลางแจ้ง ชมวิว เดินเล่น";

    if (sky === "rain" || sky === "storm") {
      weatherKeywordEn = "comfy indoor spot, cafe, shopping mall, museum, gallery, shelter from rain";
      weatherKeywordTh = "ที่เที่ยวในร่ม หลบฝน คาเฟ่ ห้างสรรพสินค้า พิพิธภัณฑ์ หอศิลป์";
    } else if (sky === "cloudy" || sky === "partly") {
      weatherKeywordEn = "outdoor and indoor mixed, street food, temples, cafe, park";
      weatherKeywordTh = "ที่เที่ยวผสมผสาน เดินชิลล์ คาเฟ่ วัด สวนสาธารณะ สตรีทฟู้ด";
    }

    const query = `${weatherKeywordTh} ${weatherKeywordEn} ${vibes.join(" ")}`;

    let scores: Array<{ id: string; score: number }> = [];

    // 1) Try NVIDIA Embeddings + Cosine Similarity
    try {
      if (!_poiEmbeddingsCache) {
        const embeddingsPath = path.join(process.cwd(), "data", "poi_embeddings.json");
        if (fs.existsSync(embeddingsPath)) {
          _poiEmbeddingsCache = JSON.parse(fs.readFileSync(embeddingsPath, "utf-8"));
        }
      }

      if (_poiEmbeddingsCache) {
        const queryVecArray = await getNvidiaEmbedding(query);
        if (queryVecArray && queryVecArray.length > 0) {
          const queryVec = queryVecArray[0];
          scores = district.pois.map(p => {
            const vec = _poiEmbeddingsCache![p.id];
            return { id: p.id, score: vec ? cosineSimilarity(queryVec, vec) : 0 };
          });
        }
      }
    } catch (e) {
      console.error("NVIDIA Recommendation fallback to TF-IDF due to error:", e);
    }

    // 2) Fallback to TF-IDF Recommender if NVIDIA failed/missing
    if (scores.length === 0) {
      const recommender = new TfIdfRecommender();
      for (const p of district.pois) {
        const text = `${p.name} ${p.category} ${p.th || p.en || ""}`;
        recommender.addDocument(p.id, text);
      }
      recommender.build();
      scores = recommender.recommend(query, district.pois.length);
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Map back to POI objects and add reasoning
    const recommendedPois = scores
      .slice(0, 3)
      .map(s => {
        const poi = district.pois.find(p => p.id === s.id);
        if (!poi) return null;

        // Generate reasoning based on weather and categories
        let reason = "แนะนำสำหรับการท่องเที่ยวทั่วไป";
        if (sky === "rain" || sky === "storm") {
          reason = `ในร่มหลบฝนสบาย เหมาะสำหรับช่วงฟ้าครึ้มฝนตก`;
        } else if (poi.category === "cafe") {
          reason = "คาเฟ่บรรยากาศดี เหมาะสำหรับนั่งพักผ่อนชิลล์ๆ";
        } else if (poi.category === "park" || poi.category === "nature") {
          reason = "สวนธรรมชาติร่มรื่น เหมาะกับวันอากาศดี";
        } else {
          reason = "สถานที่ยอดนิยมพร้อมให้คุณเดินชิลล์วันนี้";
        }

        return {
          ...poi,
          score: s.score,
          recommendReason: reason,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ recommendations: recommendedPois });
  } catch (err) {
    console.error("Failed to generate recommendations:", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
