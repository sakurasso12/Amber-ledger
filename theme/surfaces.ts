import { ViewStyle } from 'react-native';
import type { AppTheme } from './theme';
import { withAlpha } from './theme';
import { cornerStyle, Corners } from './layouts';

/** A card's own corner shape, picked per card in edit mode; absent = whatever the theme does. */
export type CardShape = 'square' | 'rounded' | 'round' | 'leaf';
export const CARD_SHAPES: CardShape[] = ['square', 'rounded', 'round', 'leaf'];
export const SHAPE_CORNERS: Record<CardShape, Corners> = {
  square: { tl: 6, tr: 6, br: 6, bl: 6 },
  rounded: { tl: 16, tr: 16, br: 16, bl: 16 },
  round: { tl: 30, tr: 30, br: 30, bl: 30 },
  leaf: { tl: 40, tr: 6, br: 40, bl: 6 },
};

/** A card's own background, picked from its "⋮" menu; absent = whatever the theme does. */
export type CardBackground = 'glass' | 'shadow' | 'none';

/** Background, border, corner radius and shadow of a card in the active theme + layout. */
export function cardSurface(
  theme: AppTheme,
  shape?: CardShape | null,
  background?: CardBackground | null,
  /** The card's own background opacity 0–1 (null = the theme's). */
  opacity?: number | null
): ViewStyle {
  let base = background ? ownBackground(theme, background) : themeCardSurface(theme);
  if (opacity != null && typeof base.backgroundColor === 'string' && base.backgroundColor.startsWith('#')) {
    base = { ...base, backgroundColor: withAlpha(base.backgroundColor, opacity) };
  }
  const corners = shape ? SHAPE_CORNERS[shape] : theme.layout.corners;
  return corners ? { ...base, ...cornerStyle(corners) } : base;
}

/** Glass: the surface colour see-through, a light edge; the blur itself is a BlurView inside the card
 * (CustomizableCard) — it blurs the screen's gradient or photo behind. */
export function glassSurface(theme: AppTheme): ViewStyle {
  const { colors, glass, design } = theme;
  return {
    backgroundColor: withAlpha(colors.surface, glass.opacity),
    borderRadius: design.radius.card,
    borderWidth: 1,
    borderColor: theme.dark ? `rgba(255,255,255,${glass.highlight})` : `rgba(255,255,255,${Math.min(0.9, glass.highlight * 4)})`,
    overflow: 'hidden',
  };
}

function ownBackground(theme: AppTheme, background: CardBackground): ViewStyle {
  const { design, colors } = theme;
  if (background === 'glass') return glassSurface(theme);
  if (background === 'none') return { backgroundColor: 'transparent', borderRadius: design.radius.card, borderWidth: 0 };
  return {
    backgroundColor: colors.surface,
    borderRadius: design.radius.card,
    borderWidth: 0,
    boxShadow: theme.dark ? `0 8px 24px rgba(0,0,0,0.55)` : `0 6px 18px rgba(20,20,40,0.12)`,
  };
}

function themeCardSurface(theme: AppTheme): ViewStyle {
  const { design, colors } = theme;
  switch (design.cardStyle) {
    case 'glass':
      return glassSurface(theme);
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
  if (design.cardStyle === 'flat') {
    return { borderRadius: design.radius.control, borderWidth: design.borderWidth, borderColor: colors.border };
  }
  return { borderRadius: design.radius.control };
}

/** Shape of the round "+" button: a circle in soft designs, a rounded square in Paper. */
export function fabShape(theme: AppTheme): ViewStyle {
  const { design, colors } = theme;
  if (design.cardStyle === 'flat') return { borderRadius: design.radius.control };
  return {};
}
