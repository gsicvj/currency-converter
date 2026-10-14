import { afterEach, describe, expect, it, vi } from "vitest";
import {
  crossRateHistory,
  fetchRateHistory,
  getRateHistorySpan,
  getRateHistoryStart,
  normalizeFrankfurterHistory,
  parseRateHistoryRequest,
  sampleWeeklyHistory,
  sliceRateHistory,
  summarizeRateHistory,
} from "./rateHistory";

describe("getRateHistoryStart", () => {
  const now = new Date("2026-10-13T22:30:00Z");

  it("counts range days back from today in UTC", () => {
    expect(getRateHistoryStart("1W", now)).toBe("2026-10-06");
    expect(getRateHistoryStart("1M", now)).toBe("2026-09-13");
    expect(getRateHistoryStart("1Y", now)).toBe("2025-10-13");
  });
});

describe("getRateHistorySpan", () => {
  it("cuts every range up to a year from one daily year", () => {
    expect(getRateHistorySpan("1W")).toBe("1Y");
    expect(getRateHistorySpan("3M")).toBe("1Y");
    expect(getRateHistorySpan("1Y")).toBe("1Y");
    expect(getRateHistorySpan("5Y")).toBe("5Y");
  });
});

describe("parseRateHistoryRequest", () => {
  it("normalizes the currency code", () => {
    expect(
      parseRateHistoryRequest(new URLSearchParams("currency=krw&span=5Y")),
    ).toEqual({ currency: "KRW", span: "5Y" });
  });

  it("rejects unknown spans, bad codes and the euro base", () => {
    for (const query of [
      "currency=KRW&span=1M",
      "currency=KR&span=1Y",
      "currency=EUR&span=1Y",
    ]) {
      expect(parseRateHistoryRequest(new URLSearchParams(query))).toBeNull();
    }
  });
});

describe("normalizeFrankfurterHistory", () => {
  it("keeps the requested quote in date order", () => {
    expect(
      normalizeFrankfurterHistory(
        [
          { date: "2026-09-02", base: "EUR", quote: "USD", rate: 1.16 },
          { date: "2026-09-01", base: "EUR", quote: "USD", rate: 1.15 },
          { date: "2026-09-01", base: "EUR", quote: "JPY", rate: 170 },
        ],
        "USD",
      ),
    ).toEqual([
      { date: "2026-09-01", rate: 1.15 },
      { date: "2026-09-02", rate: 1.16 },
    ]);
  });
});

describe("sampleWeeklyHistory", () => {
  it("keeps the last rate of each week counted back from the end date", () => {
    expect(
      sampleWeeklyHistory(
        [
          { date: "2026-09-28", rate: 1 },
          { date: "2026-09-30", rate: 2 },
          { date: "2026-10-01", rate: 3 },
          { date: "2026-10-12", rate: 4 },
        ],
        "2026-10-13",
      ),
    ).toEqual([
      // Weeks are labeled with their last day, so every currency shares
      // the same dates and pairs line up.
      { date: "2026-09-29", rate: 1 },
      { date: "2026-10-06", rate: 3 },
      { date: "2026-10-13", rate: 4 },
    ]);
  });
});

describe("crossRateHistory", () => {
  const usd = [
    { date: "2026-09-01", rate: 1.2 },
    { date: "2026-09-02", rate: 1.25 },
  ];
  const jpy = [
    { date: "2026-09-02", rate: 175 },
    { date: "2026-09-03", rate: 180 },
  ];

  it("uses euro rates as they are, with null standing for the euro", () => {
    expect(crossRateHistory(null, usd)).toBe(usd);
    expect(crossRateHistory(usd, null)).toEqual([
      { date: "2026-09-01", rate: 1 / 1.2 },
      { date: "2026-09-02", rate: 1 / 1.25 },
    ]);
  });

  it("divides the quote by the base, carrying a missing day forward", () => {
    expect(crossRateHistory(usd, jpy)).toEqual([
      { date: "2026-09-02", rate: 175 / 1.25 },
      { date: "2026-09-03", rate: 180 / 1.25 },
    ]);
  });
});

describe("sliceRateHistory", () => {
  it("keeps the points inside the range", () => {
    expect(
      sliceRateHistory(
        [
          { date: "2026-08-01", rate: 1 },
          { date: "2026-09-20", rate: 2 },
          { date: "2026-10-13", rate: 3 },
        ],
        "1M",
        new Date("2026-10-13T12:00:00Z"),
      ),
    ).toEqual([
      { date: "2026-09-20", rate: 2 },
      { date: "2026-10-13", rate: 3 },
    ]);
  });
});

describe("summarizeRateHistory", () => {
  it("reports the latest rate and the change over the range", () => {
    const summary = summarizeRateHistory([
      { date: "2026-09-01", rate: 0.8 },
      { date: "2026-09-02", rate: 0.9 },
      { date: "2026-09-03", rate: 0.88 },
    ]);

    expect(summary).toMatchObject({ latest: 0.88, low: 0.8, high: 0.9 });
    expect(summary?.changePercent).toBeCloseTo(10);
  });

  it("returns null without points", () => {
    expect(summarizeRateHistory([])).toBeNull();
  });
});

describe("fetchRateHistory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the API route for one currency and span", async () => {
    const points = [{ date: "2026-09-01", rate: 1.15 }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => points,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchRateHistory("USD", "1Y")).resolves.toEqual(points);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rate-history?currency=USD&span=1Y",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("rejects when the API route fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(fetchRateHistory("USD", "1Y")).rejects.toThrow();
  });
});
