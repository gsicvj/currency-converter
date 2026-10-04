import { useCallback, useState } from "react";
import { CURRENCIES } from "~/utils/currencies";
import { useSupportedCurrencies } from "~/utils/supportedCurrencies";
import { useAmountEntry } from "~/hooks/useAmountEntry";
import { useCurrencyState } from "~/hooks/useCurrencyState";
import { useExchangeRateStatus } from "~/hooks/useExchangeRateStatus";
import { AmountActions } from "./converter/AmountActions";
import { ConverterHeader } from "./converter/ConverterHeader";
import { CurrencyList } from "./converter/CurrencyList";
import { Keypad } from "./converter/Keypad";
import { CurrencyEditorSheet } from "./editor/CurrencyEditorSheet";
import { PullToRefresh } from "./PullToRefresh";
import { UndoToast } from "./ui/UndoToast";

// Composes the converter screen. State lives in hooks:
// useCurrencyState (which currencies), useExchangeRateStatus (rates),
// and useAmountEntry (typed amounts and conversion).
export function CurrencyConverter() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const {
    data: supportedCurrencies = CURRENCIES,
    isLoading: areSupportedCurrenciesLoading,
  } = useSupportedCurrencies();
  const currencies = useCurrencyState(supportedCurrencies);
  const rates = useExchangeRateStatus();
  const amounts = useAmountEntry({
    activeCurrencies: currencies.activeCurrencies,
    rates: rates.rates,
    selectedCode: currencies.selectedCode,
    isKeyboardEnabled: !isEditorOpen,
    onSelect: currencies.selectCurrency,
    onSwap: currencies.swapCurrency,
  });

  const openEditor = useCallback(() => setIsEditorOpen(true), []);
  const closeEditor = useCallback(() => setIsEditorOpen(false), []);

  const { lastRemoved } = currencies;
  const undoToast = lastRemoved ? (
    <UndoToast
      key={lastRemoved.id}
      message={`${lastRemoved.code} removed`}
      onDismiss={currencies.dismissRemoved}
      onUndo={currencies.undoRemove}
    />
  ) : null;

  if (rates.error && !rates.rates) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base font-semibold">Couldn't load exchange rates</p>
        <p className="text-sm text-muted">{rates.error.message}</p>
        <button
          type="button"
          onClick={() => rates.refetch()}
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:p-6 lg:p-8">
      <main
        aria-label="Currency converter"
        className="flex min-h-0 flex-1 flex-col md:mx-auto md:w-full md:max-w-md md:rounded-2xl md:bg-surface md:ring-1 md:ring-line"
      >
        <ConverterHeader
          isRefreshing={rates.isRefreshing}
          status={rates.status}
          onEdit={openEditor}
          onRefresh={rates.refresh}
        />
        <PullToRefresh
          label="Currency amounts"
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-20 lg:pb-3 [@media(any-pointer:coarse)]:pb-20"
          onRefresh={rates.refresh}
        >
          {/* Saved order lives in localStorage, so the server cannot render
              it. Rows wait for it instead of flashing the default order. */}
          {currencies.arePreferencesReady ? (
            <CurrencyList
              currencies={currencies.activeCurrencies}
              values={amounts.values}
              selectedCode={currencies.selectedCode}
              onSelect={amounts.selectCurrency}
            />
          ) : null}
        </PullToRefresh>
        <AmountActions onInput={amounts.handleKeypadInput} />
        <Keypad onInput={amounts.handleKeypadInput} />
      </main>
      {isEditorOpen ? (
        <CurrencyEditorSheet
          activeCurrencies={currencies.activeCurrencies}
          allCurrencies={supportedCurrencies}
          isLoading={areSupportedCurrenciesLoading}
          toast={undoToast}
          onAdd={currencies.addCurrency}
          onClose={closeEditor}
          onMove={currencies.moveCurrency}
          onRemove={currencies.removeCurrency}
          onReorder={currencies.reorderCurrency}
        />
      ) : (
        undoToast
      )}
    </div>
  );
}
