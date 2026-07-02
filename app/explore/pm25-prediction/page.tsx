"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { useLang } from "@/lib/i18n/useLang";

interface PredictionResponse {
  pm25: number;
  status: string;
  description: string;
}

export default function PM25PredictionPage() {
  const { lang } = useLang();
  const en = lang === "en";
  const tx = (th: string, enVal: string) => (en ? enVal : th);

  // Meteorological and historical PM2.5 States
  const [temp, setTemp] = useState<number>(31.0);
  const [rh, setRh] = useState<number>(65);
  const [windSpeed, setWindSpeed] = useState<number>(12.0);
  const [rainfall, setRainfall] = useState<number>(0.0);
  const [rainfallLag1, setRainfallLag1] = useState<number>(0.0);
  const [rainfallLag2, setRainfallLag2] = useState<number>(0.0);
  const [pm25Lag1, setPm25Lag1] = useState<number>(24.0);
  const [pm25Lag2, setPm25Lag2] = useState<number>(28.0);
  const [visibility, setVisibility] = useState<number>(7.5);

  // API Loading / response states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  // Debounced API call on parameter changes
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/air/pm25-predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            temp,
            RH: rh,
            wind_speed: windSpeed,
            rainfall,
            rainfall_lag1: rainfallLag1,
            rainfall_lag2: rainfallLag2,
            pm25_lag1: pm25Lag1,
            pm25_lag2: pm25Lag2,
            visibility,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch predictions");
        }

        const data = (await res.json()) as PredictionResponse;
        if (active) {
          setPrediction(data.pm25);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      void fetchData();
    }, 250); // debounce input tweaks

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    temp,
    rh,
    windSpeed,
    rainfall,
    rainfallLag1,
    rainfallLag2,
    pm25Lag1,
    pm25Lag2,
    visibility,
  ]);

  // AQI Level Calculations (Thailand Standards)
  const getAqiCategory = (val: number) => {
    if (val <= 15.0) {
      return {
        labelTh: "ดีมาก",
        labelEn: "Excellent",
        color: "#3aa537",
        bg: "rgba(58,165,55,0.1)",
        emoji: "🍃",
        descTh: "คุณภาพอากาศดีมาก เหมาะสำหรับทำกิจกรรมกลางแจ้ง",
        descEn: "Excellent air quality. Great for outdoor activities.",
      };
    } else if (val <= 25.0) {
      return {
        labelTh: "ดี",
        labelEn: "Good",
        color: "#8BC34A",
        bg: "rgba(139,195,74,0.1)",
        emoji: "🙂",
        descTh: "คุณภาพอากาศดี สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ",
        descEn: "Good air quality. Normal outdoor activities allowed.",
      };
    } else if (val <= 37.5) {
      return {
        labelTh: "ปานกลาง",
        labelEn: "Moderate",
        color: "#E0A93C",
        bg: "rgba(224,169,60,0.1)",
        emoji: "😐",
        descTh: "คุณภาพปานกลาง ผู้ที่แพ้ง่ายควรลดเวลาทำกิจกรรมกลางแจ้ง",
        descEn: "Moderate quality. Sensitive groups should reduce heavy outdoor activities.",
      };
    } else if (val <= 75.0) {
      return {
        labelTh: "เริ่มมีผลกระทบ",
        labelEn: "Unhealthy for Sensitive Groups",
        color: "#E0683C",
        bg: "rgba(224,104,60,0.1)",
        emoji: "😷",
        descTh: "เริ่มมีผลกระทบต่อสุขภาพ ควรหลีกเลี่ยงหรือสวมหน้ากากป้องกัน",
        descEn: "Unhealthy for sensitive groups. Wear protection or avoid prolonged stays.",
      };
    } else {
      return {
        labelTh: "มีผลกระทบต่อสุขภาพ",
        labelEn: "Hazardous",
        color: "#D9534A",
        bg: "rgba(217,83,74,0.1)",
        emoji: "🚨",
        descTh: "มีผลกระทบต่อสุขภาพอย่างมาก หลีกเลี่ยงกิจกรรมกลางแจ้งทุกชนิด",
        descEn: "Hazardous air quality. Avoid all outdoor activities.",
      };
    }
  };

  const aqi = prediction !== null ? getAqiCategory(prediction) : null;

  return (
    <main className="relative z-10 min-h-screen bg-surface">
      <Masthead />

      <section className="arnfa-grid section-minor bg-white/40 border-b border-hairline py-10">
        <div className="col-content">
          <Link href="/explore" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink font-thai">
            ← {tx("กลับหน้าสำรวจ", "Back to Explore")}
          </Link>
          <p className="font-display text-xs uppercase tracking-[0.25em] text-emerald-600 font-semibold mb-1">
            {tx("เทคโนโลยีจำลองโครงข่ายประสาทเทียม (Deep Learning)", "DEEP LEARNING MODEL")}
          </p>
          <h1 className="font-thai-serif text-3xl sm:text-4xl font-light text-ink leading-tight">
            {tx("ตัวพยากรณ์ค่าฝุ่นละออง PM2.5 กรุงเทพฯ", "Bangkok PM2.5 Prediction Sandbox")}
          </h1>
          <p className="mt-2.5 max-w-[70ch] font-thai text-sm leading-relaxed text-ink-muted">
            {tx(
              "จำลองและทำนายระดับค่าฝุ่น PM2.5 ในพื้นที่กรุงเทพมหานคร โดยใช้ตัวแบบโครงข่ายประสาทเทียมชนิด 3 ชั้น (Dense layer ขนาด 12 นิวรอน 3 ชั้น) ตามการวิจัยที่ได้รับรางวัลเหรียญทองระดับประเทศ เทรนและคำนวณจากปัจจัยอากาศเชิงฟิสิกส์ร่วมกับค่าความเฉื่อยฝุ่นย้อนหลัง",
              "Interact with our 3-layer Feed-Forward Neural Network (MLP) configured with 12 neurons per hidden layer to forecast Bangkok PM2.5 concentration using current meteorological signals and historical PM2.5 inertia inputs."
            )}
          </p>
        </div>
      </section>

      <section className="arnfa-grid py-10">
        <div className="col-content grid gap-8 lg:grid-cols-12">
          {/* Controls Panel */}
          <div className="lg:col-span-7 flex flex-col gap-6 rounded-2xl border border-hairline bg-white/70 p-6 shadow-sm">
            <h2 className="font-thai-serif text-lg font-medium text-ink border-b border-hairline pb-3">
              {tx("ปรับเปลี่ยนปัจจัยอากาศ (Meteorological Signals)", "Meteorological & Inertia Controls")}
            </h2>

            {/* Weather sliders */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Temp */}
              <div className="flex flex-col">
                <label className="font-thai text-xs font-semibold text-ink-muted flex justify-between">
                  <span>{tx("อุณหภูมิ (Temperature)", "Temperature")}</span>
                  <span className="text-ink">{temp.toFixed(1)} °C</span>
                </label>
                <input type="range" min="18.0" max="42.0" step="0.5" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="mt-2 accent-emerald-600" />
              </div>

              {/* RH */}
              <div className="flex flex-col">
                <label className="font-thai text-xs font-semibold text-ink-muted flex justify-between">
                  <span>{tx("ความชื้นสัมพัทธ์ (Relative Humidity)", "Relative Humidity")}</span>
                  <span className="text-ink">{rh} %</span>
                </label>
                <input type="range" min="30" max="100" step="1" value={rh} onChange={(e) => setRh(parseInt(e.target.value, 10))} className="mt-2 accent-emerald-600" />
              </div>

              {/* Wind Speed */}
              <div className="flex flex-col">
                <label className="font-thai text-xs font-semibold text-ink-muted flex justify-between">
                  <span>{tx("ความเร็วลม (Wind Speed)", "Wind Speed")}</span>
                  <span className="text-ink">{windSpeed.toFixed(1)} km/h</span>
                </label>
                <input type="range" min="1.0" max="45.0" step="0.5" value={windSpeed} onChange={(e) => setWindSpeed(parseFloat(e.target.value))} className="mt-2 accent-emerald-600" />
              </div>

              {/* Visibility */}
              <div className="flex flex-col">
                <label className="font-thai text-xs font-semibold text-ink-muted flex justify-between">
                  <span>{tx("ทัศนวิสัย (Visibility)", "Visibility")}</span>
                  <span className="text-ink">{visibility.toFixed(1)} km</span>
                </label>
                <input type="range" min="1.0" max="10.0" step="0.1" value={visibility} onChange={(e) => setVisibility(parseFloat(e.target.value))} className="mt-2 accent-emerald-600" />
              </div>
            </div>

            <h3 className="font-thai-serif text-sm font-semibold text-ink-muted border-t border-hairline pt-4 mt-2">
              {tx("ปริมาณน้ำฝน (Precipitation)", "Precipitation Lags")}
            </h3>
            <div className="grid gap-5 sm:grid-cols-3">
              {/* Rain Current */}
              <div className="flex flex-col">
                <label className="font-thai text-xs text-ink-muted flex justify-between">
                  <span>{tx("ฝนวันนี้", "Rain Today")}</span>
                  <span className="font-semibold text-ink">{rainfall.toFixed(1)} mm</span>
                </label>
                <input type="range" min="0.0" max="100.0" step="0.5" value={rainfall} onChange={(e) => setRainfall(parseFloat(e.target.value))} className="mt-1.5 accent-emerald-600" />
              </div>

              {/* Rain Lag 1 */}
              <div className="flex flex-col">
                <label className="font-thai text-xs text-ink-muted flex justify-between">
                  <span>{tx("ฝนเมื่อวาน", "Rain Lag 1")}</span>
                  <span className="font-semibold text-ink">{rainfallLag1.toFixed(1)} mm</span>
                </label>
                <input type="range" min="0.0" max="100.0" step="0.5" value={rainfallLag1} onChange={(e) => setRainfallLag1(parseFloat(e.target.value))} className="mt-1.5 accent-emerald-600" />
              </div>

              {/* Rain Lag 2 */}
              <div className="flex flex-col">
                <label className="font-thai text-xs text-ink-muted flex justify-between">
                  <span>{tx("ฝน 2 วันก่อน", "Rain Lag 2")}</span>
                  <span className="font-semibold text-ink">{rainfallLag2.toFixed(1)} mm</span>
                </label>
                <input type="range" min="0.0" max="100.0" step="0.5" value={rainfallLag2} onChange={(e) => setRainfallLag2(parseFloat(e.target.value))} className="mt-1.5 accent-emerald-600" />
              </div>
            </div>

            <h3 className="font-thai-serif text-sm font-semibold text-ink-muted border-t border-hairline pt-4 mt-2">
              {tx("ค่าฝุ่นย้อนหลัง (PM2.5 Inertia)", "Particulate Matter Inertia")}
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* PM2.5 Lag 1 */}
              <div className="flex flex-col">
                <label className="font-thai text-xs text-ink-muted flex justify-between">
                  <span>{tx("ฝุ่นละอองเมื่อวาน (Lag 1)", "PM2.5 yesterday")}</span>
                  <span className="font-semibold text-ink">{pm25Lag1} µg/m³</span>
                </label>
                <input type="range" min="5" max="150" step="1" value={pm25Lag1} onChange={(e) => setPm25Lag1(parseInt(e.target.value, 10))} className="mt-1.5 accent-emerald-600" />
              </div>

              {/* PM2.5 Lag 2 */}
              <div className="flex flex-col">
                <label className="font-thai text-xs text-ink-muted flex justify-between">
                  <span>{tx("ฝุ่นละออง 2 วันก่อน (Lag 2)", "PM2.5 2 days ago")}</span>
                  <span className="font-semibold text-ink">{pm25Lag2} µg/m³</span>
                </label>
                <input type="range" min="5" max="150" step="1" value={pm25Lag2} onChange={(e) => setPm25Lag2(parseInt(e.target.value, 10))} className="mt-1.5 accent-emerald-600" />
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Predicted Card */}
            <div className="relative overflow-hidden rounded-2xl border border-hairline bg-white p-6 shadow-sm flex flex-col items-center text-center">
              <div className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-0.5 font-display text-[0.6rem] font-bold text-ink-muted uppercase">
                {tx("ผลลัพธ์ทำนาย", "Inference result")}
              </div>

              {loading && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                  <span className="font-thai text-xs text-ink-muted flex items-center gap-1.5">
                    <span className="animate-spin text-sm">🔄</span>
                    {tx("โมเดลกำลังวิเคราะห์...", "Model running inference...")}
                  </span>
                </div>
              )}

              <div className="mt-6 flex flex-col items-center">
                {prediction !== null ? (
                  <>
                    <span className="text-[3.5rem] font-light leading-none tracking-tight text-ink">
                      {prediction.toFixed(1)}
                    </span>
                    <span className="text-xs text-ink-faint mt-1 font-semibold uppercase tracking-widest">µg/m³</span>
                  </>
                ) : (
                  <span className="text-4xl font-light text-ink-faint">--</span>
                )}
              </div>

              {aqi && (
                <div className="w-full mt-6 rounded-xl p-4 transition-colors" style={{ backgroundColor: aqi.bg }}>
                  <div className="flex items-center justify-center gap-2 font-thai text-sm font-semibold" style={{ color: aqi.color }}>
                    <span style={{ fontSize: "16px" }}>{aqi.emoji}</span>
                    <span>{en ? aqi.labelEn : aqi.labelTh}</span>
                  </div>
                  <p className="mt-1.5 font-thai text-xs text-ink-muted leading-relaxed">
                    {en ? aqi.descEn : aqi.descTh}
                  </p>
                </div>
              )}
            </div>

            {/* Model Architecture Info Card */}
            <div className="rounded-2xl border border-hairline bg-white/70 p-5 shadow-sm">
              <h3 className="font-thai-serif text-sm font-semibold text-ink border-b border-hairline pb-2.5 mb-3">
                {tx("รายละเอียดโครงสร้างโมเดล", "Model Metrics & Validation")}
              </h3>
              
              <div className="flex flex-col gap-3 font-thai text-xs text-ink-muted">
                <div className="flex justify-between">
                  <span>{tx("สถาปัตยกรรมโครงข่าย", "Neural Net Layers")}</span>
                  <span className="font-mono text-ink font-semibold">Input(9) ➡️ 12 ➡️ 12 ➡️ 12 ➡️ Output(1)</span>
                </div>
                <div className="flex justify-between">
                  <span>{tx("เกณฑ์ทดสอบ R² Score", "R² Score Validation")}</span>
                  <span className="font-mono text-ink font-semibold">0.736 (Paper targeted ~0.68)</span>
                </div>
                <div className="flex justify-between">
                  <span>{tx("ค่าความคลาดเคลื่อนเฉลี่ย (MAE)", "Mean Absolute Error")}</span>
                  <span className="font-mono text-ink font-semibold">4.25 μg/m³</span>
                </div>
                <div className="flex justify-between">
                  <span>{tx("ค่าความคลาดเคลื่อนกำลังสอง (RMSE)", "Root Mean Squared Error")}</span>
                  <span className="font-mono text-ink font-semibold">5.42 μg/m³</span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-hairline/85 font-thai text-[0.65rem] text-ink-faint leading-normal">
                {tx(
                  "หมายเหตุ: โมเดลนี้สร้างขึ้นตามรายงานทางวิชาการโครงการรางวัลเหรียญทองของนักเรียนโรงเรียนโครงการห้องเรียนพิเศษวิทยาศาสตร์ภูมิภาค (SCiUS) เพื่อส่งเสริมการใช้เครื่องมือประมวลผลเครือข่ายใยประสาทเทียมในการวางแผนสุขภาพชุมชน",
                  "Note: Model configured in accordance with the national award-winning SCiUS student research, encouraging neural network methods for municipal public health planning."
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
