import { useQuery } from '@tanstack/react-query';
import {
  CURRENCIES,
  Currency,
  normalizeApiCurrencies,
} from './currencies';

const FRANKFURTER_CURRENCIES_URL =
  'https://api.frankfurter.dev/v2/currencies';

export async function fetchSupportedCurrencies(): Promise<Currency[]> {
  try {
    const response = await fetch(FRANKFURTER_CURRENCIES_URL, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return CURRENCIES;
    }

    return normalizeApiCurrencies(await response.json());
  } catch {
    return CURRENCIES;
  }
}

export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ['supportedCurrencies'],
    queryFn: fetchSupportedCurrencies,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
