import { memo, useCallback, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { GripVertical, Minus } from "lucide-react";
import type { Currency } from "~/utils/currencies";
import { useReorderDrag } from "~/hooks/useReorderDrag";
import { getRowShift } from "~/utils/reorderDrag";
import { CurrencyLabel } from "./CurrencyLabel";

const ROW_CLASS = "flex h-14 items-center gap-3 pr-2 pl-1";

interface ActiveCurrencyListProps {
  currencies: Currency[];
  onMove: (code: string, offset: number) => void;
  onRemove: (code: string) => void;
  onReorder: (sourceCode: string, targetCode: string) => void;
}

function focusDragHandle(code: string) {
  // Reordering moves DOM nodes, which can drop focus from the handle.
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(`[data-drag-handle="${code}"]`)
      ?.focus({ preventScroll: false });
  });
}

export const ActiveCurrencyList = memo(function ActiveCurrencyList({
  currencies,
  onMove,
  onRemove,
  onReorder,
}: ActiveCurrencyListProps) {
  const codes = useMemo(
    () => currencies.map((currency) => currency.code),
    [currencies],
  );
  // Rows shown when the sheet opens arrive with the sheet itself; only
  // currencies added afterwards get their own entrance.
  const [initialCodes] = useState(() => new Set(codes));
  const { drag, setRowElement, handlePointerDown } = useReorderDrag({
    codes,
    onReorder,
  });
  const canRemove = currencies.length > 1;

  const handleHandleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, code: string) => {
      const offset =
        event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      if (!offset) return;

      event.preventDefault();
      onMove(code, offset);
      focusDragHandle(code);
    },
    [onMove],
  );

  return (
    <ul
      className={`divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised ${
        drag ? "cursor-grabbing select-none" : ""
      }`}
    >
      {currencies.map((currency, index) => {
        const isDragged = drag?.code === currency.code;
        // Resting rows slide aside to open the gap where the row will land.
        const shift =
          drag && !isDragged
            ? getRowShift(index, drag.fromIndex, drag.overIndex, drag.height)
            : 0;

        return (
          <li
            key={currency.code}
            ref={(element) => setRowElement(currency.code, element)}
            data-dragging={isDragged ? "" : undefined}
            style={
              drag && !isDragged
                ? { transform: `translateY(${shift}px)` }
                : undefined
            }
            className={`${ROW_CLASS} ${
              initialCodes.has(currency.code) ? "" : "motion-safe:animate-row-in"
            } ${
              isDragged
                ? "relative z-10 rounded-lg bg-raised-hover shadow-xl ring-1 shadow-black/50 ring-accent/50"
                : drag
                  ? "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-sheet"
                  : ""
            }`}
          >
            <button
              type="button"
              aria-label={`Drag ${currency.code} to reorder`}
              aria-describedby="reorder-hint"
              data-drag-handle={currency.code}
              onPointerDown={(event) => handlePointerDown(event, currency.code)}
              onKeyDown={(event) => handleHandleKeyDown(event, currency.code)}
              className={`flex size-10 shrink-0 touch-none items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                isDragged
                  ? "cursor-grabbing text-accent"
                  : "cursor-grab text-muted hover:text-white"
              }`}
            >
              <GripVertical size={18} />
            </button>
            <CurrencyLabel currency={currency} />
            <button
              type="button"
              aria-label={`Remove ${currency.code}`}
              disabled={!canRemove}
              onClick={() => onRemove(currency.code)}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              <span className="flex size-5 items-center justify-center rounded-full border-[1.5px] border-current">
                <Minus size={12} strokeWidth={3} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
});
