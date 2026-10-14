import { useEffect } from "react";

const UNDO_TIMEOUT_MS = 5000;

interface UndoToastProps {
  message: string;
  onDismiss: () => void;
  onUndo: () => void;
}

// Remount (via key) to restart the timer for a new message.
export function UndoToast({ message, onDismiss, onUndo }: UndoToastProps) {
  useEffect(() => {
    const timeoutId = setTimeout(onDismiss, UNDO_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex motion-safe:animate-rise-in items-center gap-4 rounded-xl border border-line bg-raised py-2 pr-2 pl-4 text-sm shadow-2xl"
      >
        <span>{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="rounded-lg px-3 py-1.5 font-semibold text-accent transition-colors hover:bg-raised-hover"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
