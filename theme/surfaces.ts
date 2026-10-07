import { ViewStyle } from 'react-native';
import type { AppTheme } from './theme';

/** Background, border, corner radius and shadow of a card in the active design. */
export function cardSurface(theme: AppTheme): ViewStyle {
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
  return {};
}
