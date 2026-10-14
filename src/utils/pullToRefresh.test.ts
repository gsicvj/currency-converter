import { describe, expect, it } from "vitest";
import {
  getPullDistance,
  MAX_PULL_DISTANCE,
  PULL_REFRESH_THRESHOLD,
  shouldRefreshAfterPull,
} from "./pullToRefresh";

describe("getPullDistance", () => {
  it("ignores upward drags", () => {
    expect(getPullDistance(200, 150)).toBe(0);
  });

  it("dampens and caps downward drags", () => {
    expect(getPullDistance(100, 200)).toBe(50);
    expect(getPullDistance(0, 1000)).toBe(MAX_PULL_DISTANCE);
  });
});

describe("shouldRefreshAfterPull", () => {
  it("refreshes only past the threshold", () => {
    expect(shouldRefreshAfterPull(PULL_REFRESH_THRESHOLD - 1)).toBe(false);
    expect(shouldRefreshAfterPull(PULL_REFRESH_THRESHOLD)).toBe(true);
  });
});
