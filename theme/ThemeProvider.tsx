import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { applyAccent, AppTheme, builtInThemes } from './theme';
import { DESIGNS } from './designs';

interface ThemeContextValue {
  theme: AppTheme;
  availableThemes: AppTheme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Themes are plain data objects (see theme.ts). Adding a custom theme later
 * only means appending it to `builtInThemes` (or loading it from storage) —
 * no component needs to change, since everything reads colors through useTheme().
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useSettingsStore((s) => s.settings.themeMode);
  const accentColor = useSettingsStore((s) => s.settings.accentColor);
  const designId = useSettingsStore((s) => s.settings.designId);
  const systemScheme = useColorScheme();

  const theme = useMemo<AppTheme>(() => {
    const design = DESIGNS[designId] ?? DESIGNS.amber;
    const dark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
    const base: AppTheme = {
      id: `${design.id}-${dark ? 'dark' : 'light'}`,
      label: design.id,
      dark,
      colors: dark ? design.palettes.dark : design.palettes.light,
      design,
    };
    return applyAccent(base, accentColor);
  }, [themeMode, systemScheme, accentColor, designId]);

  const value = useMemo(() => ({ theme, availableThemes: builtInThemes }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
}

export function useAvailableThemes(): AppTheme[] {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAvailableThemes must be used within a ThemeProvider');
  return ctx.availableThemes;
}
