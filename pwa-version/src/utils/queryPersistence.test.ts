import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  createQueryPersister,
  QUERY_CACHE_MAX_AGE,
  shouldPersistQuery,
} from "./queryPersistence";

function createMemoryStorage() {
  const items = new Map<string, string>();

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

function getQuery(queryClient: QueryClient, queryKey: unknown[]) {
  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) throw new Error("Query missing");

  return query;
}

describe("shouldPersistQuery", () => {
  it("persists successful currency and exchange rate queries", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["supportedCurrencies"], []);
    queryClient.setQueryData(["exchangeRates", ["USD"]], { EUR: 1, USD: 1.1 });

    expect(
      shouldPersistQuery(getQuery(queryClient, ["supportedCurrencies"])),
    ).toBe(true);
    expect(
      shouldPersistQuery(getQuery(queryClient, ["exchangeRates", ["USD"]])),
    ).toBe(true);
  });

  it("skips unrelated and unsuccessful queries", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["somethingElse"], 1);
    await queryClient
      .fetchQuery({
        queryKey: ["exchangeRates", ["JPY"]],
        queryFn: () => Promise.reject(new Error("offline")),
        retry: false,
      })
      .catch(() => undefined);

    expect(shouldPersistQuery(getQuery(queryClient, ["somethingElse"]))).toBe(
      false,
    );
    expect(
      shouldPersistQuery(getQuery(queryClient, ["exchangeRates", ["JPY"]])),
    ).toBe(false);
  });
});

describe("createQueryPersister", () => {
  it("restores persisted query data from storage", async () => {
    const storage = createMemoryStorage();
    const persister = createQueryPersister(storage, 0);
    const client = {
      buster: "",
      timestamp: Date.now(),
      clientState: { mutations: [], queries: [] },
    };

    await persister.persistClient(client);
    // The sync persister flushes writes on a timer, even with no throttle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await createQueryPersister(storage).restoreClient()).toEqual(client);
  });

  it("keeps persisted data for a week", () => {
    expect(QUERY_CACHE_MAX_AGE).toBe(1000 * 60 * 60 * 24 * 7);
  });
});
