import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface KeyboardProps {
  onInput: (input: string) => void;
}

function Key({
  label,
  onPress,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  style?: 'default' | 'red' | 'blue';
  accessibilityLabel?: string;
}) {
  const keyStyle = [
    styles.key,
    style === 'red' && styles.keyRed,
    style === 'blue' && styles.keyBlue,
  ];
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      style={keyStyle}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.keyText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Keyboard({ onInput }: KeyboardProps) {
  const [isKeyboardCollapsed, setIsKeyboardCollapsed] = useState(false);
  const handleInput = useCallback(
    (value: string) => {
      onInput(value);
    },
    [onInput],
  );
  const handleToggleKeyboard = useCallback(() => {
    setIsKeyboardCollapsed((currentValue) => !currentValue);
  }, []);

  if (isKeyboardCollapsed) {
    return (
      <View accessibilityLabel="Currency keypad" style={styles.container}>
        <View style={styles.grid}>
          <Key
            label="⌃"
            accessibilityLabel="Show keyboard"
            onPress={handleToggleKeyboard}
          />
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel="Currency keypad" style={styles.container}>
      <View style={styles.grid}>
        <View style={styles.row}>
          <Key
            label="×"
            accessibilityLabel="Clear amount"
            onPress={() => handleInput('C')}
            style="red"
          />
          <Key label="7" onPress={() => handleInput('7')} />
          <Key label="8" onPress={() => handleInput('8')} />
          <Key label="9" onPress={() => handleInput('9')} />
        </View>

        <View style={styles.row}>
          <Key
            label="⇄"
            accessibilityLabel="Swap selected currency"
            onPress={() => handleInput('swap')}
            style="blue"
          />
          <Key label="4" onPress={() => handleInput('4')} />
          <Key label="5" onPress={() => handleInput('5')} />
          <Key label="6" onPress={() => handleInput('6')} />
        </View>

        <View style={styles.row}>
          <View style={styles.keySpacer} />
          <Key label="1" onPress={() => handleInput('1')} />
          <Key label="2" onPress={() => handleInput('2')} />
          <Key label="3" onPress={() => handleInput('3')} />
        </View>

        <View style={styles.row}>
          <Key
            label="⌄"
            accessibilityLabel="Hide keyboard"
            onPress={handleToggleKeyboard}
          />
          <Key label="0" onPress={() => handleInput('0')} />
          <Key
            label="."
            accessibilityLabel="Decimal separator"
            onPress={() => handleInput('.')}
          />
          <Key
            label="⌫"
            accessibilityLabel="Delete last digit"
            onPress={() => handleInput('backspace')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#111827',
    padding: 16,
    paddingBottom: 32,
  },
  grid: {
    gap: 12,
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyRed: {
    backgroundColor: '#dc2626',
  },
  keyBlue: {
    backgroundColor: '#2563eb',
  },
  keySpacer: {
    flex: 1,
    height: 56,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
});
