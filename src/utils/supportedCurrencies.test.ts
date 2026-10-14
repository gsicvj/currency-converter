import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSupportedCurrencies } from "./supportedCurrencies";

describe("fetchSupportedCurrencies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns currencies from the API route", async () => {
    const currencies = [{ code: "EUR", name: "Euro", flag: "🇪🇺" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => currencies }),
    );

    await expect(fetchSupportedCurrencies()).resolves.toEqual(currencies);
  });

  it("rejects when the API route fails so fallbacks are not cached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(fetchSupportedCurrencies()).rejects.toThrow();
  });
});
