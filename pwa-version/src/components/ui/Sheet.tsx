import {
  createContext,
  useCallback,
  useContext,
  useState,
  type AnimationEvent,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { useModalDialog } from "~/hooks/useModalDialog";

const SheetCloseContext = createContext<() => void>(() => {});

// Closes the surrounding Sheet with its exit animation.
export function useCloseSheet() {
  return useContext(SheetCloseContext);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface SheetProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  labelledBy: string;
  onClose: () => void;
}

// Modal panel: a bottom sheet on phones and a centered dialog from md up.
// onClose runs after the exit animation, so the parent unmounts it then.
export function Sheet({
  children,
  initialFocusRef,
  labelledBy,
  onClose,
  className = "",
  ...dialogProps
}: SheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) onClose();
    else setIsClosing(true);
  }, [onClose]);
  const dialogRef = useModalDialog({ initialFocusRef, onClose: requestClose });

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    // Rows inside the panel animate too; only the panel's exit counts.
    if (isClosing && event.target === event.currentTarget) onClose();
  };

  return (
    <SheetCloseContext value={requestClose}>
      <div
        className={`fixed inset-0 z-30 flex items-end justify-center md:items-center md:p-6 ${
          isClosing ? "pointer-events-none" : ""
        }`}
      >
        <div
          aria-hidden="true"
          onClick={requestClose}
          className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] ${
            isClosing ? "motion-safe:animate-fade-out" : "motion-safe:animate-fade-in"
          }`}
        />
        <div
          {...dialogProps}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          data-closing={isClosing ? "" : undefined}
          tabIndex={-1}
          onAnimationEnd={handleAnimationEnd}
          className={`relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl outline-none md:h-[min(80dvh,44rem)] md:max-w-md md:rounded-2xl ${
            isClosing
              ? "motion-safe:animate-sheet-out md:motion-safe:animate-dialog-out"
              : "motion-safe:animate-sheet-in md:motion-safe:animate-dialog-in"
          } ${className}`}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line md:hidden"
          />
          {children}
        </div>
      </div>
    </SheetCloseContext>
  );
}
