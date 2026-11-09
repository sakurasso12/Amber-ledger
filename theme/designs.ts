import type { ThemeColors } from './theme';

/**
 * A design is everything about the app's look besides the light/dark choice: palettes, fonts,
 * text scale, shapes, the tab bar and how key blocks are laid out. Picked in Settings → Тема.
 * Fonts are Android system families, so no font files need to ship with the app.
 *
 * Every design has two finishes (Settings → Тема → Кольори):
 *  - matte: calm colours, ordinary cards;
 *  - glow: vivid colours, glass cards, a coloured glow and a gradient behind the screens.
 * The values come from the theme constructor (design/theme-constructor.html) one to one: the
 * gradients are the same CSS strings, rendered by React Native's experimental_backgroundImage.
 */
export type DesignId = 'crimson' | 'amber' | 'neon' | 'sakura' | 'tropic';

export type CardStyle = 'outlined' | 'elevated' | 'flat' | 'glass';
export type ColorFinish = 'matte' | 'glow';
export type TabBarStyle = 'classic' | 'floating' | 'underline';
export type BalanceLayout = 'columns' | 'hero';
export type FinanceMenuStyle = 'classic' | 'chips';

/** A colour: a palette token ("primary", "accent"…) or its own hex. */
export type ColorRef = keyof ThemeColors | string;

/** One soft colour spot of the screen background, in % of the screen. */
export interface BackdropBlob {
  color: ColorRef;
  x: number;
  y: number;
  /** Radius in % of the screen. */
  size: number;
  /** 0–1 */
  opacity: number;
}

/** What's behind every screen (when no photo is set in Settings → Фон). */
export interface Backdrop {
  mode: 'none' | 'blobs' | 'linear';
  /** A veil of the background colour over it, 0–1. */
  dim: number;
  /** How soft the blobs' edges are, 0–1. */
  soft: number;
  blobs: BackdropBlob[];
  linear: { angle: number; stops: { color: ColorRef; pos: number; opacity: number }[] };
}

export interface FinishLook {
  cardStyle: CardStyle;
  /** Glass cards: surface opacity 0–1, blur 0–100 (expo-blur intensity), edge highlight 0–1. */
  glass: { opacity: number; blur: number; highlight: number };
  /** Coloured glow around the main colour (buttons, "+", active tab, big numbers), 0–1. */
  strength: number;
  /** Its own background for the light and for the dark theme. */
  backdrop: { light: Backdrop; dark: Backdrop };
}

export interface GlowFinish extends FinishLook {
  /** Own vivid palettes; without them the matte ones are made more saturated (theme.ts vivid()). */
  palettes?: { light: ThemeColors; dark: ThemeColors };
}

export interface Design {
  id: DesignId;
  /** Matte palettes. */
  palettes: { light: ThemeColors; dark: ThemeColors };
  fonts: {
    /** undefined = the platform default. */
    regular?: string;
    medium?: string;
    bold?: string;
    /** Screen titles and big numbers (font size ≥ 22). */
    heading?: string;
  };
  /** Multiplier for every font size in the app. */
  fontScale: number;
  /** Extra multiplier on top of fontScale for headings and big numbers. */
  headingScale: number;
  headingLetterSpacing: number;
  /** Small bold labels (≤ 12px, weight ≥ 700) become UPPERCASE with tracking. */
  uppercaseLabels: boolean;
  radius: { card: number; control: number };
  borderWidth: number;
  /** Matte card style. */
  cardStyle: CardStyle;
  cardPadding: number;
  tabBar: TabBarStyle;
  /** The rest of the matte finish (glass/glow/background for when a card or the user asks for them). */
  matte: Omit<FinishLook, 'cardStyle'>;
  glow: GlowFinish;
  /** The finish switched on when the user picks this design. */
  defaultFinish: ColorFinish;
  /** Home screen widget colours (the widget can't follow light/dark, so it gets one palette). */
  widget: { background: string; text: string; textMuted: string; accent: string; danger: string; radius: number };
}

// ---- helpers for the definitions below ---------------------------------------------------------

