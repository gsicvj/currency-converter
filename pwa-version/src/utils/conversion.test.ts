import { describe, expect, it } from "vitest";
import type { Currency, ExchangeRates } from "./currencies";
import {
  calculateCurrencyValues,
  createInitialCurrencyValues,
} from "./conversion";

const currencies: Currency[] = [
  { code: "EUR", name: "Euro", flag: "EUR" },
  { code: "USD", name: "American Dollar", flag: "USD" },
  { code: "JPY", name: "Japanese Yen", flag: "JPY" },
];

const rates: ExchangeRates = {
  EUR: 1,
  USD: 1.2,
  JPY: 160,
};

describe("createInitialCurrencyValues", () => {
  it("sets the base currency and initializes all others as empty", () => {
    expect(createInitialCurrencyValues(currencies)).toEqual({
      EUR: "1",
      USD: "",
      JPY: "",
    });
  });
});

describe("calculateCurrencyValues", () => {
  it("converts from EUR into every other currency", () => {
    expect(
      calculateCurrencyValues({
        currencies,
        rates,
        selectedCurrency: "EUR",
        values: { EUR: "10", USD: "", JPY: "" },
      }),
    ).toEqual({
      EUR: "10",
      USD: "12.00",
      JPY: "1600.00",
    });
  });

  it("converts from a non-EUR currency through the shared EUR rates", () => {
    expect(
      calculateCurrencyValues({
        currencies,
        rates,
        selectedCurrency: "USD",
        values: { EUR: "", USD: "12", JPY: "" },
      }),
    ).toEqual({
      EUR: "10.00",
      USD: "12",
      JPY: "1600.00",
    });
  });

  it("clears other currencies when the selected value is empty, zero, or invalid", () => {
    expect(
      calculateCurrencyValues({
        currencies,
        rates,
        selectedCurrency: "USD",
        values: { EUR: "10.00", USD: "", JPY: "1600.00" },
      }),
    ).toEqual({
      EUR: "",
      USD: "",
      JPY: "",
    });
  });

  it("leaves currencies blank when their exchange rate is unavailable", () => {
    expect(
      calculateCurrencyValues({
        currencies,
        rates: { EUR: 1, USD: 1.2 },
        selectedCurrency: "EUR",
        values: { EUR: "10", USD: "12.00", JPY: "1600.00" },
      }),
    ).toEqual({
      EUR: "10",
      USD: "12.00",
      JPY: "",
    });
  });

  it("does not fabricate conversions when the selected rate is unavailable", () => {
    expect(
      calculateCurrencyValues({
        currencies,
        rates: { EUR: 1, USD: 1.2 },
        selectedCurrency: "JPY",
        values: { EUR: "10.00", USD: "12.00", JPY: "1600" },
      }),
    ).toEqual({
      EUR: "",
      USD: "",
      JPY: "1600",
    });
  });

  it("returns the same object when no values need to change", () => {
    const values = { EUR: "10", USD: "12.00", JPY: "1600.00" };

    expect(
      calculateCurrencyValues({
        currencies,
        rates,
        selectedCurrency: "EUR",
        values,
      }),
    ).toBe(values);
  });
});
