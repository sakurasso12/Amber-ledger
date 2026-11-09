/**
 * A layout is *where* things go on every screen — header style, card corners, navigation, how
 * lists are arranged. It's independent of the theme (colours + fonts, see designs.ts), so any
 * layout works with any theme. Picked in Settings → App design.
 */
import type { BalanceLayout, FinanceMenuStyle } from './designs';

export type LayoutId = 'standard' | 'v3';

/** Bottom navigation: a floating bubble, the expanding pill, a full-width strip, or an underline. */
export type MenuStyle = 'bubble' | 'pill' | 'classic' | 'underline';

export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface AppLayout {
  id: LayoutId;
  /** classic: plain title · vertical: letters stacked in a rail down the left edge. */
  header: 'classic' | 'vertical';
  /** Per-corner card radii; null keeps the theme's uniform radius. */
  corners: Corners | null;
  /** null keeps the theme's tab bar; otherwise the layout's own navigation. (Derived from `menu`.) */
  tabBar: null | 'pill';
  menu: MenuStyle;
  /** A background under the menu (the bubble's fill / the strip's colour); off = icons right on the screen. */
  menuPlate: boolean;
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
    menu: 'bubble',
    menuPlate: true,
    tasks: 'focus',
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
    menu: 'pill',
    menuPlate: true,
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

export const LAYOUT_ORDER: LayoutId[] = ['standard', 'v3'];

/** Style object for per-corner radii. */
export function cornerStyle(c: Corners) {
  return {
    borderTopLeftRadius: c.tl,
    borderTopRightRadius: c.tr,
    borderBottomRightRadius: c.br,
    borderBottomLeftRadius: c.bl,
  };
}

/** The leaf corners of the Vertical preset, for any layout that wants them. */
export const LEAF_CORNERS: Corners = { tl: 40, tr: 6, br: 40, bl: 6 };

/** What can be tuned on top of a preset (Settings → Тема → Розташування). */
export type LayoutOverrides = Partial<
  Pick<AppLayout, 'header' | 'menu' | 'menuPlate' | 'tasks' | 'expenses' | 'stats' | 'settings' | 'fab' | 'balance' | 'financeMenu'>
> & { leafCorners?: boolean };

/** A preset with the user's own changes on top. */
export function resolveLayout(id: LayoutId, overrides: LayoutOverrides | undefined): AppLayout {
  const base = LAYOUTS[id] ?? LAYOUTS.standard;
  const { leafCorners, ...rest } = overrides ?? {};
  const merged: AppLayout = { ...base, ...rest };
  if (leafCorners !== undefined) merged.corners = leafCorners ? LEAF_CORNERS : null;
  merged.tabBar = merged.menu === 'pill' ? 'pill' : null;
  return merged;
}
