import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { QUERY_CACHE_MAX_AGE } from './queryPersistence'
import type { ExchangeRates } from './currencies'

interface FetchExchangeRatesOptions {
  // Skip server and HTTP caches for a user-requested refresh.
  fresh?: boolean
}

// One query holds every rate, so editing the currency list never needs the
// network and works offline from the persisted cache.
const EXCHANGE_RATES_QUERY_KEY = ['exchangeRates', 'all']

// Fetch exchange rates from the API route (which uses Frankfurter API).
// Failures reject so React Query keeps the last cached rates.
export async function fetchExchangeRates({
  fresh = false,
}: FetchExchangeRatesOptions = {}): Promise<ExchangeRates> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(
      fresh ? '/api/exchange-rates?refresh=1' : '/api/exchange-rates',
      {
        signal: controller.signal,
        cache: fresh ? 'no-store' : 'default',
        headers: {
          'Accept': 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Exchange rates request failed: ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export function useExchangeRates() {
  return useQuery({
    queryKey: EXCHANGE_RATES_QUERY_KEY,
    queryFn: () => fetchExchangeRates(),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: QUERY_CACHE_MAX_AGE,
    // Reopening the PWA or coming back online refetches stale rates.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  })
}

// Fetches the latest published rates, bypassing every cache layer.
// Cached rates stay on screen until the new ones arrive.
export function useRefreshExchangeRates() {
  const queryClient = useQueryClient()

  return useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: EXCHANGE_RATES_QUERY_KEY,
        queryFn: () => fetchExchangeRates({ fresh: true }),
        staleTime: 0,
      }),
    [queryClient],
  )
}
