import { describe, expect, it, vi } from "vitest";
import {
  createInitialCurrencyState,
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from "./currencyPreferences";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("loadCurrencyPreferences", () => {
  it("loads a normalized active currency order from storage", () => {
    const storage = createStorage(
      JSON.stringify({
        activeCodes: ["usd", "EUR", "USD", "bad-code", "JPY"],
        selectedCode: "usd",
      }),
    );

    expect(loadCurrencyPreferences(storage)).toEqual({
      activeCodes: ["USD", "EUR", "JPY"],
      selectedCode: "USD",
    });
  });

  it("returns null when storage is unavailable or malformed", () => {
    expect(loadCurrencyPreferences(null)).toBeNull();
    expect(loadCurrencyPreferences(createStorage("{"))).toBeNull();
    expect(
      loadCurrencyPreferences(createStorage(JSON.stringify({ activeCodes: [] }))),
    ).toBeNull();
  });
});

describe("saveCurrencyPreferences", () => {
  it("saves normalized active currency preferences", () => {
    const storage = createStorage();

    saveCurrencyPreferences(
      {
        activeCodes: ["usd", "EUR", "USD"],
        selectedCode: "eur",
      },
      storage,
    );

    expect(storage.setItem).toHaveBeenCalledWith(
      "currency-app:currency-preferences:v1",
      JSON.stringify({
        activeCodes: ["USD", "EUR"],
        selectedCode: "EUR",
      }),
    );
  });

  it("ignores storage write failures", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(() =>
      saveCurrencyPreferences(
        {
          activeCodes: ["USD"],
          selectedCode: "USD",
        },
        storage,
      ),
    ).not.toThrow();
  });
});

describe("createInitialCurrencyState", () => {
  it("uses saved order and keeps the selected currency valid", () => {
    expect(
      createInitialCurrencyState({
        activeCodes: ["JPY", "USD"],
        selectedCode: "EUR",
      }),
    ).toEqual({
      activeCodes: ["JPY", "USD"],
      selectedCode: "JPY",
      previousSelectedCode: null,
    });
  });
});
