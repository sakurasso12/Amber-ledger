import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GridCellContext } from './GridCell';
import { GridItemContext } from './GridItem';
import { useLayoutEditStore } from '@/store/useLayoutEditStore';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { colsFor, compact, GridItem, layoutHeight, moveTo, packRows, placeNew, rowsFor } from '@/lib/grid';
import { LayoutEditingContext } from './LayoutEditing';
import { RemoveModuleButton, useHiddenModules } from './HiddenModules';
import { ModuleBoard } from './ModuleBoard';
import type { BoardModule, ModuleSize } from './ModuleBoard';

/** Space between widgets, px. */
export const GRID_GAP = 12;
/** Height of one grid row, px — thin, so a widget's height can follow its content. */
export const GRID_ROW = 6;
const PHONE_COLUMNS = 4;
/** Proportional boards on wide screens: 12 columns — quarters, thirds and halves divide it evenly. */
const WIDE_COLUMNS = 12;
/** Free boards: target cell width on a wide screen; the real one stretches a little to fill the row. */
const TARGET_CELL = 84;
/** A dragged bottom edge within this many rows of a neighbour's bottom jumps to it. */
const SNAP_ROWS = 4;

/**
 * Measured breaking points (22.11.2026, web, every Finance widget stepped from 1 to 8 columns):
 * below these widths amounts get cut ("-2…"), headers break letter by letter, rows spill out.
 * They match the phone: a half-width tile (~158 px there) and a full-width card (~328 px).
 */
export const MIN_HALF = 150;
export const MIN_WIDE = 290;

export interface GridModule extends BoardModule {
  /**
   * Narrowest this widget still looks right at, px — measured: any narrower and its text wraps
   * into a mess or gets cut. The resize handle stops there.
   */
  minWidth?: number;
  /** Lists (tasks, expenses): one block whose height is dragged within these bounds, px; the
   * list scrolls inside. Other widgets take exactly the height of their content. */
  resizableHeight?: { min: number; max: number; initial: number };
  /** False for widgets that can't be removed (habits: un-habit the task instead). */
  removable?: boolean;
  /** Height ÷ width the widget starts at (1 = square: the level ring, habits). */
  aspect?: number;
}

type Saved = Record<string, { x: number; y: number; w: number; h?: number }>;
const EMPTY: Saved = {};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function columnsFor(width: number, proportional: boolean): number {
  if (width < 600) return PHONE_COLUMNS;
  if (proportional) return WIDE_COLUMNS;
  const fit = Math.max(PHONE_COLUMNS, Math.min(WIDE_COLUMNS, Math.floor((width + GRID_GAP) / (TARGET_CELL + GRID_GAP))));
  // Always even, so two half-width widgets fit side by side.
  return fit - (fit % 2);
}

/** Proportional boards: widths are whole shares of the row (¼ ⅓ ½ ⅔ ¾ 1), never odd leftovers.
 * Free boards: any number of columns. */
const widthsFor = (cols: number, proportional: boolean) =>
  proportional && cols === WIDE_COLUMNS ? [3, 4, 6, 8, 9, 12] : range(cols).map((i) => i + 1);
/** Where a widget may start — on proportional boards only at quarters and thirds, so edges line up. */
const startsFor = (cols: number, proportional: boolean) =>
  proportional && cols === WIDE_COLUMNS ? [0, 3, 4, 6, 8, 9] : range(cols);
const nearest = (list: number[], v: number) => list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);

interface Drag {
  key: string;
  mode: 'move' | 'resize';
  /** The widget's box when the drag started, px. */
  left: number;
  top: number;
  width: number;
  height: number;
  tx: number;
  ty: number;
}

