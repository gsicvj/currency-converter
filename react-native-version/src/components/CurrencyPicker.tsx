import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Currency } from '../utils/currencies';

interface CurrencyPickerProps {
  activeCurrencyCodes: string[];
  currencies: Currency[];
  isLoading: boolean;
  onClose: () => void;
  onSelectCurrency: (code: string) => void;
}

export function CurrencyPicker({
  activeCurrencyCodes,
  currencies,
  isLoading,
  onClose,
  onSelectCurrency,
}: CurrencyPickerProps) {
  const [search, setSearch] = useState('');
  const activeCodeSet = useMemo(
    () => new Set(activeCurrencyCodes),
    [activeCurrencyCodes],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const availableCurrencies = useMemo(
    () =>
      currencies.filter((currency) => {
        if (activeCodeSet.has(currency.code)) return false;
        if (!normalizedSearch) return true;

        return (
          currency.code.toLowerCase().includes(normalizedSearch) ||
          currency.name.toLowerCase().includes(normalizedSearch) ||
          currency.symbol?.toLowerCase().includes(normalizedSearch)
        );
      }),
    [activeCodeSet, currencies, normalizedSearch],
  );

  const renderCurrency = useCallback(
    ({ item }: { item: Currency }) => (
      <TouchableOpacity
        style={styles.currencyRow}
        onPress={() => onSelectCurrency(item.code)}
        activeOpacity={0.75}
      >
        <View style={styles.currencyIdentity}>
          <Text style={styles.flag}>{item.flag}</Text>
          <View style={styles.currencyText}>
            <Text style={styles.currencyCode} numberOfLines={1}>
              {item.code}
            </Text>
            <Text style={styles.currencyName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
        <View style={styles.currencyAction}>
          {item.symbol ? (
            <Text style={styles.currencySymbol}>{item.symbol}</Text>
          ) : null}
          <Text style={styles.actionIcon}>+</Text>
        </View>
      </TouchableOpacity>
    ),
    [onSelectCurrency],
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add currency</Text>
          <TouchableOpacity
            accessibilityLabel="Close currency picker"
            style={styles.iconButton}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <Text style={styles.iconButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search currencies"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading currencies...</Text>
          </View>
        ) : availableCurrencies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No currencies available.</Text>
          </View>
        ) : (
          <FlatList
            data={availableCurrencies}
            renderItem={renderCurrency}
            keyExtractor={(currency) => currency.code}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    padding: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: '#d1d5db',
    fontSize: 24,
    lineHeight: 26,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 20,
    color: '#d1d5db',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 16,
    padding: 0,
  },
  listContent: {
    paddingBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    padding: 16,
    marginBottom: 8,
  },
  currencyIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  currencyText: {
    flex: 1,
    minWidth: 0,
  },
  currencyCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currencyName: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
  currencyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  currencySymbol: {
    color: '#d1d5db',
    fontSize: 14,
  },
  actionIcon: {
    color: '#d1d5db',
    fontSize: 22,
    lineHeight: 24,
  },
  emptyState: {
    borderRadius: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    padding: 16,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
