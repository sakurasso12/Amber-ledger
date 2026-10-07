/**
 * A layout is *where* things go on every screen — header style, card corners, navigation, how
 * lists are arranged. It's independent of the theme (colours + fonts, see designs.ts), so any
 * layout works with any theme. Picked in Settings → App design.
 */
import type { BalanceLayout, FinanceMenuStyle } from './designs';

export type LayoutId = 'standard' | 'v3' | 'glow';

export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface AppLayout {
  id: LayoutId;
  /** classic: plain title · accent: big glowing title in the accent colour · vertical: letters
   * stacked in a rail down the left edge. */
  header: 'classic' | 'accent' | 'vertical';
  /** Per-corner card radii; null keeps the theme's uniform radius. */
  corners: Corners | null;
  /** null keeps the theme's tab bar; otherwise the layout's own navigation. */
  tabBar: null | 'pill';
  tasks: 'rows' | 'focus';
  expenses: 'rows' | 'big';
  stats: 'standard' | 'big';
  settings: 'list' | 'big';
  fab: 'round' | 'big';
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
  // Glow: the plum/pink neon mockups — big glowing pink titles, plain lists, cards with a soft
  // neon edge (the glow itself comes from the Plum theme, which picking this layout switches to).
  glow: {
    id: 'glow',
    header: 'accent',
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
};

export const LAYOUT_ORDER: LayoutId[] = ['standard', 'v3', 'glow'];

/** Style object for per-corner radii. */
export function cornerStyle(c: Corners) {
  return {
    borderTopLeftRadius: c.tl,
    borderTopRightRadius: c.tr,
    borderBottomRightRadius: c.br,
    borderBottomLeftRadius: c.bl,
  };
}
