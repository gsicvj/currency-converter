import { describe, expect, it } from "vitest";
import {
  getNextCaretAmountInput,
  getNextKeyboardAmountInput,
} from "./keyboardInput";

describe("getNextKeyboardAmountInput", () => {
  it("replaces the current value with the next digit when reset is armed", () => {
    expect(
      getNextKeyboardAmountInput({
        currentValue: "738.42",
        input: "9",
        replaceOnNextAmountInput: true,
      }),
    ).toEqual({ value: "9", replaceOnNextAmountInput: false });
  });

  it("starts a decimal value when reset is armed and decimal is pressed", () => {
    expect(
      getNextKeyboardAmountInput({
        currentValue: "738.42",
        input: ".",
        replaceOnNextAmountInput: true,
      }),
    ).toEqual({ value: "0.", replaceOnNextAmountInput: false });
  });

  it("keeps appending digits after the reset has been consumed", () => {
    expect(
      getNextKeyboardAmountInput({
        currentValue: "9",
        input: "8",
        replaceOnNextAmountInput: false,
      }),
    ).toEqual({ value: "98", replaceOnNextAmountInput: false });
  });

  it("clears the armed reset when clear or backspace is pressed", () => {
    expect(
      getNextKeyboardAmountInput({
        currentValue: "738.42",
        input: "C",
        replaceOnNextAmountInput: true,
      }),
    ).toEqual({ value: "0", replaceOnNextAmountInput: false });

    expect(
      getNextKeyboardAmountInput({
        currentValue: "738.42",
        input: "backspace",
        replaceOnNextAmountInput: true,
      }),
    ).toEqual({ value: "0", replaceOnNextAmountInput: false });
  });

  it("ignores non-amount commands", () => {
    expect(
      getNextKeyboardAmountInput({
        currentValue: "738.42",
        input: "swap",
        replaceOnNextAmountInput: true,
      }),
    ).toBeNull();
  });
});

describe("getNextCaretAmountInput", () => {
  it("deletes the previous character at the caret", () => {
    expect(
      getNextCaretAmountInput({
        currentValue: "123.12",
        input: "backspace",
        selectionStart: 2,
        selectionEnd: 2,
      }),
    ).toEqual({
      value: "13.12",
      selectionStart: 1,
      selectionEnd: 1,
    });
  });

  it("inserts digits at the caret", () => {
    expect(
      getNextCaretAmountInput({
        currentValue: "123.12",
        input: "9",
        selectionStart: 2,
        selectionEnd: 2,
      }),
    ).toEqual({
      value: "1293.12",
      selectionStart: 3,
      selectionEnd: 3,
    });
  });
});
