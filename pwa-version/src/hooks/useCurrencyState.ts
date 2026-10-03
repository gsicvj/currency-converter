import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import type { Currency } from "~/utils/currencies";
import {
  createInitialCurrencyState,
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from "~/utils/currencyPreferences";
import { currencyStateReducer } from "~/utils/currencyState";
import { getCurrenciesByCodes } from "~/utils/currencySelection";

function createInitialEditorState() {
  return { ...createInitialCurrencyState(), lastRemoved: null };
}

// Owns the active currency list and selection, persisted to localStorage.
// Every returned action is stable, so memoized children never re-render
// because of a new callback.
export function useCurrencyState(supportedCurrencies: Currency[]) {
  const [state, dispatch] = useReducer(
    currencyStateReducer,
    undefined,
    createInitialEditorState,
  );
  const [arePreferencesReady, setArePreferencesReady] = useState(false);
  const { activeCodes, selectedCode, lastRemoved } = state;

  // Preferences load after hydration so server and client markup match.
  useEffect(() => {
    const savedPreferences = loadCurrencyPreferences();
    if (savedPreferences) {
      dispatch({
        type: "hydrate",
        state: createInitialCurrencyState(savedPreferences),
      });
    }
    setArePreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!arePreferencesReady) return;

    saveCurrencyPreferences({ activeCodes, selectedCode });
  }, [activeCodes, arePreferencesReady, selectedCode]);

  const activeCurrencies = useMemo(
    () => getCurrenciesByCodes(supportedCurrencies, activeCodes),
    [activeCodes, supportedCurrencies],
  );

  const selectCurrency = useCallback((code: string) => {
    dispatch({ type: "select", code });
  }, []);
  const swapCurrency = useCallback(() => dispatch({ type: "swap" }), []);
  const addCurrency = useCallback(
    (code: string) => {
      dispatch({ type: "add", code, currencies: supportedCurrencies });
    },
    [supportedCurrencies],
  );
  const removeCurrency = useCallback((code: string) => {
    dispatch({ type: "remove", code });
  }, []);
  const undoRemove = useCallback(() => dispatch({ type: "undoRemove" }), []);
  const dismissRemoved = useCallback(
    () => dispatch({ type: "dismissRemoved" }),
    [],
  );
  const moveCurrency = useCallback((code: string, offset: number) => {
    dispatch({ type: "move", code, offset });
  }, []);
  const reorderCurrency = useCallback(
    (sourceCode: string, targetCode: string) => {
      dispatch({ type: "reorder", sourceCode, targetCode });
    },
    [],
  );

  return {
    activeCodes,
    activeCurrencies,
    arePreferencesReady,
    selectedCode,
    lastRemoved,
    selectCurrency,
    swapCurrency,
    addCurrency,
    removeCurrency,
    undoRemove,
    dismissRemoved,
    moveCurrency,
    reorderCurrency,
  };
}
