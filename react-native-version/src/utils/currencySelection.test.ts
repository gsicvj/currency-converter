import { describe, expect, it } from "vitest";
import type { Currency } from "./currencies";
import {
  addActiveCurrencyCode,
  getAvailableCurrencies,
  getCurrenciesByCodes,
  reorderActiveCurrencyCode,
  removeActiveCurrencyCode,
  selectCurrencyCode,
  swapSelectedCurrencyCode,
} from "./currencySelection";

const currencies: Currency[] = [
  { code: "EUR", name: "Euro", flag: "EUR" },
  { code: "USD", name: "American Dollar", flag: "USD" },
  { code: "JPY", name: "Japanese Yen", flag: "JPY" },
];

describe("getCurrenciesByCodes", () => {
  it("keeps the active currency order and ignores unknown codes", () => {
    expect(getCurrenciesByCodes(currencies, ["JPY", "XXX", "EUR"])).toEqual([
      currencies[2],
      currencies[0],
    ]);
  });
});

describe("getAvailableCurrencies", () => {
  it("returns currencies that are not active", () => {
    expect(getAvailableCurrencies(currencies, ["EUR", "JPY"])).toEqual([
      currencies[1],
    ]);
  });
});

describe("addActiveCurrencyCode", () => {
  it("appends a known inactive currency", () => {
    expect(addActiveCurrencyCode(["EUR"], "USD", currencies)).toEqual([
      "EUR",
      "USD",
    ]);
  });

  it("does not add duplicate or unknown currencies", () => {
    expect(addActiveCurrencyCode(["EUR"], "EUR", currencies)).toEqual(["EUR"]);
    expect(addActiveCurrencyCode(["EUR"], "XXX", currencies)).toEqual(["EUR"]);
  });
});

describe("removeActiveCurrencyCode", () => {
  it("removes an active currency and moves selection to the first remaining one", () => {
    expect(
      removeActiveCurrencyCode({
        activeCodes: ["EUR", "USD", "JPY"],
        code: "USD",
        selectedCode: "USD",
      }),
    ).toEqual({
      activeCodes: ["EUR", "JPY"],
      selectedCode: "EUR",
    });
  });

  it("keeps the current selection when removing a different currency", () => {
    expect(
      removeActiveCurrencyCode({
        activeCodes: ["EUR", "USD", "JPY"],
        code: "JPY",
        selectedCode: "USD",
      }),
    ).toEqual({
      activeCodes: ["EUR", "USD"],
      selectedCode: "USD",
    });
  });

  it("does not remove the final active currency", () => {
    expect(
      removeActiveCurrencyCode({
        activeCodes: ["EUR"],
        code: "EUR",
        selectedCode: "EUR",
      }),
    ).toEqual({
      activeCodes: ["EUR"],
      selectedCode: "EUR",
    });
  });
});

describe("reorderActiveCurrencyCode", () => {
  it("moves a source currency before a target currency", () => {
    expect(
      reorderActiveCurrencyCode({
        activeCodes: ["EUR", "USD", "JPY"],
        sourceCode: "JPY",
        targetCode: "USD",
      }),
    ).toEqual(["EUR", "JPY", "USD"]);
  });

  it("moves a source currency after a lower target when dragging down", () => {
    expect(
      reorderActiveCurrencyCode({
        activeCodes: ["EUR", "USD", "JPY"],
        sourceCode: "EUR",
        targetCode: "JPY",
      }),
    ).toEqual(["USD", "JPY", "EUR"]);
  });

  it("ignores unknown source, unknown target, and same-currency moves", () => {
    expect(
      reorderActiveCurrencyCode({
        activeCodes: ["EUR", "USD"],
        sourceCode: "EUR",
        targetCode: "EUR",
      }),
    ).toEqual(["EUR", "USD"]);

    expect(
      reorderActiveCurrencyCode({
        activeCodes: ["EUR", "USD"],
        sourceCode: "JPY",
        targetCode: "USD",
      }),
    ).toEqual(["EUR", "USD"]);

    expect(
      reorderActiveCurrencyCode({
        activeCodes: ["EUR", "USD"],
        sourceCode: "EUR",
        targetCode: "JPY",
      }),
    ).toEqual(["EUR", "USD"]);
  });
});

describe("selectCurrencyCode", () => {
  it("stores the previous selection when selecting a different currency", () => {
    expect(
      selectCurrencyCode(
        { selectedCode: "EUR", previousSelectedCode: null },
        "THB",
      ),
    ).toEqual({
      selectedCode: "THB",
      previousSelectedCode: "EUR",
    });
  });

  it("keeps selection state unchanged when selecting the current currency", () => {
    const state = { selectedCode: "EUR", previousSelectedCode: "THB" };

    expect(selectCurrencyCode(state, "EUR")).toBe(state);
  });
});

describe("swapSelectedCurrencyCode", () => {
  it("toggles between selected and previous active currencies", () => {
    expect(
      swapSelectedCurrencyCode({
        activeCodes: ["EUR", "THB"],
        selectedCode: "EUR",
        previousSelectedCode: "THB",
      }),
    ).toEqual({
      activeCodes: ["EUR", "THB"],
      selectedCode: "THB",
      previousSelectedCode: "EUR",
    });
  });

  it("does nothing when there is no valid previous active currency", () => {
    const withoutPrevious = {
      activeCodes: ["EUR", "THB"],
      selectedCode: "EUR",
      previousSelectedCode: null,
    };
    const withRemovedPrevious = {
      activeCodes: ["EUR"],
      selectedCode: "EUR",
      previousSelectedCode: "THB",
    };

    expect(swapSelectedCurrencyCode(withoutPrevious)).toBe(withoutPrevious);
    expect(swapSelectedCurrencyCode(withRemovedPrevious)).toBe(
      withRemovedPrevious,
    );
  });
});
