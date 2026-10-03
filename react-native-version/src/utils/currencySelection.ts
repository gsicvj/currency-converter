import type { Currency } from './currencies';

export function getCurrenciesByCodes(
  currencies: Currency[],
  activeCodes: string[],
): Currency[] {
  const currenciesByCode = new Map(
    currencies.map((currency) => [currency.code, currency]),
  );

  return activeCodes.flatMap((code) => {
    const currency = currenciesByCode.get(code);
    return currency ? [currency] : [];
  });
}

export function getAvailableCurrencies(
  currencies: Currency[],
  activeCodes: string[],
): Currency[] {
  const activeCodeSet = new Set(activeCodes);

  return currencies.filter((currency) => !activeCodeSet.has(currency.code));
}

export function addActiveCurrencyCode(
  activeCodes: string[],
  code: string,
  currencies: Currency[],
): string[] {
  if (
    activeCodes.includes(code) ||
    !currencies.some((currency) => currency.code === code)
  ) {
    return activeCodes;
  }

  return [...activeCodes, code];
}

interface RemoveActiveCurrencyCodeOptions {
  activeCodes: string[];
  code: string;
  selectedCode: string;
}

interface RemoveActiveCurrencyCodeResult {
  activeCodes: string[];
  selectedCode: string;
}

export function removeActiveCurrencyCode({
  activeCodes,
  code,
  selectedCode,
}: RemoveActiveCurrencyCodeOptions): RemoveActiveCurrencyCodeResult {
  if (activeCodes.length <= 1 || !activeCodes.includes(code)) {
    return { activeCodes, selectedCode };
  }

  const nextActiveCodes = activeCodes.filter(
    (activeCode) => activeCode !== code,
  );

  return {
    activeCodes: nextActiveCodes,
    selectedCode: selectedCode === code ? nextActiveCodes[0] : selectedCode,
  };
}

interface ReorderActiveCurrencyCodeOptions {
  activeCodes: string[];
  sourceCode: string;
  targetCode: string;
}

export function reorderActiveCurrencyCode({
  activeCodes,
  sourceCode,
  targetCode,
}: ReorderActiveCurrencyCodeOptions): string[] {
  if (sourceCode === targetCode) return activeCodes;

  const sourceIndex = activeCodes.indexOf(sourceCode);
  const targetIndex = activeCodes.indexOf(targetCode);

  if (sourceIndex === -1 || targetIndex === -1) return activeCodes;

  const nextActiveCodes = [...activeCodes];
  const [source] = nextActiveCodes.splice(sourceIndex, 1);
  const nextTargetIndex = nextActiveCodes.indexOf(targetCode);

  nextActiveCodes.splice(
    nextTargetIndex + (sourceIndex < targetIndex ? 1 : 0),
    0,
    source,
  );
  return nextActiveCodes;
}

interface SelectedCurrencyState {
  selectedCode: string;
  previousSelectedCode: string | null;
}

export function selectCurrencyCode<TState extends SelectedCurrencyState>(
  state: TState,
  code: string,
): TState {
  if (state.selectedCode === code) return state;

  return {
    ...state,
    selectedCode: code,
    previousSelectedCode: state.selectedCode,
  };
}

interface SwapSelectedCurrencyCodeOptions extends SelectedCurrencyState {
  activeCodes: string[];
}

export function swapSelectedCurrencyCode<
  TState extends SwapSelectedCurrencyCodeOptions,
>(state: TState): TState {
  if (
    !state.previousSelectedCode ||
    state.previousSelectedCode === state.selectedCode ||
    !state.activeCodes.includes(state.previousSelectedCode)
  ) {
    return state;
  }

  return {
    ...state,
    selectedCode: state.previousSelectedCode,
    previousSelectedCode: state.selectedCode,
  };
}
