"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { useLang } from "@/lib/i18n/useLang";

interface ModeProbabilities {
  walk: number;
  bike: number;
  transit: number;
  drive: number;
}

interface PredictionResponse {
  predictions: {
    mnl: ModeProbabilities;
    rf: ModeProbabilities;
    xgb: ModeProbabilities;
    dnn: ModeProbabilities;
  };
}

export default function TravelModeChoicePage() {
  const { en } = useLang();

  // Traveler and Journey States
  const [age, setAge] = useState<number>(35);
  const [female, setFemale] = useState<number>(0);
  const [license, setLicense] = useState<number>(1);
  const [carOwnership, setCarOwnership] = useState<number>(1);
  const [purpose, setPurpose] = useState<string>("HBW");
  const [fueltype, setFueltype] = useState<string>("Petrol");
  const [distance, setDistance] = useState<number>(2500); // meters
  const [transitCost, setTransitCost] = useState<number>(2.4); // GBP
  const [drivingCost, setDrivingCost] = useState<number>(1.8); // GBP
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [startTime, setStartTime] = useState<number>(8.5); // 8:30 AM

  // API loading / response states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionResponse["predictions"] | null>(null);

  // Debounced API call on parameter changes
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/travel-mode-choice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            age,
            female,
            driving_license: license,
            car_ownership: carOwnership,
            purpose,
            fueltype,
            distance,
            transit_cost: transitCost,
            driving_cost: drivingCost,
            day_of_week: dayOfWeek,
            start_time: startTime,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch predictions");
        }

        const data = (await res.json()) as PredictionResponse;
        if (active) {
          setPredictions(data.predictions);
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
    age,
    female,
    license,
    carOwnership,
    purpose,
    fueltype,
    distance,
    transitCost,
    drivingCost,
    dayOfWeek,
    startTime,
  ]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const getDayName = (day: number) => {
    const days = [
      en ? "Monday" : "วันจันทร์",
      en ? "Tuesday" : "วันอังคาร",
      en ? "Wednesday" : "วันพุธ",
      en ? "Thursday" : "วันพฤหัสบดี",
      en ? "Friday" : "วันศุกร์",
      en ? "Saturday" : "วันเสาร์",
      en ? "Sunday" : "วันอาทิตย์",
    ];
    return days[day - 1];
  };

  const getPurposeLabel = (p: string) => {
    const labels: Record<string, string> = {
      HBW: en ? "Home-Based Work" : "เดินทางไปทำงาน (จากบ้าน)",
      HBE: en ? "Home-Based Education" : "เดินทางไปเรียน (จากบ้าน)",
      HBO: en ? "Home-Based Other" : "เดินทางไปทำธุระ/เที่ยว (จากบ้าน)",
      B: en ? "Business" : "ทำธุรกิจ/เรื่องงาน",
      NHBO: en ? "Non-Home-Based Other" : "เดินทางอื่นๆ (ไม่ได้ออกจากบ้าน)",
    };
    return labels[p] || p;
  };

  // Helper to find argmax mode name
  const getRecommendedMode = (probs: ModeProbabilities) => {
    let recommended: keyof ModeProbabilities = "walk";
    let maxVal = -1;
    for (const key of ["walk", "bike", "transit", "drive"] as const) {
      if (probs[key] > maxVal) {
        maxVal = probs[key];
        recommended = key;
      }
    }
    return recommended;
  };

  return (
    <main className="relative z-10 min-h-screen bg-paper text-ink">
      <Masthead />

      <section className="arnfa-grid section-minor border-b border-hairline">
        <div className="col-content py-6">
          <p className="mb-2 font-display text-xs uppercase tracking-[0.25em] text-ink-faint">
            {en ? "ML Sandbox / Transportation Choice" : "แซนด์บ็อกซ์ ML / การขนส่งสาธารณะ"}
          </p>
          <h1 className="mb-3 font-thai-serif text-3xl font-light text-ink sm:text-4xl">
            {en ? "Travel Mode Choice Model Deployment" : "การเปรียบเทียบโมเดลทางเลือกเดินทาง"}
          </h1>
          <p className="max-w-[72ch] font-thai text-sm leading-relaxed text-ink-muted sm:text-base">
            {en
              ? "An interactive deployment comparing classical Random Utility Models (Multinomial Logit) with modern machine learning classifiers (Random Forest, Gradient Boosting, Deep Neural Network) calibrated on the London Passenger Mode Choice (LPMC) dataset."
              : "โมเดลจำลองการทำนายโหมดการเดินทาง (เดิน, ปั่นจักรยาน, ขนส่งสาธารณะ, รถยนต์ส่วนตัว) เปรียบเทียบระหว่างโมเดลทางเลือกแบบดั้งเดิม (Multinomial Logit) และโมเดลการเรียนรู้ของเครื่องยุคใหม่ (Random Forest, Gradient Boosting, Neural Network)"}
          </p>
          <div className="mt-3 text-xs text-ink-faint">
            {en ? "Scientific reference: " : "อ้างอิงทางวิชาการ: "}
            <a
              href="https://doi.org/10.1016/j.trc.2023.104318"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-ink"
            >
              Martín-Baos et al. (2023). A prediction and behavioural analysis of machine learning methods for modelling travel mode choice. Transportation Research Part C.
            </a>
          </div>
        </div>
      </section>

      <section className="arnfa-grid py-8">
        <div className="col-content grid gap-8 lg:grid-cols-12">
          {/* Left panel: Form parameters */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-hairline bg-surface/50 p-6 backdrop-blur-md shadow-sm">
              <h3 className="mb-4 font-thai text-sm font-semibold uppercase tracking-wider text-ink">
                {en ? "1. Demographic Profile" : "1. โปรไฟล์ผู้เดินทาง"}
              </h3>
              
              <div className="space-y-4">
                {/* Age Slider */}
                <div>
                  <div className="flex justify-between text-xs font-thai text-ink-muted">
                    <span>{en ? "Age" : "อายุ"}</span>
                    <span className="font-semibold text-ink">{age} {en ? "years old" : "ปี"}</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="85"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full mt-1.5 h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-ink"
                  />
                </div>

                {/* Gender toggle */}
                <div>
                  <span className="block text-xs font-thai text-ink-muted mb-1.5">{en ? "Gender" : "เพศ"}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFemale(0)}
                      className={`py-1.5 rounded-lg border font-thai text-xs text-center transition-all ${
                        female === 0
                          ? "bg-ink text-paper border-ink font-semibold"
                          : "border-hairline hover:bg-surface text-ink-muted"
                      }`}
                    >
                      {en ? "Male" : "ชาย"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFemale(1)}
                      className={`py-1.5 rounded-lg border font-thai text-xs text-center transition-all ${
                        female === 1
                          ? "bg-ink text-paper border-ink font-semibold"
                          : "border-hairline hover:bg-surface text-ink-muted"
                      }`}
                    >
                      {en ? "Female" : "หญิง"}
                    </button>
                  </div>
                </div>

                {/* Driving License & Car Ownership */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-thai text-ink-muted mb-1.5">{en ? "Driving License" : "ใบขับขี่"}</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setLicense(1)}
                        className={`py-1 text-xs border rounded-lg transition-all ${
                          license === 1 ? "bg-ink text-paper border-ink font-semibold" : "border-hairline text-ink-muted hover:bg-surface"
                        }`}
                      >
                        {en ? "Yes" : "มี"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicense(0)}
                        className={`py-1 text-xs border rounded-lg transition-all ${
                          license === 0 ? "bg-ink text-paper border-ink font-semibold" : "border-hairline text-ink-muted hover:bg-surface"
                        }`}
                      >
                        {en ? "No" : "ไม่มี"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-thai text-ink-muted mb-1.5">{en ? "Cars Owned" : "ครอบครองรถ"}</span>
                    <select
                      value={carOwnership}
                      onChange={(e) => setCarOwnership(Number(e.target.value))}
                      className="w-full py-1 px-2 text-xs border border-hairline bg-surface rounded-lg text-ink focus:outline-none"
                    >
                      <option value={0}>0 {en ? "cars" : "คัน"}</option>
                      <option value={1}>1 {en ? "car" : "คัน"}</option>
                      <option value={2}>2 {en ? "cars" : "คัน"}</option>
                      <option value={3}>3+ {en ? "cars" : "คัน"}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-hairline bg-surface/50 p-6 backdrop-blur-md shadow-sm">
              <h3 className="mb-4 font-thai text-sm font-semibold uppercase tracking-wider text-ink">
                {en ? "2. Journey Characteristics" : "2. ลักษณะการเดินทาง"}
              </h3>
              
              <div className="space-y-4">
                {/* Distance Slider */}
                <div>
                  <div className="flex justify-between text-xs font-thai text-ink-muted">
                    <span>{en ? "Distance" : "ระยะทาง"}</span>
                    <span className="font-semibold text-ink">
                      {(distance / 1000).toFixed(2)} km ({distance} m)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="15000"
                    step="100"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full mt-1.5 h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-ink"
                  />
                </div>

                {/* Departure Time */}
                <div>
                  <div className="flex justify-between text-xs font-thai text-ink-muted">
                    <span>{en ? "Departure Time" : "เวลาเดินทาง"}</span>
                    <span className="font-semibold text-ink">{formatTime(startTime)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    className="w-full mt-1.5 h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-ink"
                  />
                </div>

                {/* Day of the week */}
                <div>
                  <span className="block text-xs font-thai text-ink-muted mb-1.5">{en ? "Day of Week" : "วันในสัปดาห์"}</span>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full py-1.5 px-2 text-xs border border-hairline bg-surface rounded-lg text-ink focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {getDayName(d)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purpose & Fueltype */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-thai text-ink-muted mb-1.5">{en ? "Purpose" : "วัตถุประสงค์"}</span>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full py-1.5 px-2 text-xs border border-hairline bg-surface rounded-lg text-ink focus:outline-none"
                    >
                      <option value="HBW">HB Work</option>
                      <option value="HBE">HB School</option>
                      <option value="HBO">HB Other</option>
                      <option value="B">Business</option>
                      <option value="NHBO">Non-HB Other</option>
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-thai text-ink-muted mb-1.5">{en ? "Vehicle Fuel" : "ประเภทน้ำมัน"}</span>
                    <select
                      value={fueltype}
                      onChange={(e) => setFueltype(e.target.value)}
                      className="w-full py-1.5 px-2 text-xs border border-hairline bg-surface rounded-lg text-ink focus:outline-none"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Average">Average</option>
                    </select>
                  </div>
                </div>

                {/* Transit vs Driving Cost */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-thai text-ink-muted">
                      <span>{en ? "Transit Fare" : "ค่าโดยสารขนส่ง"}</span>
                      <span className="font-semibold text-ink">£{transitCost.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10.0"
                      step="0.1"
                      value={transitCost}
                      onChange={(e) => setTransitCost(Number(e.target.value))}
                      className="w-full mt-1.5 h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-ink"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-thai text-ink-muted">
                      <span>{en ? "Driving Fuel Cost" : "ค่าน้ำมันขับรถ"}</span>
                      <span className="font-semibold text-ink">£{drivingCost.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="12.0"
                      step="0.1"
                      value={drivingCost}
                      onChange={(e) => setDrivingCost(Number(e.target.value))}
                      className="w-full mt-1.5 h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-ink"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Real-time predictions & Analysis */}
          <div className="lg:col-span-8 space-y-6">
            {error && (
              <div className="rounded-xl bg-indoor-warm/10 border border-indoor-warm/30 p-4 text-xs font-thai text-indoor-warm">
                {en ? `Error fetching prediction: ${error}` : `ข้อผิดพลาดการดึงข้อมูลทำนาย: ${error}`}
              </div>
            )}

            {/* Model Comparison Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "mnl", title: en ? "Multinomial Logit (MNL)" : "Multinomial Logit (โมเดลอ้างอิง)", desc: en ? "Classical Random Utility Maximization" : "สถิติวิเคราะห์ตามหลักเศรษฐศาสตร์พฤติกรรม", acc: "72.6%" },
                { key: "rf", title: en ? "Random Forest" : "Random Forest", desc: en ? "Bagging Ensemble of Decision Trees" : "โมเดลต้นไม้ตัดสินใจแบบสุ่มหาค่าเฉลี่ย", acc: "73.6%" },
                { key: "xgb", title: en ? "Gradient Boosting" : "Gradient Boosting (GB)", desc: en ? "Boosting Tree Sequential Optimization" : "โมเดลบูสต์ต้นไม้ตามลำดับเพื่อความแม่นยำสูง", acc: "74.1%" },
                { key: "dnn", title: en ? "Deep Neural Network" : "Deep Neural Network (DNN)", desc: en ? "Feed-Forward Multi-layer Perceptron" : "โครงข่ายประสาทเทียมเรียนรู้หลายชั้น", acc: "72.6%" },
              ].map((model) => {
                const probs = predictions ? predictions[model.key as keyof PredictionResponse["predictions"]] : null;
                const recMode = probs ? getRecommendedMode(probs) : "walk";
                
                return (
                  <div
                    key={model.key}
                    className={`relative flex flex-col justify-between rounded-2xl border bg-surface p-5 backdrop-blur-md shadow-sm transition-all duration-300 ${
                      loading ? "opacity-60" : ""
                    } ${
                      probs ? "border-hairline hover:shadow-md" : "border-hairline"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-thai text-sm font-semibold text-ink">{model.title}</h4>
                          <p className="font-thai text-[10px] text-ink-faint leading-normal mt-0.5">{model.desc}</p>
                        </div>
                        <span className="rounded-full bg-surface px-2 py-0.5 border border-hairline font-display text-[9px] font-semibold text-ink-muted">
                          {en ? "Acc: " : "ความแม่นยำ: "}{model.acc}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        {[
                          { mode: "walk", label: en ? "Walk" : "เดินเท้า", emoji: "🚶", color: "bg-success" },
                          { mode: "bike", label: en ? "Bike" : "จักรยาน", emoji: "🚲", color: "bg-teal-500" },
                          { mode: "transit", label: en ? "Transit" : "รถไฟฟ้า/รถเมล์", emoji: "🚇", color: "bg-sky-500" },
                          { mode: "drive", label: en ? "Drive" : "รถยนต์ส่วนตัว", emoji: "🚗", color: "bg-amber-500" },
                        ].map((m) => {
                          const p = probs ? probs[m.mode as keyof ModeProbabilities] : 0.25;
                          const percent = Math.round(p * 100);
                          const isRec = recMode === m.mode;
                          
                          return (
                            <div key={m.mode} className="text-xs">
                              <div className="flex items-center justify-between font-thai text-[11px] mb-0.5">
                                <span className={isRec ? "font-semibold text-ink" : "text-ink-muted"}>
                                  {m.emoji} {m.label} {isRec && `(${en ? "Rec" : "แนะนำ"})`}
                                </span>
                                <span className={isRec ? "font-semibold text-ink" : "text-ink-muted"}>
                                  {percent}%
                                </span>
                              </div>
                              <div className="h-2 w-full bg-hairline rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${m.color}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-hairline pt-3 flex items-center justify-between">
                      <span className="font-thai text-[10px] text-ink-faint">
                        {en ? "Predicted Mode:" : "โหมดทำนายหลัก:"}
                      </span>
                      <span className="font-thai text-xs font-semibold text-ink uppercase tracking-wider">
                        {recMode === "walk" ? "🚶 " + (en ? "Walk" : "เดิน") :
                         recMode === "bike" ? "🚲 " + (en ? "Bike" : "ปั่นจักรยาน") :
                         recMode === "transit" ? "🚇 " + (en ? "Transit" : "รถสาธารณะ") :
                         "🚗 " + (en ? "Drive" : "ขับรถ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Behavioural Analysis Insights Section */}
            <div className="rounded-2xl border border-hairline bg-surface p-6">
              <h3 className="mb-4 font-thai text-sm font-semibold uppercase tracking-wider text-ink">
                {en ? "3. Prediction & Behavioural Analysis Insights" : "3. ผลวิเคราะห์เชิงลึกทางพฤติกรรมและการทำนาย"}
              </h3>

              <div className="space-y-4 font-thai text-xs leading-relaxed text-ink-muted">
                <p>
                  {en
                    ? "Based on the findings of Martín-Baos et al. (2023), comparing RUMs (like Multinomial Logit) with machine learning classifiers highlights a critical trade-off in transportation planning:"
                    : "ผลการศึกษาชี้ให้เห็นความแตกต่างที่สำคัญระหว่างสองประเภทโมเดลซึ่งมีความสำคัญต่อการวางแผนนโยบายระบบจราจรเมืองดังนี้:"}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-xl border border-hairline bg-paper/50 p-4">
                    <h5 className="font-semibold text-ink mb-1">
                      {en ? "Machine Learning Models (RF, GB, DNN)" : "โมเดลโครงข่ายและการเรียนรู้ของเครื่อง"}
                    </h5>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>{en ? "High Predictive Accuracy" : "ความแม่นยำระดับตัวบุคคลสูง"}:</strong> {en ? "ML models capture complex interactions and non-linear boundaries better." : "เก็บปฏิสัมพันธ์ของตัวแปรและข้อมูลที่โค้งมนไม่เป็นเส้นตรงได้ดีกว่า"}</li>
                      <li><strong>{en ? "Black-box limitations" : "ข้อจำกัดกล่องดำ"}:</strong> {en ? "Harder to extract direct formulas. Can yield erratic values if costs scale outside training distributions." : "คำนวณมูลค่าความเต็มใจจะจ่ายเพื่อประหยัดเวลาเดินทางยากกว่า"}</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-hairline bg-paper/50 p-4">
                    <h5 className="font-semibold text-ink mb-1">
                      {en ? "Multinomial Logit (MNL) Model" : "โมเดลเศรษฐมิติเดิม (Multinomial Logit)"}
                    </h5>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>{en ? "Behavioural Consistency" : "ความคงเส้นคงวาทางพฤติกรรม"}:</strong> {en ? "Provides smooth, monotonic cost-utility curves that align with economic theory." : "ให้ค่าสัมประสิทธิ์แบบเส้นตรงอธิบายได้ชัดเจน ไม่มีความผันผวนผิดธรรมชาติ"}</li>
                      <li><strong>{en ? "Policy Friendly" : "ตอบโจทย์ผู้วางนโยบาย"}:</strong> {en ? "Enables direct evaluation of Willingness to Pay (WTP), Value of Time (VoT), and price elasticities." : "สามารถคำนวณมูลค่าของเวลาในการเดินทางเพื่อประเมินความคุ้มค่าโครงการจราจรได้โดยตรง"}</li>
                    </ul>
                  </div>
                </div>

                <p className="pt-2">
                  {en
                    ? "Try shifting the sliders (like Distance or Costs) and watch how predictions change. Notice how walk probability drops rapidly beyond 1.5 km across all models, while driving and transit compete depending on your demographic parameters, driving license status, and relative cost parameters."
                    : "ลองขยับแถบเลื่อนค่าน้ำมัน ค่ารถเมล์ หรือระยะทางเดินทาง แล้วสังเกตความเปลี่ยนแปลง จะเห็นว่าในระยะทางที่สั้นกว่า 1.5 กม. โมเดลเกือบทั้งหมดจะเลือกการเดินเท้า ในขณะที่ถ้ามีรถยนต์ครอบครองและมีใบขับขี่ โมเดลจะแนะนำรถยนต์ส่วนตัวเมื่อมีระยะทางไกลขึ้น สอดคล้องกับพฤติกรรมจริงของมนุษย์"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="arnfa-grid section-major border-t border-hairline py-8">
        <div className="col-content flex items-center justify-between">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 font-thai text-sm text-ink-muted hover:text-ink transition-colors"
          >
            ← {en ? "Back to Explore" : "กลับไปหน้าเที่ยว กทม."}
          </Link>
          
          <Link
            href="/signals"
            className="inline-flex h-10 items-center rounded-full bg-ink px-5 font-thai text-xs font-medium text-paper transition-colors hover:bg-ink-muted"
          >
            {en ? "View City Signals →" : "ดูสัญญาณสดเมืองกรุง →"}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
