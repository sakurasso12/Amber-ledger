/**
 * Layout engine for the widget grid (GridBoard): where every widget sits.
 *
 * Columns are whole cells; rows are thin ROW-pixel strips, so a widget's height can follow its
 * content almost exactly while widths still snap to columns. Widgets never overlap and float up
 * ("gravity"): moving or resizing one pushes whatever it lands on downwards, then everything
 * settles up again so no holes are left. Pure functions — the component only feeds them positions.
 */

export interface GridItem {
  key: string;
  /** Column, 0-based. */
  x: number;
  /** Row (ROW px each), 0-based. */
  y: number;
  /** Width in columns. */
  w: number;
  /** Height in rows. */
  h: number;
}

export const overlaps = (a: GridItem, b: GridItem) =>
  a.key !== b.key && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const clampX = (item: GridItem, cols: number): GridItem => {
  const w = Math.max(1, Math.min(item.w, cols));
  return { ...item, w, x: Math.max(0, Math.min(item.x, cols - w)), y: Math.max(0, item.y) };
};

/** The highest spot in the item's columns that doesn't hit anything already `placed`. */
function settle(item: GridItem, placed: GridItem[]): GridItem {
  let y = 0;
  for (;;) {
    const probe = { ...item, y };
    const hit = placed.find((p) => overlaps(probe, p));
    if (!hit) return probe;
    y = hit.y + hit.h;
  }
}

const byPosition = (a: GridItem, b: GridItem) => a.y - b.y || a.x - b.x;

/** Everything floats up as far as it can, keeping columns and top-to-bottom order. */
export function compact(items: GridItem[], cols: number): GridItem[] {
  const placed: GridItem[] = [];
  for (const item of [...items].map((i) => clampX(i, cols)).sort(byPosition)) placed.push(settle(item, placed));
  return placed;
}

/**
 * `key` goes to (x, y) with size (w, h); what it lands on is pushed down, then all settles up.
 * The moved widget wins ties: it's laid first among the widgets at its height.
 */
export function moveTo(items: GridItem[], key: string, next: { x: number; y: number; w?: number; h?: number }, cols: number): GridItem[] {
  const moving = items.find((i) => i.key === key);
  if (!moving) return items;
  const target = clampX({ ...moving, ...next, w: next.w ?? moving.w, h: next.h ?? moving.h }, cols);
  const others = items.filter((i) => i.key !== key).map((i) => clampX(i, cols)).sort(byPosition);
  // Push down anything the target covers (and, in turn, whatever those land on).
  const placed: GridItem[] = [target];
  for (const item of others) {
    let it = item;
    for (;;) {
      const hit = placed.find((p) => overlaps(it, p));
      if (!hit) break;
      it = { ...it, y: hit.y + hit.h };
    }
    placed.push(it);
  }
  // Gravity, with the moved widget first among equals so it keeps the spot it was dropped on.
  const sorted = placed.sort((a, b) => a.y - b.y || Number(b.key === key) - Number(a.key === key) || a.x - b.x);
  const out: GridItem[] = [];
  for (const item of sorted) out.push(settle(item, out));
  return out;
}

/** First free spot for a new widget of size w×h: top to bottom, left to right. */
export function placeNew(items: GridItem[], key: string, w: number, h: number, cols: number): GridItem {
  const width = Math.max(1, Math.min(w, cols));
  for (let y = 0; ; y++) {
    for (let x = 0; x + width <= cols; x++) {
      const probe = { key, x, y, w: width, h };
      if (!items.some((i) => overlaps(probe, i))) return probe;
    }
  }
}

/** Rows (of `row` px) needed for `px` of content plus the gap under it. */
export const rowsFor = (px: number, row: number, gap: number) => Math.max(1, Math.ceil((px + gap) / row));

/** Columns needed for `px` of width, with cells of `cell` px and `gap` between them. */
export const colsFor = (px: number, cell: number, gap: number) => Math.max(1, Math.ceil((px + gap) / (cell + gap)));

/** Bottom edge of the whole layout, in rows. */
export const layoutHeight = (items: GridItem[]) => items.reduce((m, i) => Math.max(m, i.y + i.h), 0);

/**
 * The default arrangement: rows filled left to right in the widgets' order; when the next one
 * doesn't fit what's left of a row, a later one that does fit is pulled up into the gap, so rows
 * come out full instead of leaving holes; a gap nothing fits is taken by the row's last widget.
 * Heights are per widget (even rows are the caller's job).
 */
export function packRows(items: { key: string; w: number; h: number }[], cols: number): GridItem[] {
  const queue = items.map((i) => ({ ...i, w: Math.max(1, Math.min(i.w, cols)) }));
  const out: GridItem[] = [];
  let y = 0;
  while (queue.length) {
    let x = 0;
    let rowH = 0;
    let last: GridItem | null = null;
    for (let i = 0; i < queue.length && x < cols; ) {
      const it = queue[i];
      if (x + it.w <= cols) {
        last = { key: it.key, x, y, w: it.w, h: it.h };
        out.push(last);
        x += it.w;
        rowH = Math.max(rowH, it.h);
        queue.splice(i, 1);
      } else i++;
    }
    // Nothing else fits the rest of the row: the last widget stretches to the edge.
    if (last && x < cols) last.w += cols - x;
    y += Math.max(rowH, 1);
  }
  return out;
}
