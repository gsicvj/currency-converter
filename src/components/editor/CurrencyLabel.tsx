import type { Currency } from "~/utils/currencies";

// Flag, code, and name, shared by every editor row.
export function CurrencyLabel({ currency }: { currency: Currency }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span aria-hidden="true" className="text-xl leading-none">
        {currency.flag}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-5 font-semibold text-white">
          {currency.code}
        </span>
        <span className="block truncate text-xs text-muted">
          {currency.name}
        </span>
      </span>
    </span>
  );
}