/**
 * A screen's widgets on a real grid (phone and PC). Edit mode (the screen's pencil):
 * drag a widget anywhere — what it lands on moves down and everything settles up, no holes; drag
 * the corner handle to change its width (in columns) and height, never below the widget's measured
 * minimum; "−" removes it. Rows come out even: unsized neighbours share the tallest one's height and
 * a dragged edge snaps to its neighbour's. Outside edit mode it's just the layout.
 * Saved per board and per column count, so the phone and a PC window each keep their own.
 */
export function GridBoard({
  boardId,
  modules,
  editing,
  proportional = false,
}: {
  boardId: string;
  modules: GridModule[];
  editing: boolean;
  /** Widths only in shares of the row and every row one even height (Tasks). Off: free widths,
   * only untouched neighbours even out (Finance, Stats, Calendar). */
  proportional?: boolean;
}) {
  const theme = useTheme();
  const tr = useTranslation();
  const [width, setWidth] = useState(0);
  const cols = columnsFor(width, proportional);
  const gridKey = proportional ? `p${cols}` : String(cols);
  const cell = width > 0 ? (width - GRID_GAP * (cols - 1)) / cols : 0;
  // Simple mode: always the default arrangement (the user's own one is kept for the advanced mode).
  const simple = useSettingsStore((s) => s.settings.uiMode === 'simple');
  const ownLayout = useSettingsStore((s) => s.settings.gridLayouts?.[boardId]?.[gridKey]);
  const saved = (simple ? undefined : ownLayout) ?? EMPTY;
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { hidden, hide } = useHiddenModules(boardId);
  // Natural content height of every widget, px, and the width it was measured at (a new width
  // means measuring again — text wraps differently).
  const [natural, setNatural] = useState<Record<string, { h: number; w: number }>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  useEffect(() => {
    if (!editing) return;
    useLayoutEditStore.getState().enter();
    return () => useLayoutEditStore.getState().leave();
  }, [editing]);

  const visible = useMemo(() => modules.filter((m) => !hidden.includes(m.key)), [modules, hidden]);
  const byKey = useMemo(() => new Map(visible.map((m) => [m.key, m])), [visible]);

  // The narrowest proportional width that still holds the widget's measured minimum.
  const minCols = (m: GridModule) => {
    const need = m.minWidth && cell ? colsFor(m.minWidth, cell, GRID_GAP) : 1;
    return widthsFor(cols, proportional).find((w) => w >= need) ?? cols;
  };
  const snapCols = (m: GridModule, raw: number) => {
    const allowed = widthsFor(cols, proportional).filter((w) => w >= minCols(m));
    return nearest(allowed.length ? allowed : [cols], raw);
  };
  // New widgets: on a phone "full" = the whole row, "half" = half of it. On a wider screen
  // everything starts at half that (two wide cards or four tiles per row) — nothing sprawls.
  const defaultCols = (m: GridModule) => {
    const share = cols > PHONE_COLUMNS ? (m.sizes[0] === 'half' ? 4 : 2) : m.sizes[0] === 'half' ? 2 : 1;
    return snapCols(m, Math.round(cols / share));
  };
  // Height barrier: a list's own minimum, or the content's natural height — any lower and it's cut.
  const minRows = (m: GridModule) =>
    m.resizableHeight ? rowsFor(m.resizableHeight.min, GRID_ROW, GRID_GAP) : rowsFor(natural[m.key]?.h ?? 120, GRID_ROW, GRID_GAP);
  const maxRows = (m: GridModule) => (m.resizableHeight ? rowsFor(m.resizableHeight.max, GRID_ROW, GRID_GAP) : Infinity);
  const heightRows = (m: GridModule, h: number | undefined, wCols?: number) => {
    const square = m.aspect && wCols && cell ? rowsFor((wCols * (cell + GRID_GAP) - GRID_GAP) * m.aspect, GRID_ROW, GRID_GAP) : 0;
    const fallback = m.resizableHeight ? rowsFor(m.resizableHeight.initial, GRID_ROW, GRID_GAP) : Math.max(minRows(m), square);
    return Math.min(maxRows(m), Math.max(minRows(m), h ?? fallback));
  };

  // Saved spots (widths held to each widget's minimum, heights from content), new widgets in the
  // first free spot, then gravity.
  const layout = useMemo(() => {
    if (!cell) return [] as GridItem[];
    const items: GridItem[] = [];
    for (const m of visible) {
      const s = saved[m.key];
      if (!s) continue;
      const w = snapCols(m, s.w);
      items.push({ key: m.key, x: nearest(startsFor(cols, proportional), s.x), y: s.y, w, h: heightRows(m, s.h, w) });
    }
    // Nothing arranged yet (a new board, or the simple mode): the tidy default — full rows.
    if (items.length === 0) {
      return evenRows(
        packRows(
          visible.map((m) => {
            const w = defaultCols(m);
            return { key: m.key, w, h: heightRows(m, undefined, w) };
          }),
          cols
        )
      );
    }
    for (const m of visible) {
      if (saved[m.key]) continue;
      const w = defaultCols(m);
      items.push(placeNew(compact(items, cols), m.key, w, heightRows(m, undefined, w), cols));
    }
    return evenRows(compact(items, cols));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, saved, cols, cell, natural]);

  // Even rows, always: widgets that start on the same line share the tallest one's height, so a
  // row's bottom is one straight edge. Lists (tasks, expenses) don't set that height — they stand
  // beside the row like a column, with smaller widgets stacking next to them — but are never
  // shorter than it.
  function evenRows(items: GridItem[]): GridItem[] {
    let out = items;
    for (let pass = 0; pass < 3; pass++) {
      const tallest = new Map<number, number>();
      for (const i of out) {
        if (byKey.get(i.key)?.resizableHeight) continue;
        tallest.set(i.y, Math.max(tallest.get(i.y) ?? 0, i.h));
      }
      out = compact(
        out.map((i) => {
          const m = byKey.get(i.key)!;
          const row = tallest.get(i.y) ?? i.h;
          // Free boards: a widget sized by hand keeps its height; only untouched ones even out.
          if (!proportional && (saved[i.key]?.h != null || m.resizableHeight)) return i;
          return { ...i, h: Math.min(maxRows(m), m.resizableHeight ? Math.max(i.h, row) : row) };
        }),
        cols
      );
    }
    return out;
  }

  const step = cell + GRID_GAP;
  // While dragging: where the widget would land, and everything else already making room for it.
  const layoutFor = (d: Drag | null): GridItem[] => {
    if (!d) return layout;
    const m = byKey.get(d.key);
    const item = layout.find((i) => i.key === d.key);
    if (!m || !item) return layout;
    if (d.mode === 'move') {
      const x = nearest(startsFor(cols, proportional).filter((x0) => x0 + item.w <= cols), (d.left + d.tx) / step);
      const y = Math.max(0, Math.round((d.top + d.ty) / GRID_ROW));
      return evenRows(moveTo(layout, d.key, { x, y }, cols));
    }
    const w = Math.min(snapCols(m, (d.width + d.tx + GRID_GAP) / step), cols);
    const x = item.x + w > cols ? cols - w : item.x;
    let h = heightRows(m, Math.round((d.height + d.ty + GRID_GAP) / GRID_ROW), w);
    // Snap the bottom edge to a neighbour's bottom when it's close — rows line up easily.
    const bottom = item.y + h;
    const near = layout
      .filter((o) => o.key !== d.key)
      .map((o) => o.y + o.h)
      .filter((b) => Math.abs(b - bottom) <= SNAP_ROWS && b - item.y >= minRows(m) && b - item.y <= maxRows(m))
      .sort((a, b) => Math.abs(a - bottom) - Math.abs(b - bottom))[0];
    if (near != null) h = near - item.y;
    // The row follows the widget's new height (shrinking too): neighbours drop to their own size first.
    const row = proportional
      ? layout.map((o) => (o.y === item.y && o.key !== d.key ? { ...o, h: heightRows(byKey.get(o.key)!, undefined, o.w) } : o))
      : layout;
    return evenRows(moveTo(row, d.key, { x, y: item.y, w, h }, cols));
  };
  const preview = layoutFor(drag);

  /** Positions of all; heights only for the row that was just sized by hand (and rows sized before). */
  function save(items: GridItem[], sized?: string) {
    const { settings } = useSettingsStore.getState();
    const rowY = sized ? items.find((i) => i.key === sized)?.y : undefined;
    const next: Saved = {};
    for (const i of items) {
      // Proportional: sizing one sets its whole row. Free: just that widget.
      const sizedNow = proportional ? rowY != null && i.y === rowY : i.key === sized;
      next[i.key] = { x: i.x, y: i.y, w: i.w, h: sizedNow ? i.h : saved[i.key]?.h };
    }
    updateSettings({
      gridLayouts: { ...settings.gridLayouts, [boardId]: { ...(settings.gridLayouts?.[boardId] ?? {}), [gridKey]: next } },
    });
  }

  const boxOf = (i: GridItem) => ({
    left: i.x * step,
    top: i.y * GRID_ROW,
    width: i.w * step - GRID_GAP,
    height: i.h * GRID_ROW - GRID_GAP,
  });

  function gesture(key: string, mode: Drag['mode']) {
    const start = () => {
      const item = layout.find((i) => i.key === key);
      if (!item) return;
      const box = boxOf(item);
      const d: Drag = { key, mode, left: box.left, top: box.top, width: box.width, height: box.height, tx: 0, ty: 0 };
      dragRef.current = d;
      setDrag(d);
      haptics.tap();
    };
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onStart(start)
      .onUpdate((e) => {
        if (!dragRef.current) return;
        const d = { ...dragRef.current, tx: e.translationX, ty: e.translationY };
        dragRef.current = d;
        setDrag(d);
      })
      .onEnd((e) => {
        // The release point counts, not the last move event (those can be sparse).
        if (!dragRef.current) return;
        const d = { ...dragRef.current, tx: e.translationX, ty: e.translationY };
        save(layoutFor(d), d.mode === 'resize' ? d.key : undefined);
        haptics.success();
      })
      .onFinalize(() => {
        dragRef.current = null;
        setDrag(null);
      });
    // Phone: hold first, so a plain swipe still scrolls the screen. Mouse: drag right away.
    return Platform.OS === 'web' ? pan.minDistance(3) : pan.activateAfterLongPress(mode === 'move' ? 220 : 0);
  }

  // Dev-only test hook (web): lets the min-width measurements set widths without dragging.
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as unknown as { __grid?: Record<string, unknown> };
    w.__grid = { ...(w.__grid ?? {}), [boardId]: { cols, cell, layout, natural, reset: () => { const { settings } = useSettingsStore.getState(); updateSettings({ gridLayouts: { ...settings.gridLayouts, [boardId]: {} } }); }, setWidths: (widths: Record<string, number>) => save(layout.map((i) => (widths[i.key] ? { ...i, w: widths[i.key] } : i))) } };
  }

  const height = layoutHeight(preview) * GRID_ROW;

  // Phone width: the familiar board from before the grid — full or half width, each card its own
  // height (the grid's even rows made cards huge on a phone). The grid is for wider screens.

  if (width > 0 && width < 600) {
    return (
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ModuleBoard boardId={boardId} modules={modules} editing={editing} />
      </View>
    );
  }

  return (
    <LayoutEditingContext.Provider value={editing}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: width ? Math.max(0, height - GRID_GAP) : undefined }}>
        {editing && cell ? <ColumnGuides cols={cols} cell={cell} height={Math.max(0, height - GRID_GAP)} color={theme.colors.primary} /> : null}
        {preview.map((item) => {
          const m = byKey.get(item.key);
          if (!m) return null;
          const box = boxOf(item);
          const dragging = drag?.key === item.key;
          // The dragged widget follows the pointer; its landing spot shows as a dashed slot.
          const shown =
            dragging && drag.mode === 'move'
              ? { ...box, left: drag.left + drag.tx, top: drag.top + drag.ty, width: drag.width, height: drag.height }
              : box;
          const size: ModuleSize = box.width < width * 0.6 ? 'half' : 'full';
          return (
            <React.Fragment key={item.key}>
              {dragging ? <View pointerEvents="none" style={[styles.slot, box, { borderColor: theme.colors.primary }]} /> : null}
              <View
                style={[
                  styles.item,
                  shown,
                  dragging && styles.lifted,
                  Platform.OS === 'web' && !dragging ? styles.webGlide : null,
                ]}
              >
                <View
                  style={m.resizableHeight ? styles.fill : styles.natural}
                  onLayout={
                    m.resizableHeight
                      ? undefined
                      : (e) => {
                          // Measured at a new width: that's the natural height. Already stretched to the
                          // box: only taller than the box tells us anything (the content grew).
                          const h = Math.ceil(e.nativeEvent.layout.height);
                          const known = natural[item.key];
                          if (!known || Math.abs(known.w - box.width) > 1 || h > box.height + 1) {
                            if (!known || Math.abs(known.h - h) > 1 || Math.abs(known.w - box.width) > 1) {
                              setNatural((all) => ({ ...all, [item.key]: { h, w: box.width } }));
                            }
                          }
                        }
                  }
                >
                  {/* Cards stretch to the box once its natural height is known (taller rows, user sizes). */}
                  <GridItemContext.Provider value={m.removable === false ? null : { remove: () => hide(item.key) }}>
                    <GridCellContext.Provider
                      value={!m.resizableHeight && natural[item.key] && Math.abs(natural[item.key].w - box.width) <= 1 ? box.height : null}
                    >
                      {m.render(size, box.width)}
                    </GridCellContext.Provider>
                  </GridItemContext.Provider>
                </View>
                {editing ? (
                  <>
                    {/* Covers the widget while editing: a drop never "taps" the card underneath. */}
                    <GestureDetector gesture={gesture(item.key, 'move')}>
                      <View style={[StyleSheet.absoluteFill, styles.grab, { borderColor: theme.colors.primary }]} />
                    </GestureDetector>
                    {m.removable === false ? null : <RemoveModuleButton onPress={() => hide(item.key)} />}
                    <GestureDetector gesture={gesture(item.key, 'resize')}>
                      <View
                        accessibilityLabel={tr.layoutEdit.resize}
                        style={[styles.handle, { backgroundColor: theme.colors.primary }]}
                      >
                        <Ionicons name="resize" size={14} color={theme.colors.primaryText} />
                      </View>
                    </GestureDetector>
                  </>
                ) : null}
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </LayoutEditingContext.Provider>
  );
}

/** Faint column stripes behind the widgets while editing — the grid they snap to. */
function ColumnGuides({ cols, cell, height, color }: { cols: number; cell: number; height: number; color: string }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]}>
      {Array.from({ length: cols }, (_, i) => (
        <View key={i} style={[styles.guide, { left: i * (cell + GRID_GAP), width: cell, backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute' },
  natural: { position: 'absolute', top: 0, left: 0, right: 0 },
  fill: { flex: 1 },
  lifted: { zIndex: 10, opacity: 0.92, transform: [{ scale: 1.02 }] },
  webGlide: { transitionProperty: 'left, top, width, height', transitionDuration: '160ms' } as object,
  slot: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, opacity: 0.6 },
  grab: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 18, opacity: 0.5, cursor: 'grab' } as object,
  guide: { position: 'absolute', top: 0, bottom: 0, opacity: 0.05, borderRadius: 10 },
  handle: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'nwse-resize',
  } as object,
});
