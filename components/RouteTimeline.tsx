import React from "react";
import { useLang } from "@/lib/i18n/useLang";

export type TransitStep = {
  mode: "walk" | "mrt" | "bts" | "bus" | "taxi";
  instruction: string;
  instructionEn: string;
  timeMin: number;
  price?: number;
  lineColor?: string;
  icon?: string;
};

export type TransitRoute = {
  summary: string;
  summaryEn: string;
  steps: TransitStep[];
  mode: "transit" | "taxi" | "walk";
  durationMin: number;
  totalCost?: number;
  weatherWarning?: string;
  weatherWarningEn?: string;
};

export function RouteTimeline({ route }: { route: TransitRoute }) {
  const { en } = useLang();

  return (
    <div className="bg-canvas border border-line rounded-xl p-4 my-4 shadow-sm w-full font-thai text-sm text-ink-muted">
      {/* Route Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 font-medium text-ink">
          {route.mode === "transit" && <span className="text-xl">🚇</span>}
          {route.mode === "taxi" && <span className="text-xl">🚕</span>}
          {route.mode === "walk" && <span className="text-xl">🚶</span>}
          <span className="fs-base">{en ? route.summaryEn : route.summary}</span>
        </div>
        <div className="text-right">
          <div className="font-semibold text-ink">{route.durationMin} {en ? "min" : "นาที"}</div>
          {route.totalCost !== undefined && (
            <div className="text-xs text-ink-muted">฿{route.totalCost}</div>
          )}
        </div>
      </div>

      {/* Weather Warning (e.g., raining -> take taxi) */}
      {route.weatherWarning && (
        <div className="bg-accent-rain/10 text-accent-rain border border-accent-rain/20 px-3 py-2 rounded-lg mb-4 flex items-start gap-2 text-xs">
          <span>🌧️</span>
          <span>{en ? route.weatherWarningEn : route.weatherWarning}</span>
        </div>
      )}

      {/* Citymapper-style Steps Timeline */}
      <div className="relative pl-6 space-y-4">
        {/* Vertical line connecting steps */}
        <div className="absolute top-2 bottom-2 left-2.5 w-1 bg-line rounded-full" />

        {route.steps.map((step, idx) => {
          return (
            <div key={idx} className="relative flex gap-4 items-start">
              {/* Timeline dot & icon */}
              <div 
                className="absolute -left-6 w-8 h-8 rounded-full border-2 border-canvas flex items-center justify-center bg-canvas z-10"
                style={{ 
                  backgroundColor: step.lineColor || (step.mode === "walk" ? "#E5E7EB" : "#3B82F6"), 
                  color: step.mode === "walk" ? "#4B5563" : "#fff"
                }}
              >
                {step.icon ? (
                  <span className="text-xs">{step.icon}</span>
                ) : (
                  <span className="text-xs">
                    {step.mode === "walk" ? "🚶" : step.mode === "taxi" ? "🚕" : step.mode === "bus" ? "🚌" : "🚇"}
                  </span>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-1 pb-2">
                <div className="font-medium text-ink">
                  {en ? step.instructionEn : step.instruction}
                </div>
                <div className="text-xs flex gap-2 mt-1 opacity-80">
                  <span>{step.timeMin} {en ? "min" : "นาที"}</span>
                  {step.price && <span>• ฿{step.price}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
