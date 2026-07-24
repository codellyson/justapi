import type { XYPosition } from "@xyflow/react";
import type { CanvasNode } from "./types";

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

/* Fallback footprints per node type — used when React Flow hasn't
   measured the node yet (it stamps `measured` after first render). */
const FOOTPRINT: Record<string, { w: number; h: number }> = {
  request: { w: 400, h: 145 },
  collection: { w: 264, h: 135 },
  assert: { w: 320, h: 165 },
};

const MARGIN = 28;

const rectOf = (node: CanvasNode) => {
  const measured = (node as { measured?: { width?: number; height?: number } })
    .measured;
  const fallback = FOOTPRINT[node.type ?? "request"] ?? FOOTPRINT.request;
  return {
    x: node.position.x,
    y: node.position.y,
    w: measured?.width ?? fallback.w,
    h: measured?.height ?? fallback.h,
  };
};

/** Nudge `desired` downward until the incoming node's footprint clears
 *  every existing node (plus a margin) — new nodes never stack on top
 *  of what's already on the board. */
export const freePosition = (
  nodes: CanvasNode[],
  desired: XYPosition,
  type: CanvasNode["type"]
): XYPosition => {
  const size = FOOTPRINT[type ?? "request"] ?? FOOTPRINT.request;
  const pos = { ...desired };
  for (let i = 0; i < 50; i++) {
    const hit = nodes.find((n) => {
      const r = rectOf(n);
      return (
        pos.x < r.x + r.w + MARGIN &&
        pos.x + size.w + MARGIN > r.x &&
        pos.y < r.y + r.h + MARGIN &&
        pos.y + size.h + MARGIN > r.y
      );
    });
    if (!hit) return pos;
    pos.y = rectOf(hit).y + rectOf(hit).h + MARGIN;
  }
  return pos;
};

/** Resolve a *dropped* node out of overlap with the least movement:
 *  slide it to the nearest clear spot beside/above/below whatever it
 *  landed on, so a drag release never leaves two nodes stacked. */
export const settlePosition = (
  nodes: CanvasNode[],
  desired: XYPosition,
  type: CanvasNode["type"]
): XYPosition => {
  const size = FOOTPRINT[type ?? "request"] ?? FOOTPRINT.request;
  const collides = (pos: XYPosition) =>
    nodes.some((n) => {
      const r = rectOf(n);
      return (
        pos.x < r.x + r.w + MARGIN &&
        pos.x + size.w + MARGIN > r.x &&
        pos.y < r.y + r.h + MARGIN &&
        pos.y + size.h + MARGIN > r.y
      );
    });
  if (!collides(desired)) return desired;

  // Candidate spots: flush against each edge of every blocker.
  const candidates: XYPosition[] = [];
  for (const n of nodes) {
    const r = rectOf(n);
    candidates.push(
      { x: desired.x, y: r.y - size.h - MARGIN }, // above
      { x: desired.x, y: r.y + r.h + MARGIN }, // below
      { x: r.x - size.w - MARGIN, y: desired.y }, // left
      { x: r.x + r.w + MARGIN, y: desired.y } // right
    );
  }
  const clear = candidates.filter((c) => !collides(c));
  if (clear.length) {
    clear.sort(
      (a, b) =>
        (a.x - desired.x) ** 2 +
        (a.y - desired.y) ** 2 -
        ((b.x - desired.x) ** 2 + (b.y - desired.y) ** 2)
    );
    return clear[0];
  }
  return freePosition(nodes, desired, type);
};

/** Resolve overlaps in place after a card changes size (a response
 *  preview opening, a section expanding): keep every x, sweep top-down,
 *  and push whichever card is underneath far enough down to clear.
 *  Monotonic (only ever pushes down) so it always converges, and cards
 *  that don't collide never move. */
export const relaxCollisions = (nodes: CanvasNode[]): CanvasNode[] => {
  const rects = nodes.map((n) => ({ id: n.id, r: rectOf(n) }));
  for (let pass = 0; pass < 10; pass++) {
    rects.sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x);
    let moved = false;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        const overlaps =
          a.x < b.x + b.w + MARGIN &&
          a.x + a.w + MARGIN > b.x &&
          a.y < b.y + b.h + MARGIN &&
          a.y + a.h + MARGIN > b.y;
        if (overlaps) {
          b.y = a.y + a.h + MARGIN;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  const byId = new Map(rects.map(({ id, r }) => [id, r]));
  return nodes.map((n) => {
    const r = byId.get(n.id)!;
    return r.x !== n.position.x || r.y !== n.position.y
      ? { ...n, position: { x: r.x, y: r.y } }
      : n;
  });
};

/* Wide pitch: 200px of clear wire between 360px cards, so bind labels
   sit on the run instead of squeezing between edges. */
const TIDY_X_GAP = 560;
const TIDY_ROW_GAP = 80;

/** Auto-arrange: forward-facing tree. EVERY edge — chain, binding,
 *  assert — flows strictly left→right into the next column, so wires
 *  never loop backwards. Parents center on their children (classic
 *  tree fan-out), rows come from the cards' measured heights so tall
 *  expanded cards get the room they occupy, and sibling order follows
 *  current vertical order so a tidy never shuffles meaning. */
export const tidyLayout = (
  nodes: CanvasNode[],
  edges: { source: string; target: string }[]
): Record<string, XYPosition> => {
  const pos: Record<string, XYPosition> = {};
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const yNow = (id: string) => byId.get(id)?.position.y ?? 0;
  const heightOf = (id: string) => {
    const n = byId.get(id);
    return n ? rectOf(n).h : FOOTPRINT.request.h;
  };

  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    (children.get(e.source) ??
      children.set(e.source, []).get(e.source)!).push(e.target);
    hasParent.add(e.target);
  }
  for (const list of children.values())
    list.sort((a, b) => yNow(a) - yNow(b));

  // Leaves claim rows top-down, each as tall as its real card;
  // parents sit at the vertical midpoint of their children.
  let cursor = 0;
  const seen = new Set<string>();
  const place = (id: string, depth: number): number => {
    seen.add(id);
    const kids = (children.get(id) ?? []).filter((k) => !seen.has(k));
    const ys = kids.map((k) => place(k, depth + 1));
    let y: number;
    if (ys.length) {
      y = (Math.min(...ys) + Math.max(...ys)) / 2;
      // A tall (expanded) parent can outgrow its children's rows —
      // make sure the next subtree clears it.
      cursor = Math.max(cursor, y + heightOf(id) + TIDY_ROW_GAP);
    } else {
      y = cursor;
      cursor += heightOf(id) + TIDY_ROW_GAP;
    }
    pos[id] = { x: depth * TIDY_X_GAP, y };
    return y;
  };

  const roots = nodes
    .filter((n) => !hasParent.has(n.id))
    .sort((a, b) => a.position.y - b.position.y);
  for (const r of roots) place(r.id, 0);
  // Cycles / disconnected leftovers park in the first column.
  for (const n of nodes)
    if (!seen.has(n.id)) {
      pos[n.id] = { x: 0, y: cursor };
      cursor += heightOf(n.id) + TIDY_ROW_GAP;
    }

  return pos;
};
