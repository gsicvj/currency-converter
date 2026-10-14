interface ServerCacheOptions {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
}

interface ServerCacheEntry<T> {
  value: T;
  storedAt: number;
}

interface GetCachedOptions {
  // Reload sooner than the TTL, e.g. for a user-requested refresh.
  maxAgeMs?: number;
}

// In-memory cache for upstream API responses. Shares in-flight requests and
// falls back to the last good value when a refresh fails.
export function createServerCache<T>({
  ttlMs,
  maxEntries = 100,
  now = Date.now,
}: ServerCacheOptions) {
  const entries = new Map<string, ServerCacheEntry<T>>();
  const pendingLoads = new Map<string, Promise<T>>();

  return function getCached(
    key: string,
    load: () => Promise<T>,
    { maxAgeMs = ttlMs }: GetCachedOptions = {},
  ): Promise<T> {
    const entry = entries.get(key);
    const maxAge = Math.min(ttlMs, maxAgeMs);
    if (entry && now() - entry.storedAt < maxAge) {
      return Promise.resolve(entry.value);
    }

    const pendingLoad = pendingLoads.get(key);
    if (pendingLoad) return pendingLoad;

    const nextLoad = load()
      .then(
        (value) => {
          entries.delete(key);
          entries.set(key, { value, storedAt: now() });
          if (entries.size > maxEntries) {
            entries.delete(entries.keys().next().value as string);
          }
          return value;
        },
        (error: unknown) => {
          if (entry) return entry.value;
          throw error;
        },
      )
      .finally(() => {
        pendingLoads.delete(key);
      });

    pendingLoads.set(key, nextLoad);
    return nextLoad;
  };
}
