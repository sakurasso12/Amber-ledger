import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { fabShape } from '@/theme/surfaces';
import { PressableScale } from './PressableScale';

interface FabProps {
  onPress: () => void;
  onLongPress?: () => void;
  bottom: number;
}

/** The floating "+" button, shaped by the active layout: round or a big ring. */
export function Fab({ onPress, onLongPress, bottom }: FabProps) {
  const theme = useTheme();
  const { colors, layout } = theme;

  const big = layout.fab === 'big';
  return (
    <PressableScale
      scaleTo={0.9}
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
    </PressableScale>
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
});
