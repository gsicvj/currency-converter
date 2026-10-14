import { useCallback, useMemo, useState } from "react";
import {
  useExchangeRates,
  useRefreshExchangeRates,
} from "~/utils/exchangeRates";

function formatUpdatedAt(timestamp: number) {
  const date = new Date(timestamp);
  const isToday = date.toDateString() === new Date().toDateString();

  return date.toLocaleString(
    "en-US",
    isToday
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
  );
}

// Every exchange rate plus the header status text.
export function useExchangeRateStatus() {
  const [isRefreshPending, setIsRefreshPending] = useState(false);
  const { data, dataUpdatedAt, isLoading, isFetching, error, refetch } =
    useExchangeRates();
  const refreshRates = useRefreshExchangeRates();

  const refresh = useCallback(() => {
    setIsRefreshPending(true);
    // Failures keep the cached rates on screen.
    void refreshRates()
      .catch(() => undefined)
      .finally(() => setIsRefreshPending(false));
  }, [refreshRates]);

  const updatedAt = useMemo(
    () => (dataUpdatedAt ? formatUpdatedAt(dataUpdatedAt) : null),
    [dataUpdatedAt],
  );

  return {
    rates: data,
    error,
    refetch,
    refresh,
    // Background refreshes keep the last timestamp and only spin the icon.
    status:
      isLoading || !updatedAt
        ? "Loading exchange rates..."
        : `Updated ${updatedAt}`,
    isRefreshing: isRefreshPending || isFetching,
  };
}
