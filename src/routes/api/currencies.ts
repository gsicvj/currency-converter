import { createFileRoute } from "@tanstack/react-router";
import type { ApiCurrency, Currency } from "~/utils/currencies";
import { normalizeApiCurrencies } from "~/utils/currencies";
import { createServerCache } from "~/utils/serverCache";

const getCachedCurrencies = createServerCache<Currency[]>({
  ttlMs: 1000 * 60 * 60 * 24, // 24 hours
});

async function loadCurrencies(): Promise<Currency[]> {
  const response = await fetch("https://api.frankfurter.dev/v2/currencies", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter currencies request failed: ${response.status}`);
  }

  const data: ApiCurrency[] = await response.json();
  return normalizeApiCurrencies(data);
}

export const Route = createFileRoute("/api/currencies")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const currencies = await getCachedCurrencies(
            "currencies",
            loadCurrencies,
          );

          return Response.json(currencies, {
            headers: {
              "Cache-Control":
                "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        } catch (error) {
          console.error("Error fetching currencies from Frankfurter:", error);
          // Error status keeps clients from caching the bundled fallback list.
          return Response.json(
            { error: "Currencies unavailable" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
