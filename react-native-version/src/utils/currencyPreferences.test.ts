import { describe, expect, it, vi } from "vitest";
import {
  createInitialCurrencyState,
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from "./currencyPreferences";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(async () => value),
    setItem: vi.fn(async (_: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("loadCurrencyPreferences", () => {
  it("loads a normalized active currency order from storage", async () => {
    const storage = createStorage(
      JSON.stringify({
        activeCodes: ["usd", "EUR", "USD", "bad-code", "JPY"],
        selectedCode: "usd",
      }),
    );

    await expect(loadCurrencyPreferences(storage)).resolves.toEqual({
      activeCodes: ["USD", "EUR", "JPY"],
      selectedCode: "USD",
    });
  });

  it("returns null when storage is unavailable or malformed", async () => {
    await expect(loadCurrencyPreferences(null)).resolves.toBeNull();
    await expect(loadCurrencyPreferences(createStorage("{"))).resolves.toBeNull();
    await expect(
      loadCurrencyPreferences(createStorage(JSON.stringify({ activeCodes: [] }))),
    ).resolves.toBeNull();
  });
});

describe("saveCurrencyPreferences", () => {
  it("saves normalized active currency preferences", async () => {
    const storage = createStorage();

    await saveCurrencyPreferences(
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

  it("ignores storage write failures", async () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(async () => {
        throw new Error("blocked");
      }),
    };

    await expect(
      saveCurrencyPreferences(
        {
          activeCodes: ["USD"],
          selectedCode: "USD",
        },
        storage,
      ),
    ).resolves.toBeUndefined();
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
