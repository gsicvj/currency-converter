import { useCallback, useEffect, useRef, useState } from "react";
import type { Currency, ExchangeRates } from "~/utils/currencies";
import { CURRENCIES } from "~/utils/currencies";
import {
  calculateCurrencyValues,
  createInitialCurrencyValues,
} from "~/utils/conversion";
import {
  getNextCaretAmountInput,
  getNextKeyboardAmountInput,
} from "~/utils/keyboardInput";

function getPhysicalKeyboardInput(key: string) {
  if (/^\d$/.test(key)) return key;
  if (key === "." || key === ",") return ".";
  if (key === "Backspace") return "backspace";
  if (key === "Delete" || key.toLowerCase() === "c") return "C";
  if (key.toLowerCase() === "s") return "swap";

  return null;
}

function getCaretKeyboardInput(key: string) {
  if (/^\d$/.test(key)) return key;
  if (key === "." || key === ",") return ".";
  if (key === "Backspace") return "backspace";
  if (key === "Delete") return "delete";
  if (key.toLowerCase() === "c") return "C";

  return null;
}

function getFocusedAmountInput(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement)) return null;
  if (!target.dataset.currencyCode) return null;

  return target;
}

interface AmountEntryOptions {
  activeCurrencies: Currency[];
  rates: ExchangeRates | undefined;
  selectedCode: string;
  // Physical keyboard input is ignored while a dialog is open.
  isKeyboardEnabled: boolean;
  onSelect: (code: string) => void;
  onSwap: () => void;
}

// Amount values for every active currency, driven by the on-screen keypad
// and the physical keyboard. Handlers read the latest values through refs,
// so they stay stable and the keydown listener is registered once.
export function useAmountEntry({
  activeCurrencies,
  rates,
  selectedCode,
  isKeyboardEnabled,
  onSelect,
  onSwap,
}: AmountEntryOptions) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    createInitialCurrencyValues(CURRENCIES),
  );
  const valuesRef = useRef(values);
  const selectedCodeRef = useRef(selectedCode);
  const isKeyboardEnabledRef = useRef(isKeyboardEnabled);
  // The first digit after choosing a currency replaces its amount.
  const replaceOnNextInputRef = useRef(false);
  const selectedValue = values[selectedCode] || "";

  useEffect(() => {
    valuesRef.current = values;
    isKeyboardEnabledRef.current = isKeyboardEnabled;
  });

  useEffect(() => {
    selectedCodeRef.current = selectedCode;
    replaceOnNextInputRef.current = true;
  }, [selectedCode]);

  useEffect(() => {
    if (!rates) return;

    setValues((currentValues) =>
      calculateCurrencyValues({
        currencies: activeCurrencies,
        rates,
        selectedCurrency: selectedCode,
        values: currentValues,
      }),
    );
  }, [activeCurrencies, rates, selectedCode, selectedValue]);

  const setAmount = useCallback(
    (code: string, value: string) => {
      setValues((currentValues) => ({ ...currentValues, [code]: value }));
      onSelect(code);
    },
    [onSelect],
  );

  const selectCurrency = useCallback(
    (code: string) => {
      replaceOnNextInputRef.current = true;
      onSelect(code);
    },
    [onSelect],
  );

  const handleKeypadInput = useCallback(
    (input: string) => {
      if (input === "swap") {
        replaceOnNextInputRef.current = true;
        onSwap();
        return;
      }

      const code = selectedCodeRef.current;
      const nextAmountInput = getNextKeyboardAmountInput({
        currentValue: valuesRef.current[code] || "0",
        input,
        replaceOnNextAmountInput: replaceOnNextInputRef.current,
      });
      if (!nextAmountInput) return;

      replaceOnNextInputRef.current = nextAmountInput.replaceOnNextAmountInput;
      valuesRef.current = {
        ...valuesRef.current,
        [code]: nextAmountInput.value,
      };
      setAmount(code, nextAmountInput.value);
    },
    [onSwap, setAmount],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isKeyboardEnabledRef.current) return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey) return;
      if (event.metaKey) return;

      const input = getPhysicalKeyboardInput(event.key);
      if (!input) return;

      const focusedAmountInput = getFocusedAmountInput(event.target);
      if (!focusedAmountInput) {
        event.preventDefault();
        handleKeypadInput(input);
        return;
      }

      // A focused amount edits at the caret instead of at the end.
      const caretInput = getCaretKeyboardInput(event.key);
      const currencyCode = focusedAmountInput.dataset.currencyCode;
      if (!caretInput || !currencyCode) return;

      const nextAmountInput = getNextCaretAmountInput({
        currentValue: focusedAmountInput.value,
        input: caretInput,
        selectionStart: focusedAmountInput.selectionStart,
        selectionEnd: focusedAmountInput.selectionEnd,
      });
      if (!nextAmountInput) return;

      event.preventDefault();
      replaceOnNextInputRef.current = false;
      setAmount(currencyCode, nextAmountInput.value);
      requestAnimationFrame(() => {
        focusedAmountInput.focus({ preventScroll: true });
        focusedAmountInput.setSelectionRange(
          nextAmountInput.selectionStart,
          nextAmountInput.selectionEnd,
        );
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeypadInput, setAmount]);

  return { values, handleKeypadInput, selectCurrency };
}
