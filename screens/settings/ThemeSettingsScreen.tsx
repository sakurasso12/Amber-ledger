import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen, SegmentedControl, SubScreenHeader } from '@/components/ui';
import { ACCENT_SWATCHES } from '@/theme/theme';
import { useTranslation } from '@/i18n';
import { ThemeMode } from '@/types';

export function ThemeSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.themeSettings.title} />
      <View style={styles.content}>
        <SegmentedControl<ThemeMode>
          value={settings.themeMode}
          onChange={(themeMode) => updateSettings({ themeMode })}
          segments={[
            { value: 'light', label: tr.settingsScreen.themeLight },
            { value: 'dark', label: tr.settingsScreen.themeDark },
            { value: 'system', label: tr.settingsScreen.themeSystem },
          ]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.themeSettings.accentLabel}</Text>
        <View style={styles.swatchRow}>
          <Pressable
            onPress={() => updateSettings({ accentColor: null })}
            style={[
              styles.swatch,
              styles.resetSwatch,
              { borderColor: theme.colors.border },
              !settings.accentColor && { borderColor: theme.colors.text, borderWidth: 2 },
            ]}
          >
            <Ionicons name="close" size={16} color={theme.colors.textMuted} />
          </Pressable>
          {ACCENT_SWATCHES.map((color) => (
            <Pressable
              key={color}
              onPress={() => updateSettings({ accentColor: color })}
              style={[styles.swatch, { backgroundColor: color }, settings.accentColor === color && styles.swatchActive]}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1 },
  resetSwatch: { alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderWidth: 3, borderColor: '#fff' },
});
