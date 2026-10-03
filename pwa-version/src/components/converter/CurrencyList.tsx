import { memo, useEffect, useRef, type Ref } from "react";
import type { Currency } from "~/utils/currencies";

interface CurrencyRowProps {
  currency: Currency;
  isSelected: boolean;
  value: string;
  onSelect: (code: string) => void;
  rowRef?: Ref<HTMLLIElement>;
}

// Memoized so typing only re-renders rows whose amount changed.
const CurrencyRow = memo(function CurrencyRow({
  currency,
  isSelected,
  value,
  onSelect,
  rowRef,
}: CurrencyRowProps) {
  return (
    <li
      ref={rowRef}
      onClick={() => onSelect(currency.code)}
      className={`relative flex h-14 cursor-pointer items-center gap-3 px-4 transition-colors motion-safe:animate-row-in ${
        isSelected
          ? "bg-linear-to-r from-accent/15 to-teal/5"
          : "hover:bg-raised-hover/40"
      }`}
    >
      {isSelected ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-linear-to-b from-accent to-teal motion-safe:animate-grow-y"
        />
      ) : null}
      <span aria-hidden="true" className="text-xl leading-none">
        {currency.flag}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5 font-semibold">
          {currency.code}
        </span>
        <span className="block truncate text-xs text-muted">
          {currency.name}
        </span>
      </span>
      <input
        type="text"
        aria-label={`${currency.code} amount`}
        data-currency-code={currency.code}
        value={value}
        readOnly
        onClick={(event) => event.stopPropagation()}
        onFocus={() => onSelect(currency.code)}
        className={`w-36 min-w-0 border-none bg-transparent text-right text-lg font-medium tabular-nums outline-none placeholder:text-muted/60 ${
          isSelected ? "text-accent" : "text-white"
        }`}
        placeholder="0"
        inputMode="none"
      />
    </li>
  );
});

interface CurrencyListProps {
  currencies: Currency[];
  values: Record<string, string>;
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function CurrencyList({
  currencies,
  values,
  selectedCode,
  onSelect,
}: CurrencyListProps) {
  const selectedRowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [currencies.length, selectedCode]);

  return (
    <ul
      aria-label="Converted amounts"
      className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised"
    >
      {currencies.map((currency) => {
        const isSelected = currency.code === selectedCode;

        return (
          <CurrencyRow
            key={currency.code}
            currency={currency}
            isSelected={isSelected}
            value={values[currency.code] || ""}
            onSelect={onSelect}
            rowRef={isSelected ? selectedRowRef : undefined}
          />
        );
      })}
    </ul>
  );
}
