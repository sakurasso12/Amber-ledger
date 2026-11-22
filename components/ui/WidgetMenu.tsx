import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface WidgetMenuProps {
  /** Opens the card's look sheet (background incl. own photo, opacity, shape). */
  onPress: () => void;
  tint?: 'light' | 'dark';
}

/** The "⋮" button in a card's corner — straight to "Card look"; everything about the card is there. */
export function WidgetMenu({ onPress, tint }: WidgetMenuProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const dotColor = tint === 'light' ? '#FFFFFF' : theme.colors.textMuted;
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.trigger} accessibilityLabel={tr.cardShape.menu}>
      <Text style={[styles.dots, { color: dotColor }]}>⋮</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: { padding: 4 },
  dots: { fontSize: 18, fontWeight: '700' },
});
