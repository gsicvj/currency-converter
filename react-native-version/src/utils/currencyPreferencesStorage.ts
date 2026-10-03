import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  CURRENCY_PREFERENCES_STORAGE_KEY,
  CurrencyPreferencesStorage,
} from './currencyPreferences';

const PREFERENCES_DIRECTORY = `${FileSystem.documentDirectory ?? ''}preferences/`;
const PREFERENCES_FILE = `${PREFERENCES_DIRECTORY}currency-preferences.json`;

function getWebStorage(): CurrencyPreferencesStorage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createCurrencyPreferencesStorage(): CurrencyPreferencesStorage | null {
  const webStorage = getWebStorage();
  if (webStorage) return webStorage;
  if (!FileSystem.documentDirectory) return null;

  return {
    async getItem(key: string) {
      if (key !== CURRENCY_PREFERENCES_STORAGE_KEY) return null;

      try {
        const fileInfo = await FileSystem.getInfoAsync(PREFERENCES_FILE);
        if (!fileInfo.exists) return null;

        return await FileSystem.readAsStringAsync(PREFERENCES_FILE);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string) {
      if (key !== CURRENCY_PREFERENCES_STORAGE_KEY) return;

      await FileSystem.makeDirectoryAsync(PREFERENCES_DIRECTORY, {
        intermediates: true,
      });
      await FileSystem.writeAsStringAsync(PREFERENCES_FILE, value);
    },
  };
}
