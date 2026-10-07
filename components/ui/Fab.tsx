import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { fabShape } from '@/theme/surfaces';
import { cornerStyle } from '@/theme/layouts';
import { Text } from './Text';

interface FabProps {
  onPress: () => void;
  onLongPress?: () => void;
  /** Text for the wide variant, e.g. "Добавить". */
  label: string;
  bottom: number;
}

/** The floating "+" button, shaped by the active layout: round, wide pill, corner tile or big ring. */
export function Fab({ onPress, onLongPress, label, bottom }: FabProps) {
  const theme = useTheme();
  const { colors, layout } = theme;

  if (layout.fab === 'wide') {
    return (
      <View pointerEvents="box-none" style={[styles.wideWrap, { bottom }]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          style={[styles.wide, { backgroundColor: colors.primary }, fabShape(theme), layout.corners && cornerStyle(layout.corners)]}
        >
          <Ionicons name="add" size={22} color={colors.primaryText} />
          <Text style={[styles.wideText, { color: colors.primaryText }]}>{label}</Text>
        </Pressable>
      </View>
    );
  }

  if (layout.fab === 'corner') {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={[
          styles.base,
          styles.corner,
          { backgroundColor: colors.primary, bottom },
          fabShape(theme),
          layout.corners && cornerStyle(layout.corners),
        ]}
      >
        <Ionicons name="add" size={28} color={colors.primaryText} />
      </Pressable>
    );
  }

  const big = layout.fab === 'big';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.base,
        styles.round,
        big && { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: `${colors.primary}55` },
        { backgroundColor: colors.primary, bottom },
        fabShape(theme),
      ]}
    >
      <Ionicons name="add" size={big ? 34 : 28} color={colors.primaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  round: { right: 20, width: 56, height: 56, borderRadius: 28 },
  corner: { left: 20, width: 58, height: 58, borderRadius: 8 },
  wideWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 26,
    height: 52,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  wideText: { fontSize: 16, fontWeight: '700' },
});
