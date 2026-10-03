import { memo } from "react";
import { Check, Plus } from "lucide-react";
import type { Currency } from "~/utils/currencies";
import { CurrencyLabel } from "./CurrencyLabel";

interface CurrencyOptionListProps {
  activeCodeSet: ReadonlySet<string>;
  currencies: Currency[];
  onAdd: (code: string) => void;
}

// Currencies to add. Active ones stay in place, marked "Added", so a row
// never jumps away from under the finger right after it was tapped.
export const CurrencyOptionList = memo(function CurrencyOptionList({
  activeCodeSet,
  currencies,
  onAdd,
}: CurrencyOptionListProps) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised">
      {currencies.map((currency) => (
        <li key={currency.code}>
          {activeCodeSet.has(currency.code) ? (
            <div className="flex h-14 items-center gap-3 px-4 opacity-60">
              <CurrencyLabel currency={currency} />
              <span className="flex items-center gap-1 text-xs font-medium text-muted">
                <Check size={14} />
                Added
              </span>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Add ${currency.code}`}
              onClick={() => onAdd(currency.code)}
              className="flex h-14 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-raised-hover"
            >
              <CurrencyLabel currency={currency} />
              {currency.symbol ? (
                <span className="text-sm text-muted">{currency.symbol}</span>
              ) : null}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Plus size={14} strokeWidth={2.5} />
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
});
