import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber } from "./format";

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
