import React from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { Design } from '@/theme/designs';

/** Font sizes from this size up count as headings / big numbers (screen titles, balances). */
const HEADING_MIN_SIZE = 22;
const DEFAULT_SIZE = 14;

function isBoldWeight(weight: TextStyle['fontWeight']): boolean {
  return weight === 'bold' || (typeof weight === 'string' && Number(weight) >= 700) || (typeof weight === 'number' && weight >= 700);
}

function isMediumWeight(weight: TextStyle['fontWeight']): boolean {
  return (typeof weight === 'string' && (weight === '500' || weight === '600')) || weight === 500 || weight === 600;
}

/** Applies the active design's fonts, text scale and label style on top of a plain text style. */
export function designTextStyle(style: TextStyle, design: Design): TextStyle {
  // Nested <Text> without its own size/weight must inherit from its parent, so leave it alone.
  if (style.fontSize === undefined && style.fontWeight === undefined) return {};

  const size = style.fontSize ?? DEFAULT_SIZE;
  const heading = size >= HEADING_MIN_SIZE;
  const bold = isBoldWeight(style.fontWeight);

  const out: TextStyle = {};
  if (style.fontSize !== undefined) {
    out.fontSize = Math.round(size * design.fontScale * (heading ? design.headingScale : 1) * 10) / 10;
  }
  if (style.lineHeight) out.lineHeight = Math.round(style.lineHeight * design.fontScale * (heading ? design.headingScale : 1));

  if (!style.fontFamily) {
    const family = heading
      ? design.fonts.heading ?? design.fonts.bold
      : bold
        ? design.fonts.bold
        : isMediumWeight(style.fontWeight)
          ? design.fonts.medium
          : design.fonts.regular;
    if (family) out.fontFamily = family;
  }
  if (heading && style.letterSpacing === undefined && design.headingLetterSpacing) {
    out.letterSpacing = design.headingLetterSpacing;
  }
  if (design.uppercaseLabels && !heading && size <= 12 && bold && !style.textTransform) {
    out.textTransform = 'uppercase';
    out.letterSpacing = style.letterSpacing ?? 0.6;
  }
  return out;
}

/** Drop-in replacement for React Native's Text that follows the active design (theme/designs.ts). */
export function Text({ style, ...props }: TextProps) {
  const { design } = useTheme();
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  return <RNText {...props} style={[flat, designTextStyle(flat, design)]} />;
}
