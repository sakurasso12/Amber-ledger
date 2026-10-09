import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, Screen, SubScreenHeader } from '@/components/ui';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { useTranslation } from '@/i18n';

type WidgetKey = 'AmberLedgerToday' | 'AmberLedgerNextTask' | 'AmberLedgerDayOff' | 'AmberLedgerStreak';

/** Pick a background photo for each home screen widget separately. */
export function HomeWidgetSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  // Previews keep the widgets' real sizes relative to each other: the big one is 4 cells wide,
  // the others 2 (the streak square 1), so they're drawn at full, half and quarter width.
  const widgets: { key: WidgetKey; label: string; width: `${number}%`; aspectRatio: number }[] = [
    { key: 'AmberLedgerToday', label: tr.homeWidgetSettings.big, width: '100%', aspectRatio: 2 },
    { key: 'AmberLedgerNextTask', label: tr.homeWidgetSettings.medium, width: '50%', aspectRatio: 1 },
    { key: 'AmberLedgerDayOff', label: tr.homeWidgetSettings.small, width: '50%', aspectRatio: 2 },
    { key: 'AmberLedgerStreak', label: tr.homeWidgetSettings.streak, width: '25%', aspectRatio: 1 },
  ];

  const uriFor = (key: WidgetKey) =>
    key === 'AmberLedgerToday' ? settings.homeWidgetBackgroundUri : settings.homeWidgetBackgrounds[key] ?? null;

  function save(key: WidgetKey, uri: string | null) {
    if (key === 'AmberLedgerToday') {
      updateSettings({ homeWidgetBackgroundUri: uri });
    } else {
      const next = { ...settings.homeWidgetBackgrounds };
      if (uri) next[key] = uri;
      else delete next[key];
      updateSettings({ homeWidgetBackgrounds: next });
    }
    // Let the settings save before the headless widget renderer reads them.
    setTimeout(() => refreshHomeWidget(), 300);
  }

  async function handlePick(key: WidgetKey) {
    const uri = await pickAndPersistImage();
    if (!uri) return;
    const old = uriFor(key);
    if (old) await deletePersistedImage(old);
    save(key, uri);
  }

  async function handleRemove(key: WidgetKey) {
    const old = uriFor(key);
    if (old) await deletePersistedImage(old);
    save(key, null);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.homeWidgetSettings.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.homeWidgetSettings.hint}</Text>
        {widgets.map(({ key, label, width, aspectRatio }) => {
          const uri = uriFor(key);
          return (
            <View key={key} style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
              {uri ? (
                <Image source={{ uri }} style={[styles.preview, { width, aspectRatio }]} resizeMode="cover" />
              ) : (
                <View style={[styles.preview, styles.placeholder, { width, aspectRatio, borderColor: theme.colors.border }]}>
                  {/* Small previews are only ~80 px tall: an icon plus text that shrinks to fit. */}
                  <Ionicons name="image-outline" size={20} color={theme.colors.textMuted} />
                  <Text
                    style={[styles.placeholderText, { color: theme.colors.textMuted }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {tr.backgroundSettings.notSet}
                  </Text>
                </View>
              )}
              <View style={styles.buttons}>
                <Button
                  title={uri ? tr.backgroundSettings.replace : tr.backgroundSettings.pick}
                  onPress={() => handlePick(key)}
                  style={styles.button}
                />
                {uri ? (
                  <Button title={tr.backgroundSettings.remove} variant="danger" onPress={() => handleRemove(key)} style={styles.button} />
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 22 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  section: { gap: 10 },
  label: { fontSize: 15, fontWeight: '700' },
  preview: { borderRadius: 16, alignSelf: 'center' },
  placeholder: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 },
  placeholderText: { fontSize: 12, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
});
