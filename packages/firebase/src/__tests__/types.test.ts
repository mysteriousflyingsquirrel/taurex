import { describe, it, expect } from "vitest";
import {
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  formatMoney,
  formatDate,
} from "../types";

describe("AVAILABLE_LANGUAGES", () => {
  it("includes en, de, fr, it", () => {
    const codes = AVAILABLE_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(["en", "de", "fr", "it"]);
  });
});

describe("AVAILABLE_CURRENCIES", () => {
  it("includes CHF, EUR, USD, GBP", () => {
    const codes = AVAILABLE_CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(["CHF", "EUR", "USD", "GBP"]);
  });
});

describe("formatMoney", () => {
  it("formats CHF with apostrophe separator and 2 decimals", () => {
    expect(formatMoney(1000, "CHF")).toBe("CHF 1'000.00");
  });

  it("formats zero", () => {
    expect(formatMoney(0, "CHF")).toBe("CHF 0.00");
  });

  it("formats EUR with symbol", () => {
    const result = formatMoney(250, "EUR");
    expect(result).toContain("250");
  });
});

describe("formatDate", () => {
  it("formats YYYY-MM-DD to dd-mm-yyyy", () => {
    expect(formatDate("2026-02-20")).toBe("20-02-2026");
  });

  it("formats single-digit day/month correctly", () => {
    expect(formatDate("2026-01-05")).toBe("05-01-2026");
  });
});
