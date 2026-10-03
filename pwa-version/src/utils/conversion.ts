import type { Currency, ExchangeRates } from "./currencies";

interface CalculateCurrencyValuesOptions {
  currencies: Currency[];
  rates: ExchangeRates;
  selectedCurrency: string;
  values: Record<string, string>;
}

export function createInitialCurrencyValues(
  currencies: Currency[],
  baseCurrency = "EUR",
  baseValue = "1",
): Record<string, string> {
  return currencies.reduce<Record<string, string>>((initialValues, currency) => {
    initialValues[currency.code] =
      currency.code === baseCurrency ? baseValue : "";
    return initialValues;
  }, {});
}

export function calculateCurrencyValues({
  currencies,
  rates,
  selectedCurrency,
  values,
}: CalculateCurrencyValuesOptions): Record<string, string> {
  const nextValues = { ...values };
  let changed = false;

  const setValue = (code: string, value: string) => {
    if ((nextValues[code] ?? "") !== value) {
      nextValues[code] = value;
      changed = true;
    }
  };

  const baseValue = Number.parseFloat(values[selectedCurrency] || "0");
  const baseRate = rates[selectedCurrency];

  if (
    !Number.isFinite(baseValue) ||
    baseValue === 0 ||
    !Number.isFinite(baseRate) ||
    baseRate <= 0
  ) {
    currencies.forEach((currency) => {
      if (currency.code !== selectedCurrency) {
        setValue(currency.code, "");
      }
    });
    return changed ? nextValues : values;
  }

  currencies.forEach((currency) => {
    if (currency.code === selectedCurrency) return;

    const targetRate = rates[currency.code];
    if (!Number.isFinite(targetRate) || targetRate <= 0) {
      setValue(currency.code, "");
      return;
    }

    const convertedValue = baseValue * (targetRate / baseRate);
    setValue(currency.code, convertedValue.toFixed(2));
  });

  return changed ? nextValues : values;
}
