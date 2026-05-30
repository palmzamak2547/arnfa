/** Shared forecast types — what providers MUST return after normalizing. */

export type WeatherProvider = "open-meteo" | "met-norway" | "visual-crossing";

export type HourlyForecast = {
  hourISO: string;
  tempC: number;
  apparentTempC: number;
  rainProb: number;       // 0-1
  rainIntensity: number;  // 0-1
  heatIndex: number;      // 0-1
  cloudCover: number;     // 0-1
  uvIndex: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  humidity: number;       // 0-1
  weatherCode: number;
  provider: WeatherProvider;
  fetchedAt: string;
};
