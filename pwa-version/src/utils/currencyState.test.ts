import { describe, expect, it } from "vitest";
import type { Currency } from "./currencies";
import {
  currencyStateReducer,
  type CurrencyEditorState,
} from "./currencyState";

const currencies: Currency[] = [
  { code: "EUR", name: "Euro", flag: "EUR" },
  { code: "USD", name: "United States Dollar", flag: "USD" },
  { code: "JPY", name: "Japanese Yen", flag: "JPY" },
  { code: "GBP", name: "British Pound", flag: "GBP" },
];

function createState(
  overrides: Partial<CurrencyEditorState> = {},
): CurrencyEditorState {
  return {
    activeCodes: ["EUR", "USD", "JPY"],
    selectedCode: "EUR",
    previousSelectedCode: null,
    lastRemoved: null,
    ...overrides,
  };
}

describe("currencyStateReducer", () => {
  it("adds a supported currency without changing the selected amount", () => {
    const state = currencyStateReducer(createState(), {
      type: "add",
      code: "GBP",
      currencies,
    });

    expect(state.activeCodes).toEqual(["EUR", "USD", "JPY", "GBP"]);
    expect(state.selectedCode).toBe("EUR");
  });

  it("ignores unsupported currencies", () => {
    const initialState = createState();

    expect(
      currencyStateReducer(initialState, {
        type: "add",
        code: "XXX",
        currencies,
      }),
    ).toBe(initialState);
  });

  it("removes a currency and remembers where it was for undo", () => {
    const state = currencyStateReducer(
      createState({ previousSelectedCode: "USD" }),
      { type: "remove", code: "USD" },
    );

    expect(state.activeCodes).toEqual(["EUR", "JPY"]);
    expect(state.previousSelectedCode).toBeNull();
    expect(state.lastRemoved).toEqual({ id: 1, code: "USD", index: 1 });
  });

  it("moves the selection when the selected currency is removed", () => {
    const state = currencyStateReducer(createState(), {
      type: "remove",
      code: "EUR",
    });

    expect(state.selectedCode).toBe("USD");
  });

  it("never removes the last currency", () => {
    const initialState = createState({ activeCodes: ["EUR"] });

    expect(
      currencyStateReducer(initialState, { type: "remove", code: "EUR" }),
    ).toBe(initialState);
  });

  it("restores the last removed currency at its old position", () => {
    const removedState = currencyStateReducer(createState(), {
      type: "remove",
      code: "USD",
    });
    const state = currencyStateReducer(removedState, { type: "undoRemove" });

    expect(state.activeCodes).toEqual(["EUR", "USD", "JPY"]);
    expect(state.lastRemoved).toBeNull();
  });

  it("does not duplicate a removed currency that was added again", () => {
    const removedState = currencyStateReducer(createState(), {
      type: "remove",
      code: "USD",
    });
    const readdedState = currencyStateReducer(removedState, {
      type: "add",
      code: "USD",
      currencies,
    });
    const state = currencyStateReducer(readdedState, { type: "undoRemove" });

    expect(state.activeCodes).toEqual(["EUR", "JPY", "USD"]);
  });

  it("dismisses the undo state", () => {
    const removedState = currencyStateReducer(createState(), {
      type: "remove",
      code: "USD",
    });

    expect(
      currencyStateReducer(removedState, { type: "dismissRemoved" }).lastRemoved,
    ).toBeNull();
  });

  it("moves and reorders currencies", () => {
    const movedState = currencyStateReducer(createState(), {
      type: "move",
      code: "JPY",
      offset: -1,
    });
    expect(movedState.activeCodes).toEqual(["EUR", "JPY", "USD"]);

    const reorderedState = currencyStateReducer(movedState, {
      type: "reorder",
      sourceCode: "EUR",
      targetCode: "USD",
    });
    expect(reorderedState.activeCodes).toEqual(["JPY", "USD", "EUR"]);
  });

  it("selects and swaps back to the previous selection", () => {
    const selectedState = currencyStateReducer(createState(), {
      type: "select",
      code: "JPY",
    });
    expect(selectedState.selectedCode).toBe("JPY");

    const swappedState = currencyStateReducer(selectedState, { type: "swap" });
    expect(swappedState.selectedCode).toBe("EUR");
    expect(swappedState.previousSelectedCode).toBe("JPY");
  });

  it("replaces the state from saved preferences", () => {
    const state = currencyStateReducer(createState(), {
      type: "hydrate",
      state: {
        activeCodes: ["GBP", "EUR"],
        selectedCode: "GBP",
        previousSelectedCode: null,
      },
    });

    expect(state).toEqual({
      activeCodes: ["GBP", "EUR"],
      selectedCode: "GBP",
      previousSelectedCode: null,
      lastRemoved: null,
    });
  });
});
