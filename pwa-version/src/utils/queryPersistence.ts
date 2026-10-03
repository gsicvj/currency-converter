import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Query } from "@tanstack/react-query";

export const QUERY_CACHE_STORAGE_KEY = "currency-app:query-cache:v1";
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

const PERSISTED_QUERY_KEYS = new Set(["exchangeRates", "supportedCurrencies"]);

type QueryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getBrowserStorage(): QueryStorage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function shouldPersistQuery(query: Query): boolean {
  return (
    query.state.status === "success" &&
    PERSISTED_QUERY_KEYS.has(String(query.queryKey[0]))
  );
}

// Persists the query cache so a PWA relaunch renders cached currencies and
// rates immediately. Without storage (SSR) this becomes a no-op persister.
export function createQueryPersister(
  storage = getBrowserStorage(),
  throttleTime = 1000,
) {
  return createSyncStoragePersister({
    storage,
    key: QUERY_CACHE_STORAGE_KEY,
    throttleTime,
  });
}
