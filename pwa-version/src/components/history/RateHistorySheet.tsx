import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Currency } from "~/utils/currencies";
import { formatChangePercent, formatRate } from "~/utils/format";
import {
  DEFAULT_RATE_HISTORY_RANGE,
  RATE_HISTORY_RANGES,
  summarizeRateHistory,
  useRateHistory,
  type RateHistoryRange,
} from "~/utils/rateHistory";
import { Sheet, SheetDoneButton } from "../ui/Sheet";

const loadRateChart = () => import("./RateChart");

// Chart.js stays out of the main bundle. The converter preloads it while
// idle, so the sheet rarely waits for it.
export const preloadRateChart = loadRateChart;

const RateChart = lazy(() =>
  loadRateChart().then((module) => ({ default: module.RateChart })),
);

function getDefaultQuote(currencies: Currency[], base: string) {
  return (
    currencies.find((currency) => currency.code !== base)?.code ??
    (base === "EUR" ? "USD" : "EUR")
  );
}

function ChartMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted">
      {children}
    </div>
  );
}

interface RateHistorySheetProps {
  currencies: Currency[];
  initialBase: string;
  onClose: () => void;
}

// Exchange rate history for the selected currency against one of the
// other active currencies.
export function RateHistorySheet({
  currencies,
  initialBase,
  onClose,
}: RateHistorySheetProps) {
  const [base, setBase] = useState(initialBase);
  const [quote, setQuote] = useState(() =>
    getDefaultQuote(currencies, initialBase),
  );
  const [range, setRange] = useState<RateHistoryRange>(
    DEFAULT_RATE_HISTORY_RANGE,
  );
  const { points, error, refetch } = useRateHistory({ base, quote, range });
  const summary = useMemo(
    () => (points ? summarizeRateHistory(points) : null),
    [points],
  );
  const quoteOptions = useMemo(
    () => currencies.filter((currency) => currency.code !== base),
    [base, currencies],
  );

  const swap = useCallback(() => {
    setBase(quote);
    setQuote(base);
  }, [base, quote]);

  let chartContent: ReactNode;
  if (error && !points) {
    chartContent = (
      <ChartMessage>
        <p className="font-semibold text-white">Couldn't load rate history</p>
        <button
          type="button"
          onClick={refetch}
          className="rounded-lg bg-accent px-4 py-2 font-semibold text-ink"
        >
          Retry
        </button>
      </ChartMessage>
    );
  } else if (!points) {
    chartContent = <ChartMessage>Loading rate history...</ChartMessage>;
  } else if (points.length === 0) {
    chartContent = <ChartMessage>No history for this pair.</ChartMessage>;
  } else {
    chartContent = (
      <Suspense fallback={<ChartMessage>Loading chart...</ChartMessage>}>
        <RateChart
          label={`${base} to ${quote} exchange rate chart`}
          points={points}
        />
      </Suspense>
    );
  }

  return (
    <Sheet labelledBy="rate-history-title" onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between py-2 pr-2 pl-5">
        <h2 id="rate-history-title" className="text-base font-semibold">
          Rate history
        </h2>
        <SheetDoneButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tabular-nums">
              {summary
                ? `1 ${base} = ${formatRate(summary.latest)} ${quote}`
                : `${base} to ${quote}`}
            </p>
            <p className="h-5 text-sm text-muted tabular-nums">
              {summary ? (
                <>
                  <span
                    className={
                      summary.changePercent < 0
                        ? "text-rose-300"
                        : "text-accent"
                    }
                  >
                    {formatChangePercent(summary.changePercent)}
                  </span>{" "}
                  over {range}
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            aria-label="Swap currencies"
            title="Swap currencies"
            onClick={swap}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised text-teal transition-colors hover:bg-raised-hover hover:text-white"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <div
          role="group"
          aria-label="Range"
          className="grid shrink-0 grid-cols-5 gap-1 rounded-xl border border-line bg-raised p-1"
        >
          {RATE_HISTORY_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              className={`h-8 rounded-lg text-sm font-medium transition-colors ${
                option === range
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-raised-hover hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="min-h-56 flex-1">{chartContent}</div>

        <p className="h-4 shrink-0 text-xs text-muted tabular-nums">
          {summary
            ? `Low ${formatRate(summary.low)} · High ${formatRate(summary.high)}`
            : null}
        </p>

        <section className="space-y-2">
          <h3 className="px-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Compare with
          </h3>
          <div
            role="group"
            aria-label="Compare with"
            className="flex flex-wrap gap-2"
          >
            {quoteOptions.map((currency) => (
              <button
                key={currency.code}
                type="button"
                aria-pressed={currency.code === quote}
                onClick={() => setQuote(currency.code)}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                  currency.code === quote
                    ? "border-accent/60 bg-accent/15 text-accent"
                    : "border-line bg-raised text-white hover:bg-raised-hover"
                }`}
              >
                <span aria-hidden="true">{currency.flag}</span>
                {currency.code}
              </button>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted">
          Reference rates from Frankfurter
        </p>
      </div>
    </Sheet>
  );
}
