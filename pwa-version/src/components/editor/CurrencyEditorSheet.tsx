import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import type { Currency } from "~/utils/currencies";
import { Sheet, useCloseSheet } from "../ui/Sheet";
import { ActiveCurrencyList } from "./ActiveCurrencyList";
import { CurrencyOptionList } from "./CurrencyOptionList";

function matchesSearch(currency: Currency, query: string) {
  return (
    currency.code.toLowerCase().includes(query) ||
    currency.name.toLowerCase().includes(query) ||
    Boolean(currency.symbol?.toLowerCase().includes(query))
  );
}

// Typing in the search field would raise the on-screen keyboard over the
// list on touch devices, so only fine pointers get autofocus.
function prefersSearchFocus() {
  return window.matchMedia("(pointer: fine)").matches;
}

function DoneButton() {
  const closeSheet = useCloseSheet();

  return (
    <button
      type="button"
      onClick={closeSheet}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-raised"
    >
      Done
    </button>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-1.5 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
        {title}
        {count === undefined ? null : (
          <span className="font-normal tabular-nums">{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

interface CurrencyEditorSheetProps {
  activeCurrencies: Currency[];
  allCurrencies: Currency[];
  isLoading: boolean;
  // Rendered inside the dialog so it stays reachable in the focus trap.
  toast?: ReactNode;
  onAdd: (code: string) => void;
  onClose: () => void;
  onMove: (code: string, offset: number) => void;
  onRemove: (code: string) => void;
  onReorder: (sourceCode: string, targetCode: string) => void;
}

export function CurrencyEditorSheet({
  activeCurrencies,
  allCurrencies,
  isLoading,
  toast,
  onAdd,
  onClose,
  onMove,
  onRemove,
  onReorder,
}: CurrencyEditorSheetProps) {
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [initialFocusRef] = useState(() =>
    prefersSearchFocus() ? searchInputRef : undefined,
  );
  const query = useDeferredValue(search.trim().toLowerCase());
  const activeCodeSet = useMemo(
    () => new Set(activeCurrencies.map((currency) => currency.code)),
    [activeCurrencies],
  );
  const availableCurrencies = useMemo(
    () => allCurrencies.filter((currency) => !activeCodeSet.has(currency.code)),
    [activeCodeSet, allCurrencies],
  );
  const searchResults = useMemo(
    () =>
      query
        ? allCurrencies.filter((currency) => matchesSearch(currency, query))
        : [],
    [allCurrencies, query],
  );

  const handleAdd = useCallback(
    (code: string) => {
      onAdd(code);
      setAnnouncement(`${code} added`);
    },
    [onAdd],
  );

  const handleClearSearch = useCallback(() => {
    setSearch("");
    searchInputRef.current?.focus();
  }, []);

  return (
    <Sheet
      labelledBy="currency-editor-title"
      initialFocusRef={initialFocusRef}
      onClose={onClose}
    >
      <div className="flex shrink-0 items-center justify-between py-2 pr-2 pl-5">
        <h2 id="currency-editor-title" className="text-base font-semibold">
          Edit currencies
        </h2>
        <DoneButton />
      </div>

      <div className="shrink-0 px-4 pb-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-raised px-3 text-muted focus-within:border-accent/60">
          <Search size={16} className="shrink-0" />
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Search currencies"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search currencies"
            autoComplete="off"
            className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-white outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClearSearch}
              className="flex size-6 items-center justify-center rounded-full text-muted hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-6">
        {query ? (
          <Section title="Results" count={searchResults.length}>
            {searchResults.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted">
                No currencies match “{search.trim()}”.
              </p>
            ) : (
              <CurrencyOptionList
                activeCodeSet={activeCodeSet}
                currencies={searchResults}
                onAdd={handleAdd}
              />
            )}
          </Section>
        ) : (
          <>
            <Section title="Your currencies" count={activeCurrencies.length}>
              <ActiveCurrencyList
                currencies={activeCurrencies}
                onMove={onMove}
                onRemove={onRemove}
                onReorder={onReorder}
              />
              <p id="reorder-hint" className="px-1 text-xs text-muted">
                Drag the handle or use the arrow keys to reorder.
              </p>
            </Section>
            <Section title="Add currencies">
              {isLoading ? (
                <p className="px-1 py-6 text-center text-sm text-muted">
                  Loading currencies...
                </p>
              ) : (
                <CurrencyOptionList
                  activeCodeSet={activeCodeSet}
                  currencies={availableCurrencies}
                  onAdd={handleAdd}
                />
              )}
            </Section>
          </>
        )}
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
      {toast}
    </Sheet>
  );
}
