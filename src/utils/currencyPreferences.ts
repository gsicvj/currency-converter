import { DEFAULT_ACTIVE_CURRENCY_CODES } from "./currencies";

export const CURRENCY_PREFERENCES_STORAGE_KEY =
  "currency-app:currency-preferences:v1";

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export interface CurrencyPreferences {
  activeCodes: string[];
  selectedCode?: string;
}

export interface CurrencyState {
  activeCodes: string[];
  selectedCode: string;
  previousSelectedCode: string | null;
}

interface CurrencyPreferencesStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface CurrencyPreferencesRecord {
  activeCodes?: unknown;
  selectedCode?: unknown;
}

function getBrowserStorage(): CurrencyPreferencesStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeCurrencyCode(code: unknown): string | null {
  if (typeof code !== "string") return null;

  const normalizedCode = code.trim().toUpperCase();
  return CURRENCY_CODE_PATTERN.test(normalizedCode) ? normalizedCode : null;
}

function normalizeActiveCodes(activeCodes: unknown): string[] {
  if (!Array.isArray(activeCodes)) return [];

  const seenCodes = new Set<string>();
  return activeCodes.flatMap((code) => {
    const normalizedCode = normalizeCurrencyCode(code);
    if (!normalizedCode || seenCodes.has(normalizedCode)) return [];

    seenCodes.add(normalizedCode);
    return [normalizedCode];
  });
}

function normalizeCurrencyPreferences(
  preferences: unknown,
): CurrencyPreferences | null {
  if (!preferences || typeof preferences !== "object") return null;

  const preferencesRecord = preferences as CurrencyPreferencesRecord;
  const activeCodes = normalizeActiveCodes(preferencesRecord.activeCodes);
  if (activeCodes.length === 0) return null;

  const selectedCode = normalizeCurrencyCode(preferencesRecord.selectedCode);

  return selectedCode ? { activeCodes, selectedCode } : { activeCodes };
}

export function loadCurrencyPreferences(
  storage = getBrowserStorage(),
): CurrencyPreferences | null {
  if (!storage) return null;

  try {
    const storedValue = storage.getItem(CURRENCY_PREFERENCES_STORAGE_KEY);
    if (!storedValue) return null;

    return normalizeCurrencyPreferences(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

export function saveCurrencyPreferences(
  preferences: CurrencyPreferences,
  storage = getBrowserStorage(),
): void {
  if (!storage) return;

  const normalizedPreferences = normalizeCurrencyPreferences(preferences);
  if (!normalizedPreferences) return;

  try {
    storage.setItem(
      CURRENCY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizedPreferences),
    );
  } catch {
    // Storage can be blocked in privacy-focused browsers or private sessions.
  }
}

export function createInitialCurrencyState(
  preferences: CurrencyPreferences | null = null,
): CurrencyState {
  const normalizedPreferences = normalizeCurrencyPreferences(preferences);
  const activeCodes =
    normalizedPreferences?.activeCodes ?? [...DEFAULT_ACTIVE_CURRENCY_CODES];
  const requestedSelectedCode = normalizedPreferences?.selectedCode;
  const selectedCode =
    requestedSelectedCode && activeCodes.includes(requestedSelectedCode)
      ? requestedSelectedCode
      : activeCodes.includes("EUR")
        ? "EUR"
        : activeCodes[0];

  return {
    activeCodes,
    selectedCode,
    previousSelectedCode: null,
  };
}
