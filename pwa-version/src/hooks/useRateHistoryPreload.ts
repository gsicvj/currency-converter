import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { preloadRateChart } from "~/components/history/RateHistorySheet";
import {
  RATE_HISTORY_SPANS,
  rateHistoryQueryOptions,
} from "~/utils/rateHistory";

function prefersSavingData() {
  const { connection } = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return Boolean(connection?.saveData);
}

// Safari has no requestIdleCallback, so it waits a moment instead.
function whenIdle(task: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(task, 1000);
  return () => window.clearTimeout(id);
}

// Loads the chart code and every active currency's history while the
// browser is idle, so the rate history opens at once and works offline.
// Fresh cached history is not fetched again.
export function useRateHistoryPreload(
  activeCodes: string[],
  isEnabled: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isEnabled || prefersSavingData()) return undefined;

    const codes = activeCodes.filter((code) => code !== "EUR");
    return whenIdle(() => {
      void preloadRateChart();
      void (async () => {
        // The daily year backs most ranges, so it loads first.
        for (const span of RATE_HISTORY_SPANS) {
          await Promise.all(
            codes.map((code) =>
              queryClient.prefetchQuery(rateHistoryQueryOptions(code, span)),
            ),
          );
        }
      })();
    });
  }, [activeCodes, isEnabled, queryClient]);
}
