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
}

export const lightTheme: AppTheme = {
  id: 'light',
  label: 'Светлая',
  dark: false,
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
