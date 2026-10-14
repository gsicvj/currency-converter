import { createFileRoute } from "@tanstack/react-router";
import type { ExchangeRates } from "~/utils/currencies";
import { createServerCache } from "~/utils/serverCache";

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface FrankfurterV2Rate {
  quote: string;
  rate: number;
}

const getCachedRates = createServerCache<ExchangeRates>({
  ttlMs: 1000 * 60 * 60, // 1 hour
});
// Manual refreshes may reuse very recent rates to protect the upstream API.
const REFRESH_MAX_AGE_MS = 1000 * 60;

// Without currency codes Frankfurter returns every rate it publishes.
async function loadRates(
  currencyCodes: string[] | null,
): Promise<ExchangeRates> {
  const quotes = currencyCodes ? `?quotes=${currencyCodes.join(",")}` : "";
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates${quotes}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Frankfurter rates request failed: ${response.status}`);
  }

  const data: FrankfurterV2Rate[] | FrankfurterResponse =
    await response.json();

  const rates: ExchangeRates = {
    EUR: 1,
  };

  if (Array.isArray(data)) {
    data.forEach((rate) => {
      rates[rate.quote] = rate.rate;
    });
  } else {
    Object.assign(rates, data.rates);
  }

  return rates;
}

export const Route = createFileRoute("/api/exchange-rates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const requestedSymbols = requestUrl.searchParams.get("symbols");
        const isRefresh = requestUrl.searchParams.get("refresh") === "1";
        // The app asks for every rate. Older installed versions still send
        // the currencies they show, so keep answering those requests.
        const currencyCodes =
          requestedSymbols === null
            ? null
            : [
                ...new Set(
                  requestedSymbols
                    .split(",")
                    .map((code) => code.trim().toUpperCase())
                    .filter(
                      (code) => /^[A-Z]{3}$/.test(code) && code !== "EUR",
                    ),
                ),
              ].sort();

        if (currencyCodes?.length === 0) {
          return Response.json(
            { EUR: 1 },
            {
              headers: {
                "Cache-Control": "public, max-age=3600",
              },
            },
          );
        }

        try {
          const rates = await getCachedRates(
            currencyCodes?.join(",") ?? "all",
            () => loadRates(currencyCodes),
            isRefresh ? { maxAgeMs: REFRESH_MAX_AGE_MS } : undefined,
          );

          return Response.json(rates, {
            headers: {
              // The client keeps rates in React Query; HTTP caching would only
              // hide fresher server rates from refreshes.
              "Cache-Control": "no-cache",
            },
          });
        } catch (error) {
          console.error(
            "Error fetching exchange rates from Frankfurter:",
            error,
          );
          // Error status keeps clients on their last cached rates instead of
          // caching made-up defaults.
          return Response.json(
            { error: "Exchange rates unavailable" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
