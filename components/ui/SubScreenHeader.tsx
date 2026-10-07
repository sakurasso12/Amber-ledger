import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export function SubScreenHeader({ title }: { title: string }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} hitSlop={10}>
        <Text style={{ color: theme.colors.accent, fontSize: 22 }}>‹</Text>
      </Pressable>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  spacer: { width: 22 },
});
