import type { Backdrop, CardStyle, ColorFinish, ColorRef, Design } from './designs';
import type { AppLayout } from './layouts';
import { LAYOUTS } from './layouts';
import { DESIGNS } from './designs';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  priorityLow: string;
  priorityMedium: string;
  priorityHigh: string;
}

export interface AppTheme {
  id: string;
  label: string;
  dark: boolean;
  colors: ThemeColors;
  /** Colours, fonts and shapes — see designs.ts ("Тема" in settings). */
  design: Design;
  /** Where things go on every screen — see layouts.ts ("Дизайн приложения" in settings). */
  layout: AppLayout;
  /** Settings → Тема → Кольори. With 'glow' the design's glow finish is applied (see ThemeProvider). */
  finish: ColorFinish;
  /** Coloured glow strength, 0 = none (matte). */
  glow: number;
  /** Glass cards: surface opacity, blur intensity, edge highlight (used when a card is glass). */
  glass: { opacity: number; blur: number; highlight: number };
  /** The gradient behind the screens for this finish and mode (when no photo is set in Settings → Фон). */
  backdrop: Backdrop;
}

const NO_BACKDROP: Backdrop = { mode: 'none', dim: 0, soft: 0, blobs: [], linear: { angle: 0, stops: [] } };
const MATTE_EXTRAS = { finish: 'matte' as const, glow: 0, glass: { opacity: 0.5, blur: 40, highlight: 0.12 }, backdrop: NO_BACKDROP };

export const lightTheme: AppTheme = {
  id: 'light',
  label: 'Светлая',
  dark: false,
  design: DESIGNS.amber,
  layout: LAYOUTS.standard,
  ...MATTE_EXTRAS,
  colors: {
    background: '#FBF7F1',
    surface: '#FFFFFF',
    surfaceAlt: '#F1E9DD',
    border: '#E4D8C6',
    text: '#241C13',
    textMuted: '#8A7A64',
    primary: '#B9702E',
    primaryText: '#FFFFFF',
    accent: '#D98E3B',
    success: '#3E8F5C',
    warning: '#C98A1E',
    danger: '#C1502E',
    priorityLow: '#5A8F6B',
    priorityMedium: '#C98A1E',
    priorityHigh: '#C1502E',
  },
};

export const darkTheme: AppTheme = {
  id: 'dark',
  label: 'Тёмная',
  dark: true,
  design: DESIGNS.amber,
  layout: LAYOUTS.standard,
  ...MATTE_EXTRAS,
  colors: {
    background: '#000000',
    surface: '#120A1F',
    surfaceAlt: '#1E1030',
    border: '#3A2158',
    text: '#F1E9FF',
    textMuted: '#9B87B8',
    primary: '#A855F7',
    primaryText: '#0A0410',
    accent: '#C084FC',
    success: '#4ADE80',
    warning: '#FACC15',
    danger: '#F87171',
    priorityLow: '#4ADE80',
    priorityMedium: '#FACC15',
    priorityHigh: '#F87171',
  },
};

export const builtInThemes: AppTheme[] = [lightTheme, darkTheme];

export function priorityColor(theme: AppTheme, priority: 'low' | 'medium' | 'high'): string {
  if (priority === 'low') return theme.colors.priorityLow;
  if (priority === 'medium') return theme.colors.priorityMedium;
  return theme.colors.priorityHigh;
}

/** Swatches offered in Settings → Тема for the custom accent color — recolors `primary`/`accent`
 * on top of whichever base (light/dark) is active, rather than being a whole separate theme. */
export const ACCENT_SWATCHES = [
  '#B9702E', // amber (light theme default)
  '#A855F7', // purple (dark theme default)
  '#3E7FB8', // blue
  '#3E8F5C', // green
  '#2E8B8B', // teal
  '#C1502E', // rust
  '#C98A1E', // gold
  '#D9467D', // pink
];

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** Overrides `primary`/`accent` with a custom color, computing a readable `primaryText` for it.
 * `accent: null` leaves the base theme's own colors untouched. */
