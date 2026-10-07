/**
 * A layout is *where* things go on every screen — header style, card corners, navigation, how
 * lists are arranged. It's independent of the theme (colours + fonts, see designs.ts), so any
 * layout works with any theme. Picked in Settings → App design.
 */
import type { BalanceLayout, FinanceMenuStyle } from './designs';

export type LayoutId = 'standard' | 'v1' | 'v2' | 'v3';

export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface AppLayout {
  id: LayoutId;
  /** classic: plain title · giant: huge title + accent dot + counter · magazine: date kicker +
   * title with a thick underline · vertical: letters stacked in a rail down the left edge. */
  header: 'classic' | 'giant' | 'magazine' | 'vertical';
  /** Per-corner card radii; null keeps the theme's uniform radius. */
  corners: Corners | null;
  /** null keeps the theme's tab bar; otherwise the layout's own navigation. */
  tabBar: null | 'floating' | 'top' | 'pill';
  tasks: 'rows' | 'sections' | 'timeline' | 'focus';
  expenses: 'rows' | 'tiles' | 'timeline' | 'big';
  stats: 'standard' | 'tiles' | 'list' | 'big';
  settings: 'list' | 'grid' | 'grouped' | 'big';
  fab: 'round' | 'wide' | 'corner' | 'big';
  /** Arrangement of the Bank / Incoming / total card on Finance. */
  balance: BalanceLayout;
  /** How the Recurring / Planned / Categories links on Finance are shown. */
  financeMenu: FinanceMenuStyle;
  /** Corners of the home screen widgets (null = the theme's widget radius). */
  widgetCorners: Corners | null;
}

export const LAYOUTS: Record<LayoutId, AppLayout> = {
  standard: {
    id: 'standard',
    header: 'classic',
    corners: null,
    tabBar: null,
    tasks: 'rows',
    expenses: 'rows',
    stats: 'standard',
    settings: 'list',
    fab: 'round',
    balance: 'columns',
    financeMenu: 'classic',
    widgetCorners: null,
  },
  // Bento: giant titles, cards with diagonal 5/36 corners, sections of tiles, floating pill nav.
  v1: {
    id: 'v1',
    header: 'giant',
    corners: { tl: 5, tr: 36, br: 5, bl: 36 },
    tabBar: 'floating',
    tasks: 'sections',
    expenses: 'tiles',
    stats: 'tiles',
    settings: 'grid',
    fab: 'wide',
    balance: 'blocks',
    financeMenu: 'tiles',
    widgetCorners: { tl: 6, tr: 40, br: 6, bl: 40 },
  },
  // Feed: magazine headers, speech-bubble cards, everything as a dated timeline, text tabs on top.
  v2: {
    id: 'v2',
    header: 'magazine',
    corners: { tl: 22, tr: 22, br: 22, bl: 4 },
    tabBar: 'top',
    tasks: 'timeline',
    expenses: 'timeline',
    stats: 'list',
    settings: 'grouped',
    fab: 'corner',
    balance: 'ledger',
    financeMenu: 'sheet',
    widgetCorners: { tl: 28, tr: 28, br: 28, bl: 4 },
  },
  // Vertical: titles spelled down a left rail, leaf-shaped cards, one task in focus, expanding pill nav.
  v3: {
    id: 'v3',
    header: 'vertical',
    corners: { tl: 40, tr: 6, br: 40, bl: 6 },
    tabBar: 'pill',
    tasks: 'focus',
    expenses: 'big',
    stats: 'big',
    settings: 'big',
    fab: 'big',
    balance: 'hero',
    financeMenu: 'chips',
    widgetCorners: { tl: 44, tr: 8, br: 44, bl: 8 },
  },
};

export const LAYOUT_ORDER: LayoutId[] = ['standard', 'v1', 'v2', 'v3'];

/** Style object for per-corner radii. */
export function cornerStyle(c: Corners) {
  return {
    borderTopLeftRadius: c.tl,
    borderTopRightRadius: c.tr,
    borderBottomRightRadius: c.br,
    borderBottomLeftRadius: c.bl,
  };
}
