import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { DESIGN_ORDER, DESIGNS, DesignId } from '@/theme/designs';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Screen, SubScreenHeader, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { refreshHomeWidget } from '@/lib/widgetRefresh';

/** Temporary: lets the user try the whole-app designs on the phone and pick one. */
export function DesignSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const current = useSettingsStore((s) => s.settings.designId);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  function select(designId: DesignId) {
    updateSettings({ designId });
    // The home screen widgets follow the design too.
    setTimeout(() => refreshHomeWidget(), 300);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.designs.settingsTitle} />
      <View style={styles.content}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.designs.settingsHint}</Text>
        {DESIGN_ORDER.map((id) => {
          const selected = id === current;
          const palette = theme.dark ? DESIGNS[id].palettes.dark : DESIGNS[id].palettes.light;
          return (
            <Pressable
              key={id}
              onPress={() => select(id)}
              style={[
                styles.option,
                { backgroundColor: theme.colors.surface, borderColor: selected ? theme.colors.accent : theme.colors.border },
              ]}
            >
              <View style={styles.swatches}>
                {[palette.background, palette.surface, palette.primary, palette.accent].map((color, i) => (
                  <View key={i} style={[styles.swatch, { backgroundColor: color, borderColor: theme.colors.border }]} />
                ))}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{tr.designs[id]}</Text>
                <Text style={[styles.optionDescription, { color: theme.colors.textMuted }]}>
                  {tr.designs[`${id}Description` as const]}
                </Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? theme.colors.accent : theme.colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 10 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  swatches: { width: 36, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  swatch: { width: 17, height: 17, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  optionText: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionDescription: { fontSize: 12, lineHeight: 17 },
});
