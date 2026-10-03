import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { Currency } from '../utils/currencies';

interface CurrencyListProps {
  currencies: Currency[];
  values: Record<string, string>;
  selectedCurrency: string;
  onAddCurrency: () => void;
  onCurrencySelect: (code: string) => void;
  onManageCurrencies: () => void;
}

export function CurrencyList({
  currencies,
  values,
  selectedCurrency,
  onAddCurrency,
  onCurrencySelect,
  onManageCurrencies,
}: CurrencyListProps) {
  return (
    <View style={styles.list}>
      {currencies.map((currency) => {
        const isSelected = currency.code === selectedCurrency;
        const value = values[currency.code] ?? '';

        return (
          <TouchableOpacity
            key={currency.code}
            style={[styles.row, isSelected ? styles.rowSelected : styles.rowDefault]}
            onPress={() => onCurrencySelect(currency.code)}
            activeOpacity={0.7}
          >
            <View style={styles.left}>
              <Text style={styles.flag}>{currency.flag}</Text>
              <Text style={styles.code}>{currency.code}</Text>
            </View>
            <View style={styles.right}>
              <TextInput
                style={[styles.input, isSelected ? styles.inputSelected : styles.inputDefault]}
                value={value}
                editable={false}
                onPressIn={() => onCurrencySelect(currency.code)}
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddCurrency}
        activeOpacity={0.75}
      >
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.secondaryButtonText}>Add currency</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={onManageCurrencies}
        activeOpacity={0.75}
      >
        <Text style={styles.manageIcon}>⚙</Text>
        <Text style={styles.secondaryButtonText}>Manage currencies</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  rowDefault: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderColor: 'transparent',
  },
  rowSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    borderColor: '#3b82f6',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flag: {
    fontSize: 24,
  },
  code: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  right: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  input: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  inputDefault: {
    color: '#fff',
  },
  inputSelected: {
    color: '#93c5fd',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4b5563',
    borderRadius: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    padding: 16,
  },
  addIcon: {
    color: '#9ca3af',
    fontSize: 22,
    lineHeight: 24,
  },
  manageIcon: {
    color: '#9ca3af',
    fontSize: 18,
    lineHeight: 20,
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },
});