const NONE: Backdrop = { mode: 'none', dim: 0.2, soft: 0.6, blobs: [], linear: { angle: 160, stops: [] } };
const blob = (color: ColorRef, x: number, y: number, size: number, opacity: number): BackdropBlob => ({ color, x, y, size, opacity });
const blobs = (dim: number, soft: number, list: BackdropBlob[]): Backdrop => ({ mode: 'blobs', dim, soft, blobs: list, linear: { angle: 160, stops: [] } });
const sameBoth = (b: Backdrop) => ({ light: b, dark: b });
const matteDefault = (glass: FinishLook['glass']): Design['matte'] => ({ glass, strength: 0, backdrop: sameBoth(NONE) });

// ---- designs -----------------------------------------------------------------------------------

/** Red night: deep wine blacks and crimson. At its best with the glow finish. */
const crimson: Design = {
  id: 'crimson',
  palettes: {
    light: { background: '#FFF6F7', surface: '#FFFFFF', surfaceAlt: '#F8E6E9', border: '#EDCFD5', text: '#2A0B12', textMuted: '#8A5E67', primary: '#A8233B', primaryText: '#FFFFFF', accent: '#C4566F', success: '#2E8A5E', warning: '#B98419', danger: '#C25A2E', priorityLow: '#2E8A5E', priorityMedium: '#B98419', priorityHigh: '#A8233B' },
    dark: { background: '#0C0507', surface: '#1B0D11', surfaceAlt: '#2A1419', border: '#45222A', text: '#F7E4E8', textMuted: '#B08A92', primary: '#D6455F', primaryText: '#FFFFFF', accent: '#E38A9B', success: '#5BCB94', warning: '#E3B44E', danger: '#E2774E', priorityLow: '#5BCB94', priorityMedium: '#E3B44E', priorityHigh: '#D6455F' },
  },
  fonts: { heading: 'sans-serif-medium' },
  fontScale: 1,
  headingScale: 1.15,
  headingLetterSpacing: -0.4,
  uppercaseLabels: true,
  radius: { card: 22, control: 14 },
  borderWidth: 1,
  cardStyle: 'outlined',
  cardPadding: 16,
  tabBar: 'floating',
  matte: matteDefault({ opacity: 0.5, blur: 40, highlight: 0.12 }),
  glow: {
    palettes: {
      light: { background: '#FFF5F6', surface: '#FFFFFF', surfaceAlt: '#FBE3E7', border: '#F2C5CD', text: '#2A0710', textMuted: '#8E5A64', primary: '#C8102E', primaryText: '#FFFFFF', accent: '#E8456B', success: '#12A86B', warning: '#D99100', danger: '#E2541C', priorityLow: '#12A86B', priorityMedium: '#D99100', priorityHigh: '#C8102E' },
      dark: { background: '#0A0204', surface: '#1A0509', surfaceAlt: '#2A0A10', border: '#4A0F1C', text: '#FFE9EE', textMuted: '#C48A96', primary: '#FF1F4B', primaryText: '#FFFFFF', accent: '#FF8FA3', success: '#2EF2A0', warning: '#FFC23D', danger: '#FF7A45', priorityLow: '#2EF2A0', priorityMedium: '#FFC23D', priorityHigh: '#FF1F4B' },
    },
    cardStyle: 'glass',
    glass: { opacity: 0.42, blur: 55, highlight: 0.14 },
    strength: 0.55,
    backdrop: {
      light: blobs(0.1, 0.75, [blob('primary', 10, 6, 60, 0.3), blob('accent', 100, 55, 45, 0.18)]),
      dark: blobs(0.15, 0.7, [blob('primary', 10, 6, 60, 0.5), blob('accent', 100, 55, 45, 0.25)]),
    },
  },
  defaultFinish: 'glow',
  widget: { background: '#1A0509', text: '#FFE9EE', textMuted: '#C48A96', accent: '#FF1F4B', danger: '#FF7A45', radius: 22 },
};

