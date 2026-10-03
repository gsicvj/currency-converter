import { describe, expect, it } from "vitest";
import { clampDragOffset, getDragOverIndex, getRowShift } from "./reorderDrag";

// Four 50px rows starting at y=0.
const rows = [0, 1, 2, 3].map((index) => ({ top: index * 50, height: 50 }));

describe("getDragOverIndex", () => {
  it("keeps the original slot until an edge passes a neighbour's middle", () => {
    expect(getDragOverIndex(rows, 1, 0)).toBe(1);
    expect(getDragOverIndex(rows, 1, 24)).toBe(1);
    expect(getDragOverIndex(rows, 1, -24)).toBe(1);
  });

  it("moves down once the bottom edge passes the next row's middle", () => {
    expect(getDragOverIndex(rows, 1, 26)).toBe(2);
    expect(getDragOverIndex(rows, 1, 76)).toBe(3);
  });

  it("moves up once the top edge passes the previous row's middle", () => {
    expect(getDragOverIndex(rows, 2, -26)).toBe(1);
    expect(getDragOverIndex(rows, 2, -76)).toBe(0);
  });
});

describe("getRowShift", () => {
  it("slides rows between the old and new slot toward the gap", () => {
    // Dragging index 0 down to index 2 lifts rows 1 and 2.
    expect(getRowShift(1, 0, 2, 50)).toBe(-50);
    expect(getRowShift(2, 0, 2, 50)).toBe(-50);
    expect(getRowShift(3, 0, 2, 50)).toBe(0);

    // Dragging index 3 up to index 1 pushes rows 1 and 2 down.
    expect(getRowShift(0, 3, 1, 50)).toBe(0);
    expect(getRowShift(1, 3, 1, 50)).toBe(50);
    expect(getRowShift(2, 3, 1, 50)).toBe(50);
  });

  it("leaves every row in place while hovering the original slot", () => {
    expect(rows.map((_, index) => getRowShift(index, 1, 1, 50))).toEqual([
      0, 0, 0, 0,
    ]);
  });
});

describe("clampDragOffset", () => {
  it("keeps the dragged row inside the list", () => {
    expect(clampDragOffset(rows, 1, -200)).toBe(-50);
    expect(clampDragOffset(rows, 1, 200)).toBe(100);
    expect(clampDragOffset(rows, 1, 30)).toBe(30);
  });
});
