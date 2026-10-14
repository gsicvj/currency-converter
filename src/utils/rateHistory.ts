import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { QUERY_CACHE_MAX_AGE } from "./queryPersistence";

export interface RateHistoryPoint {
  date: string;
  rate: number;
}

export interface FrankfurterHistoryRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export const RATE_HISTORY_RANGES = ["1W", "1M", "3M", "1Y", "5Y"] as const;

export type RateHistoryRange = (typeof RATE_HISTORY_RANGES)[number];

export const DEFAULT_RATE_HISTORY_RANGE: RateHistoryRange = "1M";

// History loads per currency in two spans: a daily year that every range
// up to a year is cut from, and weekly points for five years.
export const RATE_HISTORY_SPANS = ["1Y", "5Y"] as const;

export type RateHistorySpan = (typeof RATE_HISTORY_SPANS)[number];

const RANGE_DAYS: Record<RateHistoryRange, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 91,
  "1Y": 365,
  "5Y": 1826,
};

const DAY_MS = 1000 * 60 * 60 * 24;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function getRateHistorySpan(range: RateHistoryRange): RateHistorySpan {
  return range === "5Y" ? "5Y" : "1Y";
}

// First date of the range as YYYY-MM-DD. UTC keeps every server instance
// on the same day, so the cache key changes once a day.
export function getRateHistoryStart(range: RateHistoryRange, now = new Date()) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - RANGE_DAYS[range]);
  return start.toISOString().slice(0, 10);
}

// Frankfurter rates are euro-based, so the euro itself has no history.
export function parseRateHistoryRequest(params: URLSearchParams) {
  const currency = params.get("currency")?.trim().toUpperCase() ?? "";
  const span = RATE_HISTORY_SPANS.find(
    (option) => option === params.get("span"),
  );

  if (!span || !CURRENCY_CODE_PATTERN.test(currency) || currency === "EUR") {
    return null;
  }

  return { currency, span };
}

export function normalizeFrankfurterHistory(
  rates: FrankfurterHistoryRate[],
  quote: string,
): RateHistoryPoint[] {
  return rates
    .filter((rate) => rate.quote === quote)
    .map(({ date, rate }) => ({ date, rate }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function toDayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS;
}

// Keeps the last rate of each week, counted back from `end`. Weeks are
// labeled with their last day, so every currency shares the same dates.
export function sampleWeeklyHistory(
  points: RateHistoryPoint[],
  end: string,
): RateHistoryPoint[] {
  const endDay = toDayNumber(end);
  const ratesByWeek = new Map<number, number>();
  for (const point of points) {
    const week = Math.floor((endDay - toDayNumber(point.date)) / 7);
    if (week >= 0) ratesByWeek.set(week, point.rate);
  }

  return [...ratesByWeek]
    .sort(([left], [right]) => right - left)
    .map(([week, rate]) => ({
      date: new Date((endDay - week * 7) * DAY_MS).toISOString().slice(0, 10),
      rate,
    }));
}

// Pairs two euro-based histories the same way the converter pairs rates.
// `null` stands for the euro. A day missing on one side reuses that
// side's previous rate.
export function crossRateHistory(
  base: RateHistoryPoint[] | null,
  quote: RateHistoryPoint[] | null,
): RateHistoryPoint[] {
  if (!base) return quote ?? [];
  if (!quote) return base.map(({ date, rate }) => ({ date, rate: 1 / rate }));

  const points: RateHistoryPoint[] = [];
  let baseIndex = 0;
  let quoteIndex = 0;
  let baseRate: number | undefined;
  let quoteRate: number | undefined;

  while (baseIndex < base.length || quoteIndex < quote.length) {
    const baseDate = base[baseIndex]?.date;
    const quoteDate = quote[quoteIndex]?.date;
    // The loop runs while either side has points, so one date exists.
    const date =
      quoteDate === undefined ||
      (baseDate !== undefined && baseDate < quoteDate)
        ? baseDate!
        : quoteDate;

    if (baseDate === date) baseRate = base[baseIndex++].rate;
    if (quoteDate === date) quoteRate = quote[quoteIndex++].rate;
    if (baseRate !== undefined && quoteRate !== undefined) {
      points.push({ date, rate: quoteRate / baseRate });
    }
  }

  return points;
}

export function sliceRateHistory(
  points: RateHistoryPoint[],
  range: RateHistoryRange,
  now = new Date(),
) {
  const start = getRateHistoryStart(range, now);
  return points.filter((point) => point.date >= start);
}

export function summarizeRateHistory(points: RateHistoryPoint[]) {
  if (points.length === 0) return null;

  const first = points[0].rate;
  const latest = points[points.length - 1].rate;
  const rates = points.map((point) => point.rate);

  return {
    latest,
    changePercent: ((latest - first) / first) * 100,
    low: Math.min(...rates),
    high: Math.max(...rates),
  };
}

// Failures reject so React Query keeps any history it already has.
export async function fetchRateHistory(
  currency: string,
  span: RateHistorySpan,
): Promise<RateHistoryPoint[]> {
  const params = new URLSearchParams({ currency, span });
  const response = await fetch(`/api/rate-history?${params}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Rate history request failed: ${response.status}`);
  }

  return await response.json();
}

// Shared by the chart and the background preload, so both fill one cache
// entry per currency and span. Entries persist with the rates.
export function rateHistoryQueryOptions(
  currency: string,
  span: RateHistorySpan,
) {
  return queryOptions({
    queryKey: ["rateHistory", currency, span],
    queryFn: () => fetchRateHistory(currency, span),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: QUERY_CACHE_MAX_AGE,
    retry: 1,
  });
}

interface RateHistoryRequest {
  base: string;
  quote: string;
  range: RateHistoryRange;
}

export function useRateHistory({ base, quote, range }: RateHistoryRequest) {
  const span = getRateHistorySpan(range);
  const baseQuery = useQuery({
    ...rateHistoryQueryOptions(base, span),
    enabled: base !== "EUR",
  });
  const quoteQuery = useQuery({
    ...rateHistoryQueryOptions(quote, span),
    enabled: quote !== "EUR",
  });
  // null is the euro; undefined is still loading.
  const baseHistory = base === "EUR" ? null : baseQuery.data;
  const quoteHistory = quote === "EUR" ? null : quoteQuery.data;

  const points = useMemo(
    () =>
      baseHistory === undefined || quoteHistory === undefined
        ? undefined
        : sliceRateHistory(crossRateHistory(baseHistory, quoteHistory), range),
    [baseHistory, quoteHistory, range],
  );

  const { refetch: refetchBase } = baseQuery;
  const { refetch: refetchQuote } = quoteQuery;
  // refetch ignores `enabled`, so skip the euro, which has no history.
  const refetch = useCallback(() => {
    if (base !== "EUR") void refetchBase();
    if (quote !== "EUR") void refetchQuote();
  }, [base, quote, refetchBase, refetchQuote]);

  return {
    points,
    error: baseQuery.error ?? quoteQuery.error,
    refetch,
  };
}
