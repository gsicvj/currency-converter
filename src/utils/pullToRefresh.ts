export const PULL_REFRESH_THRESHOLD = 64;
export const MAX_PULL_DISTANCE = 96;
const PULL_RESISTANCE = 0.5;

// Converts finger travel into indicator distance with rubber-band resistance.
export function getPullDistance(startY: number, currentY: number): number {
  const distance = (currentY - startY) * PULL_RESISTANCE;

  return Math.min(Math.max(distance, 0), MAX_PULL_DISTANCE);
}

export function shouldRefreshAfterPull(pullDistance: number): boolean {
  return pullDistance >= PULL_REFRESH_THRESHOLD;
}
