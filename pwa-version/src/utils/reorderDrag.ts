export interface RowBox {
  top: number;
  height: number;
}

// Slot the dragged row would land in. A neighbour gives way once the
// dragged row's leading edge passes that neighbour's middle.
export function getDragOverIndex(
  rows: RowBox[],
  fromIndex: number,
  offset: number,
) {
  const dragged = rows[fromIndex];
  const draggedTop = dragged.top + offset;
  const draggedBottom = draggedTop + dragged.height;

  return rows.reduce((overIndex, row, index) => {
    if (index === fromIndex) return overIndex;

    const middle = row.top + row.height / 2;
    const leadingEdge = index < fromIndex ? draggedTop : draggedBottom;
    return middle < leadingEdge ? overIndex + 1 : overIndex;
  }, 0);
}

// How far a resting row slides to open the gap at overIndex.
export function getRowShift(
  index: number,
  fromIndex: number,
  overIndex: number,
  draggedHeight: number,
) {
  if (fromIndex < index && index <= overIndex) return -draggedHeight;
  if (overIndex <= index && index < fromIndex) return draggedHeight;
  return 0;
}

// Keeps the dragged row between the first row's top and the last row's
// bottom, so it never leaves the list.
export function clampDragOffset(
  rows: RowBox[],
  fromIndex: number,
  offset: number,
) {
  const dragged = rows[fromIndex];
  const first = rows[0];
  const last = rows[rows.length - 1];
  const minOffset = first.top - dragged.top;
  const maxOffset = last.top + last.height - (dragged.top + dragged.height);

  return Math.min(Math.max(offset, minOffset), maxOffset);
}
