import { createFileRoute } from "@tanstack/react-router";
import {
  getRateHistoryStart,
  normalizeFrankfurterHistory,
  parseRateHistoryRequest,
  sampleWeeklyHistory,
  type FrankfurterHistoryRate,
  type RateHistoryPoint,
  type RateHistorySpan,
} from "~/utils/rateHistory";
import { createServerCache } from "~/utils/serverCache";

// One entry per currency and span serves every pair, for every visitor.
const getCachedHistory = createServerCache<RateHistoryPoint[]>({
  ttlMs: 1000 * 60 * 60, // 1 hour
  maxEntries: 500,
});

async function loadHistory(
  currency: string,
  span: RateHistorySpan,
  from: string,
  today: string,
): Promise<RateHistoryPoint[]> {
  const params = new URLSearchParams({ from, quotes: currency });
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates?${params}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Frankfurter history request failed: ${response.status}`);
  }

  const data: FrankfurterHistoryRate[] = await response.json();
  const points = normalizeFrankfurterHistory(data, currency);
  return span === "5Y" ? sampleWeeklyHistory(points, today) : points;
}

export const Route = createFileRoute("/api/rate-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const historyRequest = parseRateHistoryRequest(
          new URL(request.url).searchParams,
        );

        if (!historyRequest) {
          return Response.json(
            { error: "Expected a non-euro currency and a span of 1Y or 5Y" },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }

        const { currency, span } = historyRequest;
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        // The start date is part of the key, so spans roll over each day.
        const from = getRateHistoryStart(span, now);

        try {
          const points = await getCachedHistory(
            `${currency}:${span}:${from}`,
            () => loadHistory(currency, span, from, today),
          );

          return Response.json(points, {
            headers: {
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (error) {
          console.error("Error fetching rate history from Frankfurter:", error);
          return Response.json(
            { error: "Rate history unavailable" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