/** Purple on black / on soft lilac — the light palette follows the dark one, the way Neon's does. */
const amber: Design = {
  id: 'amber',
  palettes: {
    light: { background: '#F4F1FB', surface: '#FFFFFF', surfaceAlt: '#EAE4F7', border: '#DDD4F0', text: '#1A1230', textMuted: '#6E6390', primary: '#7C3AED', primaryText: '#FFFFFF', accent: '#A855F7', success: '#17A673', warning: '#E09B14', danger: '#E5486B', priorityLow: '#17A673', priorityMedium: '#E09B14', priorityHigh: '#E5486B' },
    dark: { background: '#000000', surface: '#120A1F', surfaceAlt: '#1E1030', border: '#3A2158', text: '#F1E9FF', textMuted: '#9B87B8', primary: '#A855F7', primaryText: '#0A0410', accent: '#C084FC', success: '#4ADE80', warning: '#FACC15', danger: '#F87171', priorityLow: '#4ADE80', priorityMedium: '#FACC15', priorityHigh: '#F87171' },
  },
  fonts: {},
  fontScale: 1,
  headingScale: 1,
  headingLetterSpacing: 0,
  uppercaseLabels: false,
  radius: { card: 16, control: 12 },
  borderWidth: 1,
  cardStyle: 'outlined',
  cardPadding: 14,
  tabBar: 'classic',
  matte: matteDefault({ opacity: 0.55, blur: 40, highlight: 0.12 }),
  glow: {
    cardStyle: 'glass',
    glass: { opacity: 0.55, blur: 40, highlight: 0.12 },
    strength: 0.45,
    backdrop: {
      // Made by the user in the constructor: one big light from the top.
      light: blobs(0, 0.8, [blob('primary', 23, 0, 120, 0.62)]),
      dark: blobs(0.2, 0.7, [blob('primary', 0, 0, 55, 0.45), blob('accent', 100, 100, 50, 0.3)]),
    },
  },
  defaultFinish: 'matte',
  widget: { background: '#FFFFFF', text: '#1A1230', textMuted: '#6E6390', accent: '#7C3AED', danger: '#E5486B', radius: 16 },
};

/** Night-city glass: deep navy, cyan/magenta, soft rounded cards floating on shadows. */
const neon: Design = {
  id: 'neon',
  palettes: {
    light: { background: '#EEF1FB', surface: '#FFFFFF', surfaceAlt: '#E3E8F8', border: '#D5DCF2', text: '#141A33', textMuted: '#6B7396', primary: '#5B5BF0', primaryText: '#FFFFFF', accent: '#0BB5D8', success: '#17A673', warning: '#E09B14', danger: '#E5486B', priorityLow: '#17A673', priorityMedium: '#E09B14', priorityHigh: '#E5486B' },
    dark: { background: '#070B1A', surface: '#111833', surfaceAlt: '#1A2347', border: '#25305C', text: '#E8ECFF', textMuted: '#8A93BF', primary: '#22D3EE', primaryText: '#04121A', accent: '#F472D0', success: '#34E3A0', warning: '#FFC857', danger: '#FF5C8A', priorityLow: '#34E3A0', priorityMedium: '#FFC857', priorityHigh: '#FF5C8A' },
  },
  fonts: { regular: 'sans-serif', medium: 'sans-serif-medium', bold: 'sans-serif-medium', heading: 'sans-serif-light' },
  fontScale: 1.06,
  headingScale: 1.25,
  headingLetterSpacing: -0.5,
  uppercaseLabels: true,
  radius: { card: 26, control: 18 },
  borderWidth: 0,
  cardStyle: 'elevated',
  cardPadding: 18,
  tabBar: 'floating',
  matte: matteDefault({ opacity: 0.4, blur: 50, highlight: 0.18 }),
  glow: {
    cardStyle: 'glass',
    glass: { opacity: 0.4, blur: 50, highlight: 0.18 },
    strength: 0.8,
    backdrop: sameBoth(blobs(0.1, 0.65, [blob('primary', 5, 15, 50, 0.45), blob('accent', 95, 75, 50, 0.4)])),
  },
  defaultFinish: 'matte',
  widget: { background: '#111833', text: '#E8ECFF', textMuted: '#8A93BF', accent: '#22D3EE', danger: '#FF5C8A', radius: 26 },
};

