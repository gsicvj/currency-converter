import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyConverter } from "./CurrencyConverter";
import { CurrencyList } from "./converter/CurrencyList";

const listCurrencies = [
  { code: "EUR", name: "Euro", flag: "EUR", symbol: "€" },
  { code: "USD", name: "United States Dollar", flag: "USD", symbol: "$" },
];

function renderCurrencyList() {
  return renderToStaticMarkup(
    createElement(CurrencyList, {
      currencies: listCurrencies,
      values: {},
      selectedCode: "EUR",
      onSelect: () => {},
    }),
  );
}

const exchangeRatesState = vi.hoisted(() => ({
  dataUpdatedAt: Date.UTC(2026, 0, 2, 10, 30),
  isLoading: false,
  isFetching: false,
  error: null as Error | null,
}));

vi.mock("~/utils/exchangeRates", () => ({
  useExchangeRates: () => ({
    data: {
      EUR: 1,
      USD: 1.2,
    },
    dataUpdatedAt: exchangeRatesState.dataUpdatedAt,
    isLoading: exchangeRatesState.isLoading,
    isFetching: exchangeRatesState.isFetching,
    error: exchangeRatesState.error,
    refetch: vi.fn(),
  }),
  useRefreshExchangeRates: () => vi.fn(),
}));

vi.mock("~/utils/supportedCurrencies", () => ({
  useSupportedCurrencies: () => ({
    data: [
      { code: "EUR", name: "Euro", flag: "EUR" },
      { code: "USD", name: "United States Dollar", flag: "USD" },
      { code: "JPY", name: "Japanese Yen", flag: "JPY" },
      { code: "KRW", name: "Korean Won", flag: "KRW" },
      { code: "THB", name: "Thai Baht", flag: "THB" },
      { code: "ISK", name: "Icelandic Króna", flag: "ISK" },
    ],
    isLoading: false,
  }),
}));

describe("CurrencyConverter", () => {
  beforeEach(() => {
    exchangeRatesState.dataUpdatedAt = Date.UTC(2026, 0, 2, 10, 30);
    exchangeRatesState.isLoading = false;
    exchangeRatesState.isFetching = false;
    exchangeRatesState.error = null;
  });

  it("renders the custom keypad and suppresses the native amount keyboard", () => {
    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).toContain("aria-label=\"Currency keypad\"");
    expect(markup).toContain("role=\"group\"");
    expect(markup).toContain("aria-label=\"Swap selected currency\"");
  });

  it("suppresses the native keyboard on amount inputs", () => {
    const markup = renderCurrencyList();

    expect(markup).toContain("aria-label=\"EUR amount\"");
    expect(markup).toContain("inputMode=\"none\"");
    expect(markup).toContain("readOnly=\"\"");
    expect(markup).not.toContain("inputMode=\"decimal\"");
  });

  it("renders a compact header with rates status, refresh, and edit controls", () => {
    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).toContain("Updated ");
    expect(markup).toContain("aria-label=\"Refresh exchange rates\"");
    expect(markup).toContain("aria-label=\"Edit currencies\"");
    expect(markup).not.toContain("Manage currencies");
  });

  it("shows currency names in the converter rows", () => {
    expect(renderCurrencyList()).toContain("United States Dollar");
  });

  it("leaves rows out of server markup until saved preferences load", () => {
    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).not.toContain("aria-label=\"Converted amounts\"");
  });

  it("renders the initial rates loading state in the top status", () => {
    exchangeRatesState.isLoading = true;

    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).toContain("Loading exchange rates...");
    expect(markup).not.toContain("Updated ");
    expect(markup).toContain("aria-label=\"Refresh exchange rates\"");
  });

  it("does not use the current render time for missing rates timestamps", () => {
    exchangeRatesState.dataUpdatedAt = 0;

    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).toContain("Loading exchange rates...");
    expect(markup).not.toContain("Updated ");
  });

  it("keeps the rates timestamp visible during a background refresh", () => {
    exchangeRatesState.isFetching = true;

    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).toContain("Updated ");
    expect(markup).not.toContain("Loading exchange rates...");
    expect(markup).toContain("animate-spin");
  });

  it("keeps showing cached rates when a refresh fails", () => {
    exchangeRatesState.error = new Error("offline");

    const markup = renderToStaticMarkup(createElement(CurrencyConverter));

    expect(markup).toContain("Updated ");
    expect(markup).not.toContain("Error loading exchange rates");
  });
});
