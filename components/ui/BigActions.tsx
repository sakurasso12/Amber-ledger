import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';

export interface BigAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

/**
 * Simple mode's big, labelled buttons fixed at the bottom ("− Витрата · + Дохід", "Додати справу")
 * in place of the round "+": nobody has to guess what a bare plus does.
 */
export function BigActions({ actions, bottom }: { actions: BigAction[]; bottom: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { bottom }]} pointerEvents="box-none">
      {actions.map((a) => (
        <Pressable
          key={a.label}
          onPress={() => {
            haptics.tap();
            a.onPress();
          }}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: a.color ?? theme.colors.primary }]}
        >
          <Ionicons name={a.icon} size={24} color="#fff" />
          <Text style={styles.label}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
