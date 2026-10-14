import { RefreshCw } from "lucide-react";
import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import {
  getPullDistance,
  PULL_REFRESH_THRESHOLD,
  shouldRefreshAfterPull,
} from "~/utils/pullToRefresh";

interface PullToRefreshProps {
  children: ReactNode;
  className?: string;
  label: string;
  onRefresh: () => void;
}

// Scroll container that calls onRefresh when pulled down from the top.
// Pull state lives here so dragging does not re-render the converter.
export function PullToRefresh({
  children,
  className = "",
  label,
  onRefresh,
}: PullToRefreshProps) {
  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const updatePullDistance = useCallback((distance: number) => {
    pullDistanceRef.current = distance;
    setPullDistance(distance);
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    startYRef.current =
      event.currentTarget.scrollTop <= 0 ? event.touches[0].clientY : null;
    setIsPulling(startYRef.current !== null);
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (startYRef.current === null) return;

      updatePullDistance(
        getPullDistance(startYRef.current, event.touches[0].clientY),
      );
    },
    [updatePullDistance],
  );

  const handleTouchEnd = useCallback(() => {
    startYRef.current = null;
    setIsPulling(false);
    if (shouldRefreshAfterPull(pullDistanceRef.current)) onRefresh();
    updatePullDistance(0);
  }, [onRefresh, updatePullDistance]);

  const isReady = shouldRefreshAfterPull(pullDistance);

  return (
    <div
      role="region"
      aria-label={label}
      className={`overscroll-y-contain ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Stays mounted so it can ease back to zero height on release. */}
      <div
        aria-hidden={pullDistance === 0}
        className={`flex items-end justify-center gap-2 overflow-hidden text-xs text-muted ${
          isPulling ? "" : "motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-sheet"
        }`}
        style={{ height: pullDistance }}
      >
        <RefreshCw
          size={16}
          className={isReady ? "text-accent" : undefined}
          style={{
            transform: `rotate(${(pullDistance / PULL_REFRESH_THRESHOLD) * 270}deg)`,
          }}
        />
        <span>{isReady ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
      {children}
    </div>
  );
}
