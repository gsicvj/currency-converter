import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useExchangeRates } from '../utils/exchangeRates';
import { CURRENCIES } from '../utils/currencies';
import { useSupportedCurrencies } from '../utils/supportedCurrencies';
import {
  calculateCurrencyValues,
  createInitialCurrencyValues,
} from '../utils/conversion';
import {
  createInitialCurrencyState,
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from '../utils/currencyPreferences';
import { createCurrencyPreferencesStorage } from '../utils/currencyPreferencesStorage';
import { getNextKeyboardAmountInput } from '../utils/keyboardInput';
import {
  addActiveCurrencyCode,
  getCurrenciesByCodes,
  reorderActiveCurrencyCode,
  removeActiveCurrencyCode,
  selectCurrencyCode,
  swapSelectedCurrencyCode,
} from '../utils/currencySelection';
import { CurrencyList } from './CurrencyList';
import { CurrencyManager } from './CurrencyManager';
import { CurrencyPicker } from './CurrencyPicker';
import { Keyboard } from './Keyboard';

export function CurrencyConverter() {
  const [currencyState, setCurrencyState] = useState(() =>
    createInitialCurrencyState(),
  );
  const [replaceOnNextAmountInput, setReplaceOnNextAmountInput] =
    useState(false);
  const [areCurrencyPreferencesReady, setAreCurrencyPreferencesReady] =
    useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    createInitialCurrencyValues(CURRENCIES),
  );
  const [isCurrencyManagerOpen, setIsCurrencyManagerOpen] = useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const preferencesStorage = useMemo(
    () => createCurrencyPreferencesStorage(),
    [],
  );
  const activeCurrencyCodes = currencyState.activeCodes;
  const {
    data: supportedCurrencies = CURRENCIES,
    isLoading: areSupportedCurrenciesLoading,
  } = useSupportedCurrencies();
  const {
    data: rates,
    dataUpdatedAt,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useExchangeRates(activeCurrencyCodes);
  const selectedCurrency = currencyState.selectedCode;
  const selectedValue = values[selectedCurrency] || '';
  const activeCurrencies = useMemo(
    () => getCurrenciesByCodes(supportedCurrencies, activeCurrencyCodes),
    [activeCurrencyCodes, supportedCurrencies],
  );
  const updatedAt = useMemo(
    () =>
      new Date(dataUpdatedAt || Date.now()).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [dataUpdatedAt],
  );

  useEffect(() => {
    if (!rates) return;

    setValues((currentValues) =>
      calculateCurrencyValues({
        currencies: activeCurrencies,
        rates,
        selectedCurrency,
        values: currentValues,
      }),
    );
  }, [activeCurrencies, selectedCurrency, selectedValue, rates]);

  useEffect(() => {
    let isMounted = true;

    void loadCurrencyPreferences(preferencesStorage).then((savedPreferences) => {
      if (!isMounted) return;

      if (savedPreferences) {
        setCurrencyState(createInitialCurrencyState(savedPreferences));
      }
      setAreCurrencyPreferencesReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [preferencesStorage]);

  useEffect(() => {
    if (!areCurrencyPreferencesReady) return;

    void saveCurrencyPreferences(
      {
        activeCodes: currencyState.activeCodes,
        selectedCode: currencyState.selectedCode,
      },
      preferencesStorage,
    );
  }, [
    areCurrencyPreferencesReady,
    currencyState.activeCodes,
    currencyState.selectedCode,
    preferencesStorage,
  ]);

  const handleCurrencySelect = useCallback((code: string) => {
    setReplaceOnNextAmountInput(true);
    setCurrencyState((currentState) =>
      selectCurrencyCode(currentState, code),
    );
  }, []);

  const handleValueChange = useCallback((code: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [code]: value,
    }));
    setCurrencyState((currentState) =>
      selectCurrencyCode(currentState, code),
    );
  }, []);

  const handleKeyboardInput = useCallback(
    (input: string) => {
      const currentValue = values[selectedCurrency] || '0';

      if (input === 'swap') {
        setReplaceOnNextAmountInput(true);
        setCurrencyState((currentState) =>
          swapSelectedCurrencyCode(currentState),
        );
        return;
      }

      const nextAmountInput = getNextKeyboardAmountInput({
        currentValue,
        input,
        replaceOnNextAmountInput,
      });
      if (!nextAmountInput) return;

      setReplaceOnNextAmountInput(nextAmountInput.replaceOnNextAmountInput);
      handleValueChange(selectedCurrency, nextAmountInput.value);
    },
    [
      handleValueChange,
      replaceOnNextAmountInput,
      selectedCurrency,
      values,
    ],
  );

  const handleOpenCurrencyManager = useCallback(() => {
    setIsCurrencyManagerOpen(true);
  }, []);

  const handleOpenCurrencyPicker = useCallback(() => {
    setIsCurrencyPickerOpen(true);
  }, []);

  const handleCloseCurrencyManager = useCallback(() => {
    setIsCurrencyManagerOpen(false);
  }, []);

  const handleCloseCurrencyPicker = useCallback(() => {
    setIsCurrencyPickerOpen(false);
  }, []);

  const handleAddCurrency = useCallback(
    (code: string) => {
      setReplaceOnNextAmountInput(true);
      setCurrencyState((currentState) => {
        const activeCodes = addActiveCurrencyCode(
          currentState.activeCodes,
          code,
          supportedCurrencies,
        );

        return {
          ...selectCurrencyCode(
            currentState,
            activeCodes.includes(code) ? code : currentState.selectedCode,
          ),
          activeCodes,
        };
      });
      setIsCurrencyPickerOpen(false);
    },
    [supportedCurrencies],
  );

  const handleRemoveCurrency = useCallback((code: string) => {
    setCurrencyState((currentState) => {
      const nextState = removeActiveCurrencyCode({
        activeCodes: currentState.activeCodes,
        code,
        selectedCode: currentState.selectedCode,
      });

      return {
        ...currentState,
        ...nextState,
        previousSelectedCode: nextState.activeCodes.includes(
          currentState.previousSelectedCode ?? '',
        )
          ? currentState.previousSelectedCode
          : null,
      };
    });
  }, []);

  const handleReorderCurrency = useCallback(
    (sourceCode: string, targetCode: string) => {
      setCurrencyState((currentState) => ({
        ...currentState,
        activeCodes: reorderActiveCurrencyCode({
          activeCodes: currentState.activeCodes,
          sourceCode,
          targetCode,
        }),
      }));
    },
    [],
  );

  const handleRefreshRates = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading exchange rates...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Error loading exchange rates</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.updatedRow}>
          <Text style={styles.updated}>Updated: {updatedAt}</Text>
          <TouchableOpacity
            accessibilityLabel="Refresh exchange rates"
            disabled={isFetching}
            style={[
              styles.refreshButton,
              isFetching && styles.refreshButtonDisabled,
            ]}
            onPress={handleRefreshRates}
            activeOpacity={0.75}
          >
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        </View>
        <CurrencyList
          currencies={activeCurrencies}
          values={values}
          selectedCurrency={selectedCurrency}
          onAddCurrency={handleOpenCurrencyPicker}
          onCurrencySelect={handleCurrencySelect}
          onManageCurrencies={handleOpenCurrencyManager}
        />
      </ScrollView>

      {isCurrencyManagerOpen ? (
        <CurrencyManager
          activeCurrencies={activeCurrencies}
          onClose={handleCloseCurrencyManager}
          onRemoveCurrency={handleRemoveCurrency}
          onReorderCurrency={handleReorderCurrency}
        />
      ) : null}
      {isCurrencyPickerOpen ? (
        <CurrencyPicker
          activeCurrencyCodes={activeCurrencyCodes}
          currencies={supportedCurrencies}
          isLoading={areSupportedCurrenciesLoading}
          onClose={handleCloseCurrencyPicker}
          onSelectCurrency={handleAddCurrency}
        />
      ) : null}
      {!isCurrencyManagerOpen && !isCurrencyPickerOpen ? (
        <Keyboard onInput={handleKeyboardInput} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  updated: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  refreshButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshText: {
    color: '#9ca3af',
    fontSize: 18,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#9ca3af',
  },
  errorTitle: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
