import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen, SegmentedControl, SubScreenHeader } from '@/components/ui';
import { ACCENT_SWATCHES } from '@/theme/theme';
import { DESIGN_ORDER, DESIGNS } from '@/theme/designs';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { useTranslation } from '@/i18n';
import { ThemeMode } from '@/types';
import { LayoutId } from '@/theme/layouts';

export function ThemeSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.themeSettings.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SegmentedControl<ThemeMode>
          value={settings.themeMode}
          onChange={(themeMode) => updateSettings({ themeMode })}
          segments={[
            { value: 'light', label: tr.settingsScreen.themeLight },
            { value: 'dark', label: tr.settingsScreen.themeDark },
            { value: 'system', label: tr.settingsScreen.themeSystem },
          ]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.layouts.label}</Text>
        <SegmentedControl<LayoutId>
          value={settings.layoutId}
          onChange={(layoutId) => {
            updateSettings({ layoutId });
            // Home screen widgets take their corner shape from the layout too.
            setTimeout(() => refreshHomeWidget(), 300);
          }}
          segments={[
            { value: 'v3', label: tr.layouts.v3 },
            { value: 'standard', label: tr.layouts.standard },
          ]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.layoutText.styleLabel}</Text>
        {DESIGN_ORDER.map((id) => {
          const selected = id === settings.designId;
          const palette = theme.dark ? DESIGNS[id].palettes.dark : DESIGNS[id].palettes.light;
          return (
            <Pressable
              key={id}
              onPress={() => {
                updateSettings({ designId: id });
                setTimeout(() => refreshHomeWidget(), 300);
              }}
              style={[styles.styleOption, { backgroundColor: theme.colors.surface, borderColor: selected ? theme.colors.accent : theme.colors.border }]}
            >
              <View style={styles.styleSwatches}>
                {[palette.background, palette.surface, palette.primary, palette.accent].map((color, i) => (
                  <View key={i} style={[styles.styleSwatch, { backgroundColor: color, borderColor: theme.colors.border }]} />
                ))}
              </View>
              <View style={styles.styleText}>
                <Text style={[styles.styleTitle, { color: theme.colors.text, fontFamily: DESIGNS[id].fonts.bold }]}>{tr.designs[id]}</Text>
                <Text style={[styles.styleDescription, { color: theme.colors.textMuted }]}>{tr.designs[`${id}Description` as const]}</Text>
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? theme.colors.accent : theme.colors.textMuted} />
            </Pressable>
          );
        })}

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
      </ScrollView>
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
  styleOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
  styleSwatches: { width: 36, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  styleSwatch: { width: 17, height: 17, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  styleText: { flex: 1, gap: 2 },
  styleTitle: { fontSize: 15, fontWeight: '700' },
  styleDescription: { fontSize: 12, lineHeight: 16 },
});
