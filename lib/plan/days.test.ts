import { describe, it, expect } from "vitest";
import { availableDays, startIndexForDay } from "./days";

// Build hourly ISO strings (local-naive) from a base date across several days.
const NOW = new Date("2026-06-01T11:00:00"); // a Monday
function hours(days: number) {
  const out: { hourISO: string }[] = [];
  const base = new Date(2026, 5, 1, 0, 0, 0); // Jun 1
  for (let h = 0; h < days * 24; h++) {
    const d = new Date(base.getTime() + h * 3600000);
    const p = (n: number) => String(n).padStart(2, "0");
    out.push({ hourISO: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00` });
  }
  return out;
}

describe("availableDays", () => {
  it("lists today..+6 with labels", () => {
    const days = availableDays(hours(7), NOW);
    expect(days[0]).toMatchObject({ offset: 0, th: "วันนี้", en: "Today" });
    expect(days[1]).toMatchObject({ offset: 1, th: "พรุ่งนี้", en: "Tomorrow" });
    expect(days[2].en).toBe("Wed"); // Jun 3 2026 = Wednesday
    expect(days.length).toBe(7);
  });
  it("caps at 7 days even if more hours given", () => {
    expect(availableDays(hours(10), NOW).length).toBe(7);
  });
});

describe("startIndexForDay", () => {
  it("today → the current-ish hour (11:00 is within 9-16)", () => {
    const h = hours(3);
    const idx = startIndexForDay(h, 0, NOW);
    expect(new Date(h[idx].hourISO).getHours()).toBe(11);
  });
  it("a future day → 10:00 of that day", () => {
    const h = hours(3);
    const idx = startIndexForDay(h, 2, NOW);
    expect(new Date(h[idx].hourISO).getHours()).toBe(10);
    // and it's two days after today
    expect(new Date(h[idx].hourISO).getDate()).toBe(3);
  });
});
