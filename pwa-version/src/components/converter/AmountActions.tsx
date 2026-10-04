import { memo } from "react";
import { ArrowUpDown, Delete } from "lucide-react";

const ACTIONS = [
  {
    input: "backspace",
    label: "Delete last digit",
    shortcut: "Backspace",
    content: <Delete size={18} />,
  },
  { input: "C", label: "Clear amount", shortcut: "C", content: "C" },
  {
    input: "swap",
    label: "Swap selected currency",
    shortcut: "S",
    content: <ArrowUpDown size={16} />,
  },
];

interface AmountActionsProps {
  onInput: (input: string) => void;
}

// The keypad is hidden on wide screens with a fine pointer, which also hid
// its clear, delete and swap keys. This bar shows exactly when the keypad
// does not, so mouse users keep those actions.
export const AmountActions = memo(function AmountActions({
  onInput,
}: AmountActionsProps) {
  return (
    <div
      role="group"
      aria-label="Amount actions"
      className="hidden shrink-0 justify-end gap-2 border-t border-line px-3 py-2 lg:flex [@media(any-pointer:coarse)]:hidden"
    >
      {ACTIONS.map((action) => (
        <button
          key={action.input}
          type="button"
          aria-label={action.label}
          title={`${action.label} (${action.shortcut})`}
          onClick={() => onInput(action.input)}
          className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-raised/60 px-3 text-sm font-medium text-teal transition-colors hover:bg-raised-hover hover:text-white"
        >
          {action.content}
        </button>
      ))}
    </div>
  );
});
