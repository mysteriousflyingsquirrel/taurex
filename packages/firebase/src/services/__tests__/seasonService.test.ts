import { describe, it, expect } from "vitest";

/**
 * Extracted from seasonService.ts for unit testing without Firebase.
 * Mirrors the logic in copySeasonsToYear.
 */
function shiftDateByYears(dateStr: string, yearDelta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const newYear = y + yearDelta;
  const maxDay = new Date(newYear, m, 0).getDate();
  const newDay = Math.min(d, maxDay);
  return `${newYear}-${String(m).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}

describe("shiftDateByYears", () => {
  it("shifts a date forward by 1 year", () => {
    expect(shiftDateByYears("2026-06-15", 1)).toBe("2027-06-15");
  });

  it("shifts a date backward by 1 year", () => {
    expect(shiftDateByYears("2027-03-01", -1)).toBe("2026-03-01");
  });

  it("handles leap year Feb 29 → non-leap year", () => {
    expect(shiftDateByYears("2024-02-29", 1)).toBe("2025-02-28");
  });

  it("handles non-leap year Feb 28 → leap year", () => {
    expect(shiftDateByYears("2025-02-28", -1)).toBe("2024-02-28");
  });

  it("shifts by multiple years", () => {
    expect(shiftDateByYears("2026-12-31", 3)).toBe("2029-12-31");
  });
});
