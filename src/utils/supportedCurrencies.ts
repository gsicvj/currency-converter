import { useQuery } from "@tanstack/react-query";
import type { Currency } from "./currencies";
import { QUERY_CACHE_MAX_AGE } from "./queryPersistence";

// Failures reject so the fallback list is never cached as the real list.
export async function fetchSupportedCurrencies(): Promise<Currency[]> {
  const response = await fetch("/api/currencies", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Currencies request failed: ${response.status}`);
  }

  return await response.json();
}

export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ["supportedCurrencies"],
    queryFn: fetchSupportedCurrencies,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: QUERY_CACHE_MAX_AGE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
