import { describe, expect, it } from "vitest";
import {
  createCurrencyFromApiCurrency,
  getCurrencyFlag,
  normalizeApiCurrencies,
} from "./currencies";

describe("getCurrencyFlag", () => {
  it("uses known currency-specific flags before falling back to code prefixes", () => {
    expect(getCurrencyFlag("EUR")).toBe("🇪🇺");
    expect(getCurrencyFlag("USD")).toBe("🇺🇸");
    expect(getCurrencyFlag("JPY")).toBe("🇯🇵");
  });

  it("uses a neutral marker for non-country currency codes", () => {
    expect(getCurrencyFlag("XAU")).toBe("¤");
  });
});

describe("createCurrencyFromApiCurrency", () => {
  it("maps a Frankfurter currency record into app currency metadata", () => {
    expect(
      createCurrencyFromApiCurrency({
        iso_code: "GBP",
        name: "British Pound",
        symbol: "£",
      }),
    ).toEqual({
      code: "GBP",
      flag: "🇬🇧",
      name: "British Pound",
      symbol: "£",
    });
  });
});

describe("normalizeApiCurrencies", () => {
  it("sorts supported currencies by code and removes malformed records", () => {
    expect(
      normalizeApiCurrencies([
        { iso_code: "usd", name: "United States Dollar", symbol: "$" },
        { iso_code: "", name: "Missing Code", symbol: "?" },
        { iso_code: "EUR", name: "Euro", symbol: "€" },
      ]),
    ).toEqual([
      { code: "EUR", flag: "🇪🇺", name: "Euro", symbol: "€" },
      {
        code: "USD",
        flag: "🇺🇸",
        name: "United States Dollar",
        symbol: "$",
      },
    ]);
  });
});
