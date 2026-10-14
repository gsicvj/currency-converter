import { memo, useCallback, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronDown, Delete } from "lucide-react";

interface KeypadKey {
  input: string;
  content: ReactNode;
  label?: string;
  tone?: "digit" | "action" | "accent";
  className?: string;
}

// Calculator layout: digits on the left, actions in the right column.
const KEYS: KeypadKey[] = [
  { input: "7", content: "7" },
  { input: "8", content: "8" },
  { input: "9", content: "9" },
  {
    input: "backspace",
    content: <Delete size={20} />,
    label: "Delete last digit",
    tone: "action",
  },
  { input: "4", content: "4" },
  { input: "5", content: "5" },
  { input: "6", content: "6" },
  { input: "C", content: "C", label: "Clear amount", tone: "action" },
  { input: "1", content: "1" },
  { input: "2", content: "2" },
  { input: "3", content: "3" },
  {
    input: "swap",
    content: <ArrowUpDown size={18} />,
    label: "Swap selected currency",
    tone: "accent",
  },
  { input: "0", content: "0", className: "col-span-2" },
  { input: ".", content: ".", label: "Decimal separator" },
];

const KEY_TONES = {
  digit: "bg-raised text-xl text-white hover:bg-raised-hover",
  action: "bg-raised/60 text-lg text-teal hover:bg-raised-hover hover:text-white",
  accent: "bg-linear-to-br from-accent to-teal text-ink hover:brightness-110",
};

const KEY_BASE =
  "flex h-12 items-center justify-center rounded-xl font-medium transition-colors active:scale-[0.97]";

// Shared by the keys and the toggle overlay so both grids line up exactly.
const KEYPAD_PADDING =
  "px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]";
const KEYPAD_GRID = "mx-auto grid max-w-sm grid-cols-4 gap-2";

interface KeypadProps {
  onInput: (input: string) => void;
}

export const Keypad = memo(function Keypad({ onInput }: KeypadProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleLabel = isCollapsed ? "Show keyboard" : "Hide keyboard";

  const handleToggle = useCallback(() => {
    setIsCollapsed((currentValue) => !currentValue);
  }, []);

  return (
    <div
      role="group"
      aria-label="Currency keypad"
      className="relative shrink-0 touch-none md:mt-auto md:rounded-b-2xl lg:hidden [@media(any-pointer:coarse)]:block"
    >
      {/* Keys stay mounted so the grid row can ease between full and zero
          height. inert keeps collapsed keys out of focus and the a11y tree. */}
      <div
        id="keypad-keys"
        data-keypad-keys=""
        aria-hidden={isCollapsed}
        inert={isCollapsed}
        className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-sheet ${
          isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`${KEYPAD_PADDING} border-t border-line bg-surface md:rounded-b-2xl`}>
            <div className={KEYPAD_GRID}>
              {KEYS.map((key) => (
                <button
                  key={key.input}
                  type="button"
                  aria-label={key.label}
                  onClick={() => onInput(key.input)}
                  className={`${KEY_BASE} ${KEY_TONES[key.tone ?? "digit"]} ${key.className ?? ""}`}
                >
                  {key.content}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Mirrors the key grid so the toggle lands in the free bottom-right
          slot when open, and floats over the list when collapsed. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 ${KEYPAD_PADDING}`}
      >
        <div className={KEYPAD_GRID}>
          <button
            type="button"
            aria-label={toggleLabel}
            aria-controls="keypad-keys"
            aria-expanded={!isCollapsed}
            title={toggleLabel}
            onClick={handleToggle}
            className={`${KEY_BASE} pointer-events-auto col-start-4 bg-raised text-lg text-teal shadow-lg shadow-black/40 hover:bg-raised-hover hover:text-white`}
          >
            <ChevronDown
              size={20}
              className={`motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-sheet ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
});
