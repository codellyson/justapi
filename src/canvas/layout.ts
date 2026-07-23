import type { XYPosition } from "@xyflow/react";

interface GridOptions {
  cols?: number;
  w?: number;
  h?: number;
}

/** Simple grid placement for fan-out imports, centered around `origin`. */
export const gridPositions = (
  count: number,
  origin: XYPosition,
  opts?: GridOptions
): XYPosition[] => {
  const cols = opts?.cols ?? 3;
  const w = opts?.w ?? 380;
  const h = opts?.h ?? 150;
  const rows = Math.ceil(count / cols);
  const offsetX = ((Math.min(count, cols) - 1) * w) / 2;
  const offsetY = ((rows - 1) * h) / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: origin.x + (i % cols) * w - offsetX,
    y: origin.y + Math.floor(i / cols) * h - offsetY,
  }));
};