export function applyAccent(theme: AppTheme, accent: string | null): AppTheme {
  if (!accent) return theme;
  return {
    ...theme,
    colors: {
      ...theme.colors,
      primary: accent,
      accent,
      primaryText: isLightColor(accent) ? '#1A1310' : '#FFFFFF',
    },
  };
}

// ---- Glow finish helpers ------------------------------------------------------------------------

function hexToHsl(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

/** The "colour" tokens of a palette made more saturated (and a touch brighter on dark) — the glow
 * finish of a design that has no vivid palettes of its own. Backgrounds and text stay as they are. */
export function vivid(colors: ThemeColors, dark: boolean): ThemeColors {
  const boost = (hex: string) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, Math.min(100, s + 22), dark ? Math.min(78, l + 4) : l);
  };
  return {
    ...colors,
    primary: boost(colors.primary),
    accent: boost(colors.accent),
    success: boost(colors.success),
    warning: boost(colors.warning),
    danger: boost(colors.danger),
    priorityLow: boost(colors.priorityLow),
    priorityMedium: boost(colors.priorityMedium),
    priorityHigh: boost(colors.priorityHigh),
  };
}

/** `#RRGGBB` + alpha 0–1 → `#RRGGBBAA`. */
export function withAlpha(hex: string, alpha: number): string {
  return `${hex.slice(0, 7)}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')}`;
}

/** Glow around something in the main colour (buttons, "+", the active tab) — empty when matte. */
export function glowShadow(theme: AppTheme, color: string = theme.colors.primary): { boxShadow?: string } {
  if (theme.glow <= 0) return {};
  return { boxShadow: `0 0 ${Math.round(28 * theme.glow)}px ${withAlpha(color, theme.dark ? 0.75 : 0.45)}` };
}

/** Glowing big numbers on dark backgrounds (sums, levels). */
export function glowText(theme: AppTheme, color: string) {
  if (theme.glow <= 0 || !theme.dark) return {};
  return { textShadowColor: withAlpha(color, 0.7), textShadowRadius: Math.round(18 * theme.glow), textShadowOffset: { width: 0, height: 0 } };
}

export type { CardStyle };

// ---- Screen background (same CSS as the theme constructor) -------------------------------------

function rgbaOf(hex: string, a: number): string {
  const c = hex.replace('#', '');
  return `rgba(${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}, ${a})`;
}

/** A palette token or a hex → hex. */
export function resolveColor(theme: AppTheme, ref: ColorRef): string {
  return ref.startsWith('#') ? ref : (theme.colors as unknown as Record<string, string>)[ref] ?? theme.colors.primary;
}

/**
 * The backdrop as a CSS background-image string for experimental_backgroundImage (the base colour
 * is the view's own backgroundColor), or null when there's none. Written exactly like the
 * constructor's backdropCss(), so what's designed there is what the phone draws.
 */
export function backdropImage(theme: AppTheme): string | null {
  const b = theme.backdrop;
  if (b.mode === 'blobs' && b.blobs.length) {
    return b.blobs
      .map((bl) => {
        const c = resolveColor(theme, bl.color);
        const inner = Math.round(bl.size * (1 - b.soft));
        return `radial-gradient(circle at ${bl.x}% ${bl.y}%, ${rgbaOf(c, bl.opacity)} ${inner}%, ${rgbaOf(c, 0)} ${bl.size}%)`;
      })
      .join(', ');
  }
  if (b.mode === 'linear' && b.linear.stops.length > 1) {
    return `linear-gradient(${b.linear.angle}deg, ${b.linear.stops.map((s) => `${rgbaOf(resolveColor(theme, s.color), s.opacity)} ${s.pos}%`).join(', ')})`;
  }
  return null;
}

export { rgbaOf };
