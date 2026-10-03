import { describe, expect, it, vi } from "vitest";
import { createServerCache } from "./serverCache";

describe("createServerCache", () => {
  it("reuses a cached value until it expires", async () => {
    let now = 0;
    const getCached = createServerCache<number>({
      ttlMs: 1000,
      now: () => now,
    });
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await expect(getCached("rates", load)).resolves.toBe(1);
    now = 999;
    await expect(getCached("rates", load)).resolves.toBe(1);
    now = 1000;
    await expect(getCached("rates", load)).resolves.toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one upstream request between concurrent callers", async () => {
    const getCached = createServerCache<number>({ ttlMs: 1000 });
    const load = vi.fn().mockResolvedValue(1);

    await expect(
      Promise.all([getCached("rates", load), getCached("rates", load)]),
    ).resolves.toEqual([1, 1]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves the last good value when a refresh fails", async () => {
    let now = 0;
    const getCached = createServerCache<number>({
      ttlMs: 1000,
      now: () => now,
    });

    await getCached("rates", async () => 1);
    now = 5000;

    await expect(
      getCached("rates", async () => {
        throw new Error("upstream down");
      }),
    ).resolves.toBe(1);
  });

  it("rejects when nothing is cached and the load fails", async () => {
    const getCached = createServerCache<number>({ ttlMs: 1000 });

    await expect(
      getCached("rates", async () => {
        throw new Error("upstream down");
      }),
    ).rejects.toThrow("upstream down");
  });

  it("evicts the oldest key beyond the entry limit", async () => {
    const getCached = createServerCache<number>({ ttlMs: 1000, maxEntries: 1 });
    const load = vi.fn().mockResolvedValue(1);

    await getCached("a", load);
    await getCached("b", load);
    await getCached("a", load);

    expect(load).toHaveBeenCalledTimes(3);
  });

  it("reloads early when the caller asks for a shorter max age", async () => {
    let now = 0;
    const getCached = createServerCache<number>({
      ttlMs: 1000,
      now: () => now,
    });
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await getCached("rates", load);
    now = 100;
    await expect(getCached("rates", load, { maxAgeMs: 200 })).resolves.toBe(1);
    now = 200;
    await expect(getCached("rates", load, { maxAgeMs: 200 })).resolves.toBe(2);
  });
});
