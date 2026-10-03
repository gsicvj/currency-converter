interface KeyboardAmountInputOptions {
  currentValue: string;
  input: string;
  replaceOnNextAmountInput: boolean;
}

interface KeyboardAmountInputResult {
  value: string;
  replaceOnNextAmountInput: boolean;
}

export function getNextKeyboardAmountInput({
  currentValue,
  input,
  replaceOnNextAmountInput,
}: KeyboardAmountInputOptions): KeyboardAmountInputResult | null {
  if (input === 'C') {
    return { value: '0', replaceOnNextAmountInput: false };
  }

  if (input === 'backspace') {
    if (replaceOnNextAmountInput || currentValue.length <= 1) {
      return { value: '0', replaceOnNextAmountInput: false };
    }

    return {
      value: currentValue.slice(0, -1),
      replaceOnNextAmountInput: false,
    };
  }

  if (input === '.') {
    return {
      value: replaceOnNextAmountInput
        ? '0.'
        : currentValue.includes('.')
          ? currentValue
          : `${currentValue}.`,
      replaceOnNextAmountInput: false,
    };
  }

  if (/^\d$/.test(input)) {
    return {
      value:
        replaceOnNextAmountInput || currentValue === '0'
          ? input
          : currentValue + input,
      replaceOnNextAmountInput: false,
    };
  }

  return null;
}
