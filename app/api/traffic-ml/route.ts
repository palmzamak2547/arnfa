import { NextRequest } from "next/server";
import { predictSeverity, PredictorFeatures } from "@/lib/ml/trafficPredictor";

export const runtime = "nodejs";

function json(body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

type RawIncident = {
  eid?: string;
  title?: string;
  title_en?: string;
  description?: string;
  description_en?: string;
  latitude?: string;
  longitude?: string;
  icon?: string;
  severity?: string;
};

interface OpenMeteoCurrentWeather {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  wind_speed_10m?: number;
}

interface OpenMeteoLocationResponse {
  latitude: number;
  longitude: number;
  current?: OpenMeteoCurrentWeather;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch live traffic incidents from Longdo API
    const incidentsRes = await fetch("https://event.longdo.com/feed/json", {
      signal: AbortSignal.timeout(6000),
    });
    if (!incidentsRes.ok) return json({ incidents: [] });

    const raw = (await incidentsRes.json()) as RawIncident[];
    const incidents = (Array.isArray(raw) ? raw : [])
      .map((e) => ({
        eid: String(e.eid ?? ""),
        title: String(e.title ?? ""),
        titleEn: String(e.title_en ?? e.title ?? ""),
        desc: String(e.description ?? ""),
        descEn: String(e.description_en ?? e.description ?? ""),
        lat: Number(e.latitude),
        lng: Number(e.longitude),
        icon: String(e.icon ?? ""),
        severityReported: String(e.severity ?? "1"),
      }))
      .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
      // Limit to 30 incidents to keep weather batch fetch fast and lightweight
      .slice(0, 30);

    if (incidents.length === 0) {
      return json({ incidents: [] });
    }

    // 2. Fetch live weather for each coordinate in a single batch call from Open-Meteo
    const lats = incidents.map((i) => i.lat.toFixed(4)).join(",");
    const lns = incidents.map((i) => i.lng.toFixed(4)).join(",");

    let weatherMap = new Map<string, OpenMeteoCurrentWeather>();

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lns}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia/Bangkok`;
      const weatherRes = await fetch(weatherUrl, {
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Arnfa/0.1" },
      });

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        // Open-Meteo returns an array if querying multiple locations, or a single object if only 1 location is queried.
        if (Array.isArray(weatherData)) {
          weatherData.forEach((item: OpenMeteoLocationResponse) => {
            const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
            if (item.current) weatherMap.set(key, item.current);
          });
        } else if (weatherData && weatherData.current) {
          const key = `${Number(weatherData.latitude).toFixed(4)},${Number(weatherData.longitude).toFixed(4)}`;
          weatherMap.set(key, weatherData.current);
        }
      }
    } catch (err) {
      console.warn("Open-Meteo batch weather request failed, using default values", err);
    }

    // 3. Process incidents through ML model
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18; // approx night hours for Bangkok

    const analyzedIncidents = incidents.map((inc) => {
      // Find weather from map or fallback to standard Bangkok conditions
      const key = `${inc.lat.toFixed(4)},${inc.lng.toFixed(4)}`;
      const weather = weatherMap.get(key) || {
        temperature_2m: 30.0, // 30°C (~86°F)
        relative_humidity_2m: 70, // 70%
        precipitation: 0.0, // 0 mm
        wind_speed_10m: 8.0, // 8 km/h (~5 mph)
      };

      const tempC = weather.temperature_2m ?? 30.0;
      const humidity = weather.relative_humidity_2m ?? 70;
      const precipMm = weather.precipitation ?? 0.0;
      const windKmh = weather.wind_speed_10m ?? 8.0;

      // Unit conversions for ML model
      const tempF = tempC * 1.8 + 32;
      const precipIn = precipMm * 0.0393701;
      const windSpeedMph = windKmh * 0.621371;

      // Estimate visibility based on rain and humidity
      let visibilityMi = 10.0;
      if (precipMm > 2.0) visibilityMi = 2.0;
      else if (precipMm > 0.2) visibilityMi = 5.0;
      else if (humidity > 90) visibilityMi = 7.0;

      // Keywords matching for road characteristics
      const combinedText = `${inc.title} ${inc.desc} ${inc.titleEn} ${inc.descEn}`.toLowerCase();
      
      const features: PredictorFeatures = {
        temperatureF: tempF,
        humidityPercent: humidity,
        precipitationIn: precipIn,
        windSpeedMph,
        visibilityMi,
        isNight,
        junction: combinedText.includes("แยก") || combinedText.includes("ต่างระดับ") || combinedText.includes("junction") || combinedText.includes("interchange") || combinedText.includes("ramp"),
        trafficSignal: combinedText.includes("ไฟแดง") || combinedText.includes("สัญญาณไฟ") || combinedText.includes("traffic light") || combinedText.includes("signal"),
        railway: combinedText.includes("รถไฟ") || combinedText.includes("ราง") || combinedText.includes("railway") || combinedText.includes("rail"),
        crossing: combinedText.includes("ม้าลาย") || combinedText.includes("ทางข้าม") || combinedText.includes("crossing") || combinedText.includes("crosswalk"),
        station: combinedText.includes("สถานี") || combinedText.includes("ป้ายรถ") || combinedText.includes("station") || combinedText.includes("stop"),
        stop: combinedText.includes("หยุด") || combinedText.includes("stop sign"),
      };

      // Run ML prediction
      const mlPrediction = predictSeverity(features);

      return {
        ...inc,
        weather: {
          tempC,
          humidity,
          precipMm,
          windKmh,
          visibilityMi,
        },
        features,
        ml: mlPrediction,
      };
    });

    return json(
      { incidents: analyzedIncidents, provider: "open-meteo + longdo-events", fetchedAt: new Date().toISOString() },
      "public, max-age=60, s-maxage=60" // Cache for 1 min
    );
  } catch (err) {
    return json({ error: "failed_to_analyze", detail: err instanceof Error ? err.message : String(err) }, "no-store");
  }
}
