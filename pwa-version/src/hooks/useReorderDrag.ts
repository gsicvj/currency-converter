import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import {
  clampDragOffset,
  getDragOverIndex,
  type RowBox,
} from "~/utils/reorderDrag";

const AUTO_SCROLL_EDGE = 56;
const AUTO_SCROLL_MAX_SPEED = 14;
const SETTLE_MS = 180;

export interface ReorderDragState {
  code: string;
  fromIndex: number;
  overIndex: number;
  height: number;
}

interface DragSession {
  code: string;
  fromIndex: number;
  rows: RowBox[];
  startY: number;
  clientY: number;
  scroller: HTMLElement | null;
  startScrollTop: number;
  offset: number;
}

interface ReorderDragOptions {
  codes: string[];
  onReorder: (sourceCode: string, targetCode: string) => void;
}

function getScrollParent(element: HTMLElement) {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Pointer-driven drag to reorder for mouse, touch and pen alike. The
// dragged row follows the pointer through an inline transform (no React
// render per move); React only re-renders when the target slot changes.
export function useReorderDrag({ codes, onReorder }: ReorderDragOptions) {
  const [drag, setDrag] = useState<ReorderDragState | null>(null);
  const rowElementsRef = useRef(new Map<string, HTMLElement>());
  const sessionRef = useRef<DragSession | null>(null);
  const settleRef = useRef<{ code: string; visualTop: number } | null>(null);
  const codesRef = useRef(codes);
  codesRef.current = codes;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const setRowElement = useCallback(
    (code: string, element: HTMLElement | null) => {
      if (element) rowElementsRef.current.set(code, element);
      else rowElementsRef.current.delete(code);
    },
    [],
  );

  const updateOffset = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    const scrollDelta = session.scroller
      ? session.scroller.scrollTop - session.startScrollTop
      : 0;
    session.offset = clampDragOffset(
      session.rows,
      session.fromIndex,
      session.clientY - session.startY + scrollDelta,
    );
    const element = rowElementsRef.current.get(session.code);
    if (element) element.style.transform = `translateY(${session.offset}px)`;

    const overIndex = getDragOverIndex(
      session.rows,
      session.fromIndex,
      session.offset,
    );
    setDrag((current) =>
      current && current.overIndex !== overIndex
        ? { ...current, overIndex }
        : current,
    );
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>, code: string) => {
      if (event.button !== 0 || sessionRef.current) return;

      const fromIndex = codesRef.current.indexOf(code);
      const element = rowElementsRef.current.get(code);
      if (fromIndex === -1 || !element) return;

      // Stops text selection, native touch scrolling and focus stealing.
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointers cannot be captured; window listeners still work.
      }

      const rows = codesRef.current.map((rowCode) => {
        const rect = rowElementsRef.current
          .get(rowCode)
          ?.getBoundingClientRect();
        return { top: rect?.top ?? 0, height: rect?.height ?? 0 };
      });
      const scroller = getScrollParent(element);
      sessionRef.current = {
        code,
        fromIndex,
        rows,
        startY: event.clientY,
        clientY: event.clientY,
        scroller,
        startScrollTop: scroller?.scrollTop ?? 0,
        offset: 0,
      };
      setDrag({
        code,
        fromIndex,
        overIndex: fromIndex,
        height: rows[fromIndex].height,
      });
    },
    [],
  );

  const isDragging = drag !== null;

  useEffect(() => {
    if (!isDragging) return undefined;

    let frame = 0;
    // Scrolls the list while the pointer rests near the scroller's edges.
    const autoScroll = () => {
      const session = sessionRef.current;
      if (session?.scroller) {
        const { top, bottom } = session.scroller.getBoundingClientRect();
        const towardTop = top + AUTO_SCROLL_EDGE - session.clientY;
        const towardBottom = session.clientY - (bottom - AUTO_SCROLL_EDGE);
        const speed =
          towardTop > 0
            ? -Math.min(towardTop / AUTO_SCROLL_EDGE, 1) * AUTO_SCROLL_MAX_SPEED
            : towardBottom > 0
              ? Math.min(towardBottom / AUTO_SCROLL_EDGE, 1) *
                AUTO_SCROLL_MAX_SPEED
              : 0;
        if (speed) {
          session.scroller.scrollTop += speed;
          updateOffset();
        }
      }
      frame = requestAnimationFrame(autoScroll);
    };
    frame = requestAnimationFrame(autoScroll);

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      event.preventDefault();
      session.clientY = event.clientY;
      updateOffset();
    };

    const finish = (shouldCommit: boolean) => {
      const session = sessionRef.current;
      if (!session) return;

      sessionRef.current = null;
      const element = rowElementsRef.current.get(session.code);
      settleRef.current = element
        ? { code: session.code, visualTop: element.getBoundingClientRect().top }
        : null;
      if (element) element.style.transform = "";

      const overIndex = getDragOverIndex(
        session.rows,
        session.fromIndex,
        session.offset,
      );
      if (shouldCommit && overIndex !== session.fromIndex) {
        onReorderRef.current(session.code, codesRef.current[overIndex]);
      }
      setDrag(null);
    };
    const handlePointerUp = () => finish(true);
    const handlePointerCancel = () => finish(false);

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [isDragging, updateOffset]);

  // On drop the row jumps to its new slot in the DOM; ease it there from
  // where the pointer left it instead (FLIP).
  useLayoutEffect(() => {
    const settle = settleRef.current;
    if (isDragging || !settle) return;

    settleRef.current = null;
    const element = rowElementsRef.current.get(settle.code);
    if (!element || prefersReducedMotion()) return;

    const distance = settle.visualTop - element.getBoundingClientRect().top;
    if (Math.abs(distance) < 1) return;

    element.style.transition = "none";
    element.style.transform = `translateY(${distance}px)`;
    element.getBoundingClientRect();
    element.style.transition = `transform ${SETTLE_MS}ms var(--ease-sheet)`;
    element.style.transform = "";
    const clearTransition = () => {
      element.style.transition = "";
    };
    element.addEventListener("transitionend", clearTransition, { once: true });
  }, [isDragging]);

  return { drag, setRowElement, handlePointerDown };
}
