import { ViewStyle } from 'react-native';
import type { AppTheme } from './theme';
import { cornerStyle } from './layouts';

/** Background, border, corner radius and shadow of a card in the active theme + layout. */
export function cardSurface(theme: AppTheme): ViewStyle {
  const base = themeCardSurface(theme);
  return theme.layout.corners ? { ...base, ...cornerStyle(theme.layout.corners) } : base;
}

function themeCardSurface(theme: AppTheme): ViewStyle {
  const { design, colors } = theme;
  switch (design.cardStyle) {
    case 'elevated':
      return {
        backgroundColor: colors.surface,
        borderRadius: design.radius.card,
        // On dark backgrounds a shadow is invisible, so a faint glowing edge replaces it.
        borderWidth: theme.dark ? 1 : 0,
        borderColor: `${colors.primary}33`,
        elevation: theme.dark ? 0 : 5,
        shadowColor: '#1B2350',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      };
    case 'flat':
      return {
        backgroundColor: 'transparent',
        borderRadius: design.radius.card,
        borderWidth: 0,
        borderTopWidth: design.borderWidth,
        borderBottomWidth: design.borderWidth,
        borderColor: colors.border,
      };
    case 'brutal':
      return {
        backgroundColor: colors.surface,
        borderRadius: design.radius.card,
        borderWidth: design.borderWidth,
        // A thicker right/bottom edge reads as a hard offset shadow.
        borderRightWidth: design.borderWidth + 3,
        borderBottomWidth: design.borderWidth + 3,
        borderColor: colors.border,
      };
    case 'glow':
      return {
        backgroundColor: colors.surface,
        borderRadius: design.radius.card,
        borderWidth: design.borderWidth,
        borderColor: `${colors.primary}${theme.dark ? '88' : '66'}`,
        // Soft neon halo around the edge.
        boxShadow: `0 0 12px 0 ${colors.primary}${theme.dark ? '55' : '33'}`,
      };
    case 'outlined':
    default:
      return {
        backgroundColor: colors.surface,
        borderRadius: design.radius.card,
        borderWidth: design.borderWidth,
        borderColor: colors.border,
      };
  }
}

/** Border and radius for buttons, inputs, chips and segmented controls. */
export function controlSurface(theme: AppTheme): ViewStyle {
  const { design, colors } = theme;
  if (design.cardStyle === 'brutal') {
    return { borderRadius: design.radius.control, borderWidth: design.borderWidth, borderColor: colors.border };
  }
  if (design.cardStyle === 'flat') {
    return { borderRadius: design.radius.control, borderWidth: design.borderWidth, borderColor: colors.border };
  }
  return { borderRadius: design.radius.control };
}

/** Shape of the round "+" button: a circle in soft designs, a square tile in the sharp ones. */
export function fabShape(theme: AppTheme): ViewStyle {
  const { design, colors } = theme;
  if (design.cardStyle === 'brutal') {
    return {
      borderRadius: design.radius.control,
      borderWidth: design.borderWidth,
      borderRightWidth: design.borderWidth + 3,
      borderBottomWidth: design.borderWidth + 3,
      borderColor: colors.border,
    };
  }
  if (design.cardStyle === 'flat') return { borderRadius: design.radius.control };
  if (design.cardStyle === 'glow') return { boxShadow: `0 0 18px 2px ${colors.primary}88` };
  return {};
}
