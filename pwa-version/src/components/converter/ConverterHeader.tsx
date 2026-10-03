import { memo, type Ref } from "react";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { AppLogo } from "~/components/ui/AppLogo";

interface ConverterHeaderProps {
  editButtonRef?: Ref<HTMLButtonElement>;
  isRefreshing: boolean;
  status: string;
  onEdit: () => void;
  onRefresh: () => void;
}

export const ConverterHeader = memo(function ConverterHeader({
  editButtonRef,
  isRefreshing,
  status,
  onEdit,
  onRefresh,
}: ConverterHeaderProps) {
  return (
    // Equal side columns keep the status centred on the header itself.
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
      <AppLogo className="size-6 shrink-0" />
      {/* px-8 reserves room for the refresh button on both sides, so the
          button can hang off the text without pulling it off centre. */}
      <div className="flex min-w-0 justify-center px-8 text-xs text-muted">
        <div className="relative min-w-0">
          <span className="block truncate">{status}</span>
          <button
            type="button"
            aria-label="Refresh exchange rates"
            title="Refresh exchange rates"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="absolute top-1/2 left-full inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors hover:bg-raised hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin text-accent" : undefined}
            />
          </button>
        </div>
      </div>
      <button
        ref={editButtonRef}
        type="button"
        aria-label="Edit currencies"
        onClick={onEdit}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 justify-self-end rounded-lg px-2.5 text-sm font-medium text-accent transition-colors hover:bg-raised"
      >
        <SlidersHorizontal size={15} />
        Edit
      </button>
    </header>
  );
});
