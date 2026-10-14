interface KeyboardAmountInputOptions {
  currentValue: string;
  input: string;
  replaceOnNextAmountInput: boolean;
}

interface KeyboardAmountInputResult {
  value: string;
  replaceOnNextAmountInput: boolean;
}

interface CaretAmountInputOptions {
  currentValue: string;
  input: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}

interface CaretAmountInputResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function getSelectionRange({
  currentValue,
  selectionStart,
  selectionEnd,
}: CaretAmountInputOptions) {
  const fallbackSelection = currentValue.length;
  const start = Math.min(
    Math.max(selectionStart ?? fallbackSelection, 0),
    currentValue.length,
  );
  const end = Math.min(Math.max(selectionEnd ?? start, 0), currentValue.length);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function createCaretAmountInputResult(
  value: string,
  selectionPosition: number,
): CaretAmountInputResult {
  const nextValue = value || "0";
  const nextSelectionPosition = value ? selectionPosition : nextValue.length;

  return {
    value: nextValue,
    selectionStart: nextSelectionPosition,
    selectionEnd: nextSelectionPosition,
  };
}

export function getNextKeyboardAmountInput({
  currentValue,
  input,
  replaceOnNextAmountInput,
}: KeyboardAmountInputOptions): KeyboardAmountInputResult | null {
  if (input === "C") {
    return { value: "0", replaceOnNextAmountInput: false };
  }

  if (input === "backspace") {
    if (replaceOnNextAmountInput || currentValue.length <= 1) {
      return { value: "0", replaceOnNextAmountInput: false };
    }

    return {
      value: currentValue.slice(0, -1),
      replaceOnNextAmountInput: false,
    };
  }

  if (input === ".") {
    return {
      value: replaceOnNextAmountInput
        ? "0."
        : currentValue.includes(".")
          ? currentValue
          : `${currentValue}.`,
      replaceOnNextAmountInput: false,
    };
  }

  if (/^\d$/.test(input)) {
    return {
      value:
        replaceOnNextAmountInput || currentValue === "0"
          ? input
          : currentValue + input,
      replaceOnNextAmountInput: false,
    };
  }

  return null;
}

export function getNextCaretAmountInput({
  currentValue,
  input,
  selectionStart,
  selectionEnd,
}: CaretAmountInputOptions): CaretAmountInputResult | null {
  const { start, end } = getSelectionRange({
    currentValue,
    input,
    selectionStart,
    selectionEnd,
  });
  const replaceSelection = (text: string) =>
    createCaretAmountInputResult(
      `${currentValue.slice(0, start)}${text}${currentValue.slice(end)}`,
      start + text.length,
    );

  if (input === "C") {
    return createCaretAmountInputResult("", 0);
  }

  if (input === "backspace") {
    if (start !== end) return replaceSelection("");
    if (start === 0) return null;

    return createCaretAmountInputResult(
      `${currentValue.slice(0, start - 1)}${currentValue.slice(end)}`,
      start - 1,
    );
  }

  if (input === "delete") {
    if (start !== end) return replaceSelection("");
    if (start === currentValue.length) return null;

    return createCaretAmountInputResult(
      `${currentValue.slice(0, start)}${currentValue.slice(start + 1)}`,
      start,
    );
  }

  if (input === ".") {
    const valueWithoutSelection = `${currentValue.slice(0, start)}${currentValue.slice(end)}`;
    if (valueWithoutSelection.includes(".")) return null;

    return replaceSelection(".");
  }

  if (/^\d$/.test(input)) {
    return replaceSelection(input);
  }

  return null;
}
