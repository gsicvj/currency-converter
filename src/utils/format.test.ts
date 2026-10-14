import { describe, expect, it } from "vitest";
import {
  formatChangePercent,
  formatCurrency,
  formatNumber,
  formatRate,
} from "./format";

describe("formatCurrency", () => {
  it("formats monetary values with fixed cents", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });
});

describe("formatNumber", () => {
  it("formats numbers with grouped thousands and at most two decimals", () => {
    expect(formatNumber(1234.567)).toBe("1,234.57");
  });
});

describe("formatRate", () => {
  it("keeps six significant digits so tiny and large rates both read", () => {
    expect(formatRate(1450.123456)).toBe("1,450.12");
    expect(formatRate(0.000694444)).toBe("0.000694444");
  });
});

describe("formatChangePercent", () => {
  it("signs the change and keeps two decimals", () => {
    expect(formatChangePercent(3.5714)).toBe("+3.57%");
    expect(formatChangePercent(-0.5)).toBe("-0.50%");
    expect(formatChangePercent(0)).toBe("0.00%");
  });
});
