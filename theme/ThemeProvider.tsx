import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { applyAccent, AppTheme, builtInThemes, vivid } from './theme';
import { DESIGNS } from './designs';
import { resolveLayout } from './layouts';

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
  const layoutId = useSettingsStore((s) => s.settings.layoutId);
  const colorFinish = useSettingsStore((s) => s.settings.colorFinish);
  const layoutOverrides = useSettingsStore((s) => s.settings.layoutOverrides);
  const simple = useSettingsStore((s) => s.settings.uiMode === 'simple');
  const bigText = useSettingsStore((s) => s.settings.bigText);
  const systemScheme = useColorScheme();

  const theme = useMemo<AppTheme>(() => {
    // Simple mode: the plain default look (no gradients, glass or custom layouts), slightly larger
    // text; "Big text" enlarges it further in either mode.
    const chosen = DESIGNS[simple ? 'amber' : designId] ?? DESIGNS.amber;
    const textScale = (simple ? 1.15 : 1) * (bigText ? 1.2 : 1);
    const baseDesign = textScale === 1 ? chosen : { ...chosen, fontScale: chosen.fontScale * textScale };
    const dark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
    const glow = !simple && colorFinish === 'glow';
    // The glow finish: the design's own vivid palettes (or the matte ones made more saturated), its
    // card style (usually glass), a coloured glow and colour blobs behind the screens.
    const g = baseDesign.glow;
    const look = glow ? g : { ...baseDesign.matte, cardStyle: baseDesign.cardStyle };
    const design = glow ? { ...baseDesign, cardStyle: g.cardStyle } : baseDesign;
    const matteColors = dark ? baseDesign.palettes.dark : baseDesign.palettes.light;
    const colors = glow ? (g.palettes ? (dark ? g.palettes.dark : g.palettes.light) : vivid(matteColors, dark)) : matteColors;
    const base: AppTheme = {
      id: `${design.id}-${dark ? 'dark' : 'light'}${glow ? '-glow' : ''}`,
      label: design.id,
      dark,
      colors,
      design,
      layout: simple ? resolveLayout('standard', {}) : resolveLayout(layoutId, layoutOverrides),
      finish: glow ? 'glow' : 'matte',
      glow: look.strength,
      glass: look.glass,
      backdrop: dark ? look.backdrop.dark : look.backdrop.light,
    };
    return applyAccent(base, simple ? null : accentColor);
  }, [themeMode, systemScheme, accentColor, designId, layoutId, colorFinish, layoutOverrides, simple, bigText]);

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
