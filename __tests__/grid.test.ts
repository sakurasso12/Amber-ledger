import { compact, GridItem, layoutHeight, moveTo, overlaps, packRows, placeNew, rowsFor, colsFor } from '@/lib/grid';

const g = (key: string, x: number, y: number, w: number, h: number): GridItem => ({ key, x, y, w, h });
const noOverlaps = (items: GridItem[]) => items.every((a) => items.every((b) => !overlaps(a, b)));
const get = (items: GridItem[], key: string) => items.find((i) => i.key === key)!;

describe('grid layout', () => {
  it('floats widgets up and leaves no holes', () => {
    const out = compact([g('a', 0, 10, 2, 5), g('b', 2, 30, 2, 5)], 4);
    expect(get(out, 'a').y).toBe(0);
    expect(get(out, 'b').y).toBe(0);
  });

  it('stacks widgets in the same columns', () => {
    const out = compact([g('a', 0, 0, 4, 5), g('b', 0, 2, 2, 3)], 4);
    expect(get(out, 'b').y).toBe(5);
    expect(noOverlaps(out)).toBe(true);
  });

  it('moving onto another widget pushes it down', () => {
    const items = [g('a', 0, 0, 4, 5), g('b', 0, 5, 4, 5)];
    const out = moveTo(items, 'b', { x: 0, y: 0 }, 4);
    expect(get(out, 'b').y).toBe(0);
    expect(get(out, 'a').y).toBe(5);
    expect(noOverlaps(out)).toBe(true);
  });

  it('moving sideways keeps both in one row when they fit', () => {
    const items = [g('a', 0, 0, 2, 5), g('b', 0, 5, 2, 5)];
    const out = moveTo(items, 'b', { x: 2, y: 0 }, 4);
    expect(get(out, 'b')).toMatchObject({ x: 2, y: 0 });
    expect(get(out, 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('resizing wider pushes the neighbour below', () => {
    const items = [g('a', 0, 0, 2, 5), g('b', 2, 0, 2, 5)];
    const out = moveTo(items, 'a', { x: 0, y: 0, w: 4 }, 4);
    expect(get(out, 'a').w).toBe(4);
    expect(get(out, 'b').y).toBe(5);
    expect(noOverlaps(out)).toBe(true);
  });

  it('never goes past the columns', () => {
    const out = moveTo([g('a', 0, 0, 2, 5)], 'a', { x: 3, y: 0, w: 3 }, 4);
    expect(get(out, 'a')).toMatchObject({ x: 1, w: 3 });
  });

  it('puts a new widget in the first free spot', () => {
    const items = [g('a', 0, 0, 2, 5)];
    expect(placeNew(items, 'n', 2, 5, 4)).toMatchObject({ x: 2, y: 0 });
    expect(placeNew(items, 'n', 4, 5, 4)).toMatchObject({ x: 0, y: 5 });
  });

  it('chains pushes without overlaps', () => {
    const items = [g('a', 0, 0, 4, 4), g('b', 0, 4, 4, 4), g('c', 0, 8, 4, 4)];
    const out = moveTo(items, 'c', { x: 0, y: 0 }, 4);
    expect(out.map((i) => i.key).join('')).toBe('cab');
    expect(noOverlaps(out)).toBe(true);
    expect(layoutHeight(out)).toBe(12);
  });

  it('converts pixels to rows and columns', () => {
    expect(rowsFor(100, 8, 12)).toBe(14);
    expect(colsFor(200, 96, 12)).toBe(2);
    expect(colsFor(10, 96, 12)).toBe(1);
  });

  it('the default arrangement fills rows, pulling a fitting widget into a gap', () => {
    const out = packRows(
      [
        { key: 'balance', w: 4, h: 5 },
        { key: 'card', w: 2, h: 5 },
        { key: 'loan', w: 4, h: 5 },
        { key: 'week', w: 2, h: 5 },
        { key: 'month', w: 2, h: 5 },
      ],
      8
    );
    const row = (k: string) => out.find((i) => i.key === k)!.y;
    expect(row('week')).toBe(row('balance')); // pulled up next to the balance and the card
    expect(row('loan')).toBe(row('month'));
    expect(out.find((i) => i.key === 'month')!.w).toBe(4); // stretched to the row's end
    expect(noOverlaps(out)).toBe(true);
  });
});
