import type { ThemeColors } from './theme';

/**
 * A design is everything about the app's look besides the light/dark choice: palettes, fonts,
 * text scale, shapes, the tab bar and how key blocks are laid out. Picked in Settings → design.
 * Fonts are Android system families, so no font files need to ship with the app.
 */
export type DesignId = 'amber' | 'neon' | 'paper' | 'bold';

export type CardStyle = 'outlined' | 'elevated' | 'flat' | 'brutal';
export type TabBarStyle = 'classic' | 'floating' | 'underline' | 'blocks';
export type BalanceLayout = 'columns' | 'hero';
export type FinanceMenuStyle = 'classic' | 'chips';

export interface Design {
  id: DesignId;
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
  cardStyle: CardStyle;
  cardPadding: number;
  tabBar: TabBarStyle;
  /** Home screen widget colours (the widget can't follow light/dark, so it gets one palette). */
  widget: { background: string; text: string; textMuted: string; accent: string; danger: string; radius: number };
}

const amber: Design = {
  id: 'amber',
  palettes: {
    light: {
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
    dark: {
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
  widget: { background: '#FFFFFF', text: '#241C13', textMuted: '#8A7A64', accent: '#B9702E', danger: '#C1502E', radius: 16 },
};

/** Night-city glass: deep navy, cyan/magenta glow, soft rounded cards floating on shadows. */
const neon: Design = {
  id: 'neon',
  palettes: {
    light: {
      background: '#EEF1FB',
      surface: '#FFFFFF',
      surfaceAlt: '#E3E8F8',
      border: '#D5DCF2',
      text: '#141A33',
      textMuted: '#6B7396',
      primary: '#5B5BF0',
      primaryText: '#FFFFFF',
      accent: '#0BB5D8',
      success: '#17A673',
      warning: '#E09B14',
      danger: '#E5486B',
      priorityLow: '#17A673',
      priorityMedium: '#E09B14',
      priorityHigh: '#E5486B',
    },
    dark: {
      background: '#070B1A',
      surface: '#111833',
      surfaceAlt: '#1A2347',
      border: '#25305C',
      text: '#E8ECFF',
      textMuted: '#8A93BF',
      primary: '#22D3EE',
      primaryText: '#04121A',
      accent: '#F472D0',
      success: '#34E3A0',
      warning: '#FFC857',
      danger: '#FF5C8A',
      priorityLow: '#34E3A0',
      priorityMedium: '#FFC857',
      priorityHigh: '#FF5C8A',
    },
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
  widget: { background: '#111833', text: '#E8ECFF', textMuted: '#8A93BF', accent: '#22D3EE', danger: '#FF5C8A', radius: 26 },
};

/** Editorial notebook: serif type, warm paper, ink lines instead of boxes, nothing rounded. */
const paper: Design = {
  id: 'paper',
  palettes: {
    light: {
      background: '#FFFDF7',
      surface: '#FFFFFF',
      surfaceAlt: '#F6EEDD',
      border: '#1A1611',
      text: '#14110D',
      textMuted: '#5C5346',
      primary: '#C2361F',
      primaryText: '#FFFDF7',
      accent: '#1F5FBF',
      success: '#2E7D45',
      warning: '#C7820E',
      danger: '#C2361F',
      priorityLow: '#2E7D45',
      priorityMedium: '#C7820E',
      priorityHigh: '#C2361F',
    },
    dark: {
      background: '#14120E',
      surface: '#1D1A15',
      surfaceAlt: '#29241C',
      border: '#F2E8D5',
      text: '#FAF4E8',
      textMuted: '#B8AC96',
      primary: '#FF7A59',
      primaryText: '#14120E',
      accent: '#7FB2FF',
      success: '#7FD18B',
      warning: '#FFC65C',
      danger: '#FF7A59',
      priorityLow: '#7FD18B',
      priorityMedium: '#FFC65C',
      priorityHigh: '#FF7A59',
    },
  },
  fonts: { regular: 'serif', medium: 'serif', bold: 'serif', heading: 'serif' },
  fontScale: 1.08,
  headingScale: 1.2,
  headingLetterSpacing: -0.3,
  uppercaseLabels: true,
  radius: { card: 2, control: 2 },
  borderWidth: 1,
  cardStyle: 'flat',
  cardPadding: 14,
  tabBar: 'underline',
  widget: { background: '#FFFDF7', text: '#14110D', textMuted: '#5C5346', accent: '#C2361F', danger: '#C2361F', radius: 4 },
};

/** Loud and chunky: condensed bold type, thick black outlines with a hard offset shadow, acid accents. */
const bold: Design = {
  id: 'bold',
  palettes: {
    light: {
      background: '#FFF8E1',
      surface: '#FFFFFF',
      surfaceAlt: '#FFE98A',
      border: '#111111',
      text: '#111111',
      textMuted: '#4A4A4A',
      primary: '#111111',
      primaryText: '#FFE14D',
      accent: '#FF4F1F',
      success: '#0E9F4F',
      warning: '#E0A100',
      danger: '#E8261C',
      priorityLow: '#0E9F4F',
      priorityMedium: '#E0A100',
      priorityHigh: '#E8261C',
    },
    dark: {
      background: '#0B0B0B',
      surface: '#161616',
      surfaceAlt: '#232323',
      border: '#C6FF3D',
      text: '#F5F5F5',
      textMuted: '#A8A8A8',
      primary: '#C6FF3D',
      primaryText: '#0B0B0B',
      accent: '#FF5FA2',
      success: '#C6FF3D',
      warning: '#FFD23F',
      danger: '#FF4D4D',
      priorityLow: '#C6FF3D',
      priorityMedium: '#FFD23F',
      priorityHigh: '#FF4D4D',
    },
  },
  fonts: { regular: 'sans-serif-condensed', medium: 'sans-serif-condensed', bold: 'sans-serif-condensed', heading: 'sans-serif-condensed' },
  fontScale: 1.12,
  headingScale: 1.3,
  headingLetterSpacing: 0.4,
  uppercaseLabels: true,
  radius: { card: 4, control: 4 },
  borderWidth: 2.5,
  cardStyle: 'brutal',
  cardPadding: 16,
  tabBar: 'blocks',
  widget: { background: '#FFE14D', text: '#111111', textMuted: '#3A3A3A', accent: '#111111', danger: '#E8261C', radius: 6 },
};

export const DESIGNS: Record<DesignId, Design> = { amber, neon, paper, bold };
export const DESIGN_ORDER: DesignId[] = ['amber', 'neon', 'paper', 'bold'];
