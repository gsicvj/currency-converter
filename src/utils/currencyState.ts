import type { Currency } from "./currencies";
import type { CurrencyState } from "./currencyPreferences";
import {
  addActiveCurrencyCode,
  moveActiveCurrencyCode,
  removeActiveCurrencyCode,
  reorderActiveCurrencyCode,
  selectCurrencyCode,
  swapSelectedCurrencyCode,
} from "./currencySelection";

export interface RemovedCurrency {
  // Increments per removal so the undo toast restarts its timer.
  id: number;
  code: string;
  index: number;
}

export interface CurrencyEditorState extends CurrencyState {
  lastRemoved: RemovedCurrency | null;
}

export type CurrencyStateAction =
  | { type: "hydrate"; state: CurrencyState }
  | { type: "select"; code: string }
  | { type: "swap" }
  | { type: "add"; code: string; currencies: Currency[] }
  | { type: "remove"; code: string }
  | { type: "undoRemove" }
  | { type: "dismissRemoved" }
  | { type: "move"; code: string; offset: number }
  | { type: "reorder"; sourceCode: string; targetCode: string };

function withActiveCodes(
  state: CurrencyEditorState,
  activeCodes: string[],
): CurrencyEditorState {
  return activeCodes === state.activeCodes ? state : { ...state, activeCodes };
}

export function currencyStateReducer(
  state: CurrencyEditorState,
  action: CurrencyStateAction,
): CurrencyEditorState {
  switch (action.type) {
    case "hydrate":
      return { ...action.state, lastRemoved: null };

    case "select":
      return selectCurrencyCode(state, action.code);

    case "swap":
      return swapSelectedCurrencyCode(state);

    case "add": {
      const activeCodes = addActiveCurrencyCode(
        state.activeCodes,
        action.code,
        action.currencies,
      );
      // Keep the selection so the typed amount converts into the new row.
      return withActiveCodes(state, activeCodes);
    }

    case "remove": {
      const index = state.activeCodes.indexOf(action.code);
      const nextState = removeActiveCurrencyCode({
        activeCodes: state.activeCodes,
        code: action.code,
        selectedCode: state.selectedCode,
      });
      if (nextState.activeCodes === state.activeCodes) return state;

      return {
        ...nextState,
        previousSelectedCode:
          state.previousSelectedCode &&
          nextState.activeCodes.includes(state.previousSelectedCode)
            ? state.previousSelectedCode
            : null,
        lastRemoved: {
          id: (state.lastRemoved?.id ?? 0) + 1,
          code: action.code,
          index,
        },
      };
    }

    case "undoRemove": {
      const { lastRemoved } = state;
      if (!lastRemoved) return state;
      if (state.activeCodes.includes(lastRemoved.code)) {
        return { ...state, lastRemoved: null };
      }

      const activeCodes = [...state.activeCodes];
      activeCodes.splice(
        Math.min(lastRemoved.index, activeCodes.length),
        0,
        lastRemoved.code,
      );
      return { ...state, activeCodes, lastRemoved: null };
    }

    case "dismissRemoved":
      return state.lastRemoved ? { ...state, lastRemoved: null } : state;

    case "move":
      return withActiveCodes(
        state,
        moveActiveCurrencyCode(state.activeCodes, action.code, action.offset),
      );

    case "reorder":
      return withActiveCodes(
        state,
        reorderActiveCurrencyCode({
          activeCodes: state.activeCodes,
          sourceCode: action.sourceCode,
          targetCode: action.targetCode,
        }),
      );
  }
}
