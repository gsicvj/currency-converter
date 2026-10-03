import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_ACTIVE_CURRENCY_CODES,
  DEFAULT_RATES,
  ExchangeRates,
} from './currencies';

const FRANKFURTER_RATES_URL = 'https://api.frankfurter.dev/v2/rates';

interface FrankfurterResponse {
  rates: Record<string, number>;
}

interface FrankfurterV2Rate {
  quote: string;
  rate: number;
}

function createExchangeRatesUrl(currencyCodes: string[]): string | null {
  const quoteCodes = currencyCodes
    .map((code) => code.toUpperCase())
    .filter((code) => code !== 'EUR')
    .sort();

  if (quoteCodes.length === 0) {
    return null;
  }

  const params = new URLSearchParams({
    quotes: quoteCodes.join(','),
  });

  return `${FRANKFURTER_RATES_URL}?${params.toString()}`;
}

export async function fetchExchangeRates(
  currencyCodes = DEFAULT_ACTIVE_CURRENCY_CODES,
): Promise<ExchangeRates> {
  const url = createExchangeRatesUrl(currencyCodes);
  if (!url) return { EUR: 1 };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return DEFAULT_RATES;

    const data: FrankfurterV2Rate[] | FrankfurterResponse =
      await response.json();
    const rates: ExchangeRates = { EUR: 1 };

    if (Array.isArray(data)) {
      data.forEach((rate) => {
        rates[rate.quote] = rate.rate;
      });
    } else {
      Object.assign(rates, data.rates);
    }

    return rates;
  } catch {
    return DEFAULT_RATES;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useExchangeRates(currencyCodes = DEFAULT_ACTIVE_CURRENCY_CODES) {
  return useQuery({
    queryKey: ['exchangeRates', [...currencyCodes].sort()],
    queryFn: () => fetchExchangeRates(currencyCodes),
    placeholderData: (previousRates) => previousRates,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
