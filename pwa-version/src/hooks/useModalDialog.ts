import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => !element.hasAttribute("disabled"));
}

interface ModalDialogOptions {
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function useModalDialog({
  initialFocusRef,
  onClose,
}: ModalDialogOptions) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;

    if (!dialog) return undefined;

    requestAnimationFrame(() => {
      const focusTarget =
        initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog;
      focusTarget.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstFocusableElement ||
          !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        lastFocusableElement.focus({ preventScroll: true });
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      requestAnimationFrame(() => {
        if (!dialog.isConnected && previouslyFocusedElement?.isConnected) {
          previouslyFocusedElement.focus({ preventScroll: true });
        }
      });
    };
  }, [initialFocusRef, onClose]);

  return dialogRef;
}
