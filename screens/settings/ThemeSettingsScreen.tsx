import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, Screen, SegmentedControl, SubScreenHeader } from '@/components/ui';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { ACCENT_SWATCHES } from '@/theme/theme';
import { ColorFinish, DESIGN_ORDER, DESIGNS } from '@/theme/designs';
import { vivid } from '@/theme/theme';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { useTranslation } from '@/i18n';
import { ThemeMode } from '@/types';
import { LayoutId, LayoutOverrides, resolveLayout } from '@/theme/layouts';
import { ColorWheel } from '@/components/ui/ColorWheel';

export function ThemeSettingsScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  // Layout: a preset (Standard / Vertical) plus the user's own changes on top of it.
  const layout = resolveLayout(settings.layoutId, settings.layoutOverrides);
  const L = tr.layoutCustom;
  function setPreset(layoutId: LayoutId) {
    updateSettings({ layoutId, layoutOverrides: {} });
    setTimeout(() => refreshHomeWidget(), 300);
  }
  function override<K extends keyof LayoutOverrides>(key: K, value: LayoutOverrides[K]) {
    updateSettings({ layoutOverrides: { ...settings.layoutOverrides, [key]: value } });
  }
  const leaf = !!layout.corners;
  function option<T extends string>(label: string, hint: string, value: T, segments: { value: T; label: string }[], onChange: (v: T) => void) {
    return (
      <View key={label} style={styles.option}>
        <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.optionHint, { color: theme.colors.textMuted }]}>{hint}</Text>
        <SegmentedControl<T> compact value={value} onChange={onChange} segments={segments} />
      </View>
    );
  }
  const [layoutOpen, setLayoutOpen] = useState(false);

  // Own accent colour from the wheel: previewed on the swatch while dragging, applied with the button.
  const [wheelOpen, setWheelOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(settings.accentColor ?? theme.colors.primary);

  // App background photo (used to be its own Settings row).
  async function pickBackground() {
    const uri = await pickAndPersistImage();
    if (!uri) return;
    if (settings.backgroundImageUri) await deletePersistedImage(settings.backgroundImageUri);
    updateSettings({ backgroundImageUri: uri });
  }
  async function removeBackground() {
    if (settings.backgroundImageUri) await deletePersistedImage(settings.backgroundImageUri);
    updateSettings({ backgroundImageUri: null });
  }

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

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.themeSettings.finishLabel}</Text>
        <SegmentedControl<ColorFinish>
          value={settings.colorFinish}
          onChange={(colorFinish) => updateSettings({ colorFinish })}
          segments={[
            { value: 'matte', label: tr.themeSettings.finishMatte },
            { value: 'glow', label: tr.themeSettings.finishGlow },
          ]}
        />
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.themeSettings.finishHint}</Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.layoutText.styleLabel}</Text>
        {DESIGN_ORDER.map((id) => {
          const selected = id === settings.designId;
          // Swatches in the colours this design would really have with the chosen finish.
          const d = DESIGNS[id];
          const matte = theme.dark ? d.palettes.dark : d.palettes.light;
          const palette =
            settings.colorFinish === 'glow' ? (d.glow.palettes ? (theme.dark ? d.glow.palettes.dark : d.glow.palettes.light) : vivid(matte, theme.dark)) : matte;
          return (
            <Pressable
              key={id}
              onPress={() => {
                // Each design comes with the finish it was made for (Red Night: vivid); the switch above changes it.
                updateSettings({ designId: id, colorFinish: DESIGNS[id].defaultFinish });
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

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.backgroundSettings.title}</Text>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.themeSettings.backgroundHint}</Text>
        {settings.backgroundImageUri ? (
          <Image source={{ uri: settings.backgroundImageUri }} style={styles.bgPreview} resizeMode="cover" />
        ) : null}
        <View style={styles.bgButtons}>
          <Button
            title={settings.backgroundImageUri ? tr.backgroundSettings.replace : tr.backgroundSettings.pick}
            variant="secondary"
            onPress={pickBackground}
            style={styles.flex}
          />
          {settings.backgroundImageUri ? <Button title={tr.backgroundSettings.remove} variant="danger" onPress={removeBackground} style={styles.flex} /> : null}
        </View>

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
        <Pressable
          onPress={() => setWheelOpen((o) => !o)}
          style={[styles.wheelToggle, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          <View style={[styles.wheelDot, { backgroundColor: draftColor }]} />
          <Text style={{ color: theme.colors.text, fontWeight: '600', flex: 1 }}>{L.colorTitle}</Text>
          <Ionicons name={wheelOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
        </Pressable>
        {wheelOpen ? (
          <View style={styles.wheelBox}>
            <Text style={[styles.hint, { color: theme.colors.textMuted, marginTop: 0 }]}>{L.colorHint}</Text>
            <ColorWheel value={draftColor} onChange={setDraftColor} />
            <Button title={L.colorApply} onPress={() => updateSettings({ accentColor: draftColor })} />
          </View>
        ) : null}

        {/* Own layout: at the very end, folded by default — a long list most people never need. */}
        <Pressable
          onPress={() => setLayoutOpen((o) => !o)}
          style={[styles.sectionHead, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.flex}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>{L.sectionTitle}</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 }}>{L.sectionHint}</Text>
          </View>
          <Ionicons name={layoutOpen ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
        </Pressable>
        {layoutOpen ? (
          <View style={styles.sectionBody}>
          <View style={styles.presetRow}>
            {(['standard', 'v3'] as LayoutId[]).map((id) => {
              const on = settings.layoutId === id && Object.keys(settings.layoutOverrides).length === 0;
              return (
                <Pressable
                  key={id}
                  onPress={() => setPreset(id)}
                  style={[styles.preset, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? `${theme.colors.primary}22` : theme.colors.surface }]}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{id === 'standard' ? L.presetStandard : L.presetVertical}</Text>
                </Pressable>
              );
            })}
          </View>
          {option(L.header, L.headerHint, layout.header, [{ value: 'classic', label: L.headerTop }, { value: 'vertical', label: L.headerSide }], (v) => override('header', v))}
          {option(L.menu, L.menuHint, layout.menu, [
            { value: 'bubble', label: L.menuBubble },
            { value: 'pill', label: L.menuPill },
            { value: 'classic', label: L.menuClassic },
            { value: 'underline', label: L.menuUnderline },
          ], (v) => override('menu', v))}
          {option(L.plate, L.plateHint, layout.menuPlate ? 'on' : 'off', [{ value: 'on', label: L.plateOn }, { value: 'off', label: L.plateOff }], (v) => override('menuPlate', v === 'on'))}
          {option(L.corners, L.cornersHint, leaf ? 'leaf' : 'theme', [{ value: 'theme', label: L.cornersTheme }, { value: 'leaf', label: L.cornersLeaf }], (v) => override('leafCorners', v === 'leaf'))}
          {option(L.tasks, L.tasksHint, layout.tasks, [{ value: 'focus', label: L.tasksFocus }, { value: 'rows', label: L.tasksRows }], (v) => override('tasks', v))}
          {option(L.expenses, L.expensesHint, layout.expenses, [{ value: 'rows', label: L.expensesRows }, { value: 'big', label: L.expensesBig }], (v) => override('expenses', v))}
          {option(L.balance, L.balanceHint, layout.balance, [{ value: 'columns', label: L.balanceColumns }, { value: 'hero', label: L.balanceHero }], (v) => override('balance', v))}
          {option(L.financeMenu, L.financeMenuHint, layout.financeMenu, [{ value: 'classic', label: L.financeMenuClassic }, { value: 'chips', label: L.financeMenuChips }], (v) => override('financeMenu', v))}
          {option(L.stats, L.statsHint, layout.stats, [{ value: 'standard', label: L.statsStandard }, { value: 'big', label: L.statsBig }], (v) => override('stats', v))}
          {option(L.settings, L.settingsHint, layout.settings, [{ value: 'list', label: L.settingsList }, { value: 'big', label: L.settingsBig }], (v) => override('settings', v))}
          {option(L.fab, L.fabHint, layout.fab, [{ value: 'round', label: L.fabRound }, { value: 'big', label: L.fabBig }], (v) => override('fab', v))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -4 },
  bgPreview: { width: '100%', height: 160, borderRadius: 16 },
  bgButtons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  presetRow: { flexDirection: 'row', gap: 10 },
  preset: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  option: { gap: 4 },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  optionHint: { fontSize: 11.5, lineHeight: 16, marginBottom: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 12 },
  sectionBody: { gap: 14, paddingHorizontal: 2 },
  wheelToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  wheelDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#FFFFFF' },
  wheelBox: { gap: 14, alignItems: 'stretch' },
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
