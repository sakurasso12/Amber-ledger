import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Small numeric badge — used on tab icons and filter toggles. Caps the displayed value at 99+. */
export function Badge({ count, color }: { count: number; color?: string }) {
  const theme = useTheme();
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: color ?? theme.colors.danger }]}>
      <Text style={styles.text} numberOfLines={1}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