/** Sakura: pink on near-black plum / on blush white, lavender accent. */
const sakura: Design = {
  id: 'sakura',
  palettes: {
    light: { background: '#FFF6FA', surface: '#FFFFFF', surfaceAlt: '#FCE4EF', border: '#F4CDE0', text: '#2B0F1F', textMuted: '#8E6178', primary: '#D63384', primaryText: '#FFFFFF', accent: '#9B6CF0', success: '#1F9D6B', warning: '#CC8A0E', danger: '#E04848', priorityLow: '#1F9D6B', priorityMedium: '#CC8A0E', priorityHigh: '#E04848' },
    dark: { background: '#0E070B', surface: '#1C0F17', surfaceAlt: '#2A1622', border: '#43233A', text: '#FCE8F3', textMuted: '#B58FA6', primary: '#F062A8', primaryText: '#1A0612', accent: '#B79CFF', success: '#5ED6A0', warning: '#F2C14E', danger: '#FF6B6B', priorityLow: '#5ED6A0', priorityMedium: '#F2C14E', priorityHigh: '#FF6B6B' },
  },
  fonts: {},
  fontScale: 1,
  headingScale: 1.1,
  headingLetterSpacing: -0.3,
  uppercaseLabels: false,
  radius: { card: 24, control: 16 },
  borderWidth: 1,
  cardStyle: 'outlined',
  cardPadding: 15,
  tabBar: 'floating',
  matte: matteDefault({ opacity: 0.5, blur: 45, highlight: 0.16 }),
  glow: {
    cardStyle: 'glass',
    glass: { opacity: 0.45, blur: 50, highlight: 0.16 },
    strength: 0.5,
    backdrop: {
      light: blobs(0.05, 0.8, [blob('primary', 85, 0, 70, 0.28), blob('accent', 0, 70, 55, 0.2)]),
      // Light sakura pink (not the deeper primary — on near-black that read as wine/red) and lavender.
      dark: blobs(0.12, 0.75, [blob('#FF9BCB', 85, 0, 62, 0.34), blob('accent', 0, 78, 58, 0.34), blob('#FFC9E3', 40, 40, 35, 0.06)]),
    },
  },
  defaultFinish: 'glow',
  widget: { background: '#1C0F17', text: '#FCE8F3', textMuted: '#B58FA6', accent: '#F062A8', danger: '#FF6B6B', radius: 24 },
};

/** Tropic: mint green on deep forest black / on cool mint white, sky-blue accent. */
const tropic: Design = {
  id: 'tropic',
  palettes: {
    light: { background: '#F2FBF7', surface: '#FFFFFF', surfaceAlt: '#E0F3EA', border: '#C9E8DA', text: '#0B2A1F', textMuted: '#5A7F71', primary: '#0F9D6E', primaryText: '#FFFFFF', accent: '#0EA5E9', success: '#16A34A', warning: '#D97706', danger: '#E11D48', priorityLow: '#16A34A', priorityMedium: '#D97706', priorityHigh: '#E11D48' },
    dark: { background: '#03100C', surface: '#0B1C17', surfaceAlt: '#12291F', border: '#1F4236', text: '#E6FFF5', textMuted: '#86B3A2', primary: '#2EE6A6', primaryText: '#032117', accent: '#7DD3FC', success: '#4ADE80', warning: '#FACC15', danger: '#FB7185', priorityLow: '#4ADE80', priorityMedium: '#FACC15', priorityHigh: '#FB7185' },
  },
  fonts: { heading: 'sans-serif-medium' },
  fontScale: 1,
  headingScale: 1.1,
  headingLetterSpacing: -0.3,
  uppercaseLabels: true,
  radius: { card: 18, control: 12 },
  borderWidth: 1,
  cardStyle: 'outlined',
  cardPadding: 15,
  tabBar: 'classic',
  matte: matteDefault({ opacity: 0.5, blur: 45, highlight: 0.14 }),
  glow: {
    cardStyle: 'glass',
    glass: { opacity: 0.45, blur: 50, highlight: 0.14 },
    strength: 0.6,
    backdrop: {
      light: blobs(0.05, 0.8, [blob('primary', 0, 0, 70, 0.25), blob('accent', 100, 100, 55, 0.2)]),
      dark: blobs(0.15, 0.7, [blob('primary', 0, 0, 60, 0.4), blob('accent', 100, 90, 50, 0.3)]),
    },
  },
  defaultFinish: 'glow',
  widget: { background: '#0B1C17', text: '#E6FFF5', textMuted: '#86B3A2', accent: '#2EE6A6', danger: '#FB7185', radius: 18 },
};

export const DESIGNS: Record<DesignId, Design> = { crimson, amber, neon, sakura, tropic };
export const DESIGN_ORDER: DesignId[] = ['crimson', 'amber', 'neon', 'sakura', 'tropic'];
