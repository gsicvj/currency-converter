export interface Currency {
  code: string;
  name: string;
  flag: string;
  symbol?: string;
}

export interface ApiCurrency {
  iso_code: string;
  name: string;
  symbol: string;
}

const SPECIAL_CURRENCY_FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  XAF: "¤",
  XAG: "¤",
  XAU: "¤",
  XCD: "¤",
  XCG: "¤",
  XDR: "¤",
  XOF: "¤",
  XPD: "¤",
  XPF: "¤",
  XPT: "¤",
};

export function getCurrencyFlag(code: string): string {
  const normalizedCode = code.toUpperCase();
  const specialFlag = SPECIAL_CURRENCY_FLAGS[normalizedCode];
  if (specialFlag) return specialFlag;

  const countryCode = normalizedCode.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(countryCode)) return "¤";

  return [...countryCode]
    .map((character) =>
      String.fromCodePoint(character.charCodeAt(0) + 127397),
    )
    .join("");
}

export function createCurrencyFromApiCurrency(
  currency: ApiCurrency,
): Currency {
  const code = currency.iso_code.toUpperCase();

  return {
    code,
    flag: getCurrencyFlag(code),
    name: currency.name,
    symbol: currency.symbol,
  };
}

export function normalizeApiCurrencies(currencies: ApiCurrency[]): Currency[] {
  return currencies
    .filter((currency) => /^[A-Za-z]{3}$/.test(currency.iso_code))
    .map(createCurrencyFromApiCurrency)
    .sort((left, right) => left.code.localeCompare(right.code));
}

export const CURRENCIES: Currency[] = [
  { code: "KRW", name: "Korean Won", flag: "🇰🇷", symbol: "₩" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭", symbol: "฿" },
  { code: "USD", name: "United States Dollar", flag: "🇺🇸", symbol: "$" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€" },
  { code: "ISK", name: "Icelandic Króna", flag: "🇮🇸", symbol: "kr." },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", symbol: "¥" },
];

export const DEFAULT_ACTIVE_CURRENCY_CODES = CURRENCIES.map(
  (currency) => currency.code,
);

export interface ExchangeRates {
  [key: string]: number;
}
