import React, { useCallback } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Currency } from '../utils/currencies';

interface CurrencyManagerProps {
  activeCurrencies: Currency[];
  onClose: () => void;
  onRemoveCurrency: (code: string) => void;
  onReorderCurrency: (sourceCode: string, targetCode: string) => void;
}

export function CurrencyManager({
  activeCurrencies,
  onClose,
  onRemoveCurrency,
  onReorderCurrency,
}: CurrencyManagerProps) {
  const canRemoveCurrencies = activeCurrencies.length > 1;

  const renderCurrency = useCallback(
    ({ item, index }: { item: Currency; index: number }) => {
      const previousCurrency = activeCurrencies[index - 1];
      const nextCurrency = activeCurrencies[index + 1];

      return (
        <View style={styles.currencyRow}>
          <View style={styles.currencyIdentity}>
            <Text style={styles.dragHandle}>↕</Text>
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

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityLabel={`Move ${item.code} up`}
              disabled={!previousCurrency}
              style={[
                styles.actionButton,
                !previousCurrency && styles.actionButtonDisabled,
              ]}
              onPress={() => {
                if (!previousCurrency) return;
                onReorderCurrency(item.code, previousCurrency.code);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.actionText}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Move ${item.code} down`}
              disabled={!nextCurrency}
              style={[
                styles.actionButton,
                !nextCurrency && styles.actionButtonDisabled,
              ]}
              onPress={() => {
                if (!nextCurrency) return;
                onReorderCurrency(item.code, nextCurrency.code);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.actionText}>↓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Remove ${item.code}`}
              disabled={!canRemoveCurrencies}
              style={[
                styles.actionButton,
                !canRemoveCurrencies && styles.actionButtonDisabled,
              ]}
              onPress={() => onRemoveCurrency(item.code)}
              activeOpacity={0.75}
            >
              <Text style={styles.removeText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      activeCurrencies,
      canRemoveCurrencies,
      onRemoveCurrency,
      onReorderCurrency,
    ],
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Currencies</Text>
          <TouchableOpacity
            accessibilityLabel="Close currency settings"
            style={styles.iconButton}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <Text style={styles.iconButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeCurrencies}
          renderItem={renderCurrency}
          keyExtractor={(currency) => currency.code}
          contentContainerStyle={styles.listContent}
        />
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
  listContent: {
    paddingBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  dragHandle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#111827',
    color: '#9ca3af',
    fontSize: 18,
    lineHeight: 27,
    textAlign: 'center',
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionText: {
    color: '#d1d5db',
    fontSize: 20,
    lineHeight: 22,
  },
  removeText: {
    color: '#fca5a5',
    fontSize: 18,
    lineHeight: 20,
  },
});
