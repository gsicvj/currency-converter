import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchExchangeRates } from "./exchangeRates";

describe("fetchExchangeRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests every rate at once so any currency converts offline later", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ EUR: 1, USD: 1.2 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchExchangeRates()).resolves.toEqual({
      EUR: 1,
      USD: 1.2,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/exchange-rates",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("rejects when the API route returns an error so fallbacks are not cached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Error" }),
    );

    await expect(fetchExchangeRates()).rejects.toThrow();
  });

  it("rejects when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(fetchExchangeRates()).rejects.toThrow();
  });

  it("asks the API route for fresh rates and skips the HTTP cache on refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ EUR: 1, USD: 1.2 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchExchangeRates({ fresh: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/exchange-rates?refresh=1",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
