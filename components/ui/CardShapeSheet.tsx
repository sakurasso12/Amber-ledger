import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { CARD_SHAPES, CardBackground, CardShape, cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Text } from './Text';

interface CardShapeSheetProps {
  cardId: string;
  visible: boolean;
  onClose: () => void;
  hasImage?: boolean;
  onPickImage?: () => void;
  onRemoveImage?: () => void;
}

/**
 * "Card look" for one card: its background (as the theme does / glass / shadow / none / own photo)
 * and its corner shape, each shown as a mini preview.
 */
export function CardShapeSheet({ cardId, visible, onClose, hasImage, onPickImage, onRemoveImage }: CardShapeSheetProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const shape = useSettingsStore((s) => s.settings.cardShapes[cardId] ?? null);
  const background = useSettingsStore((s) => s.settings.cardBackgrounds?.[cardId] ?? null);
  const opacity = useSettingsStore((s) => s.settings.cardOpacity?.[cardId] ?? null);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  function pickShape(next: CardShape | null) {
    haptics.tap();
    const shapes = { ...useSettingsStore.getState().settings.cardShapes };
    if (next) shapes[cardId] = next;
    else delete shapes[cardId];
    updateSettings({ cardShapes: shapes });
  }

  function pickBackground(next: CardBackground | null) {
    haptics.tap();
    const all = { ...(useSettingsStore.getState().settings.cardBackgrounds ?? {}) };
    if (next) all[cardId] = next;
    else delete all[cardId];
    updateSettings({ cardBackgrounds: all });
    // A photo wins over every other background — choosing one of those means "not the photo".
    if (hasImage) onRemoveImage?.();
  }

  function pickOpacity(next: number | null) {
    haptics.tap();
    const all = { ...(useSettingsStore.getState().settings.cardOpacity ?? {}) };
    if (next === null) delete all[cardId];
    else all[cardId] = next;
    updateSettings({ cardOpacity: all });
  }

  const row = (key: string, selected: boolean, label: string, onPress: () => void, preview: React.ReactNode) => (
    <Pressable key={key} onPress={onPress} style={[styles.row, selected && { backgroundColor: `${theme.colors.primary}1A` }]}>
      {preview}
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
    </Pressable>
  );
  const bgPreview = (bg: CardBackground | null) => (
    <View style={[styles.previewWrap, { backgroundColor: theme.colors.primary + '55' }]}>
      <View style={[styles.preview, cardSurface(theme, shape, bg), { borderColor: theme.colors.primary, elevation: 0 }]} />
    </View>
  );

  const backgrounds: { bg: CardBackground | null; label: string }[] = [
    { bg: null, label: tr.cardShape.theme },
    { bg: 'glass', label: tr.cardShape.bgGlass },
    { bg: 'shadow', label: tr.cardShape.bgShadow },
    { bg: 'none', label: tr.cardShape.bgNone },
  ];
  const shapes: { s: CardShape | null; label: string }[] = [
    { s: null, label: tr.cardShape.theme },
    ...CARD_SHAPES.map((s) => ({ s, label: tr.cardShape[s] })),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{tr.cardShape.bgTitle}</Text>
            {backgrounds.map(({ bg, label }) => row(`bg-${bg}`, !hasImage && background === bg, label, () => pickBackground(bg), bgPreview(bg)))}
            {onPickImage
              ? row('photo', !!hasImage, tr.cardShape.bgPhoto, () => { onClose(); onPickImage(); }, <View style={styles.previewWrap}><Ionicons name="image-outline" size={22} color={theme.colors.textMuted} /></View>)
              : null}
            {hasImage && onRemoveImage
              ? row('nophoto', false, tr.cardShape.bgRemovePhoto, () => { haptics.tap(); onRemoveImage(); }, <View style={styles.previewWrap}><Ionicons name="close" size={22} color={theme.colors.danger} /></View>)
              : null}

            <Text style={[styles.title, { color: theme.colors.text, marginTop: 6 }]}>{tr.cardShape.opacityTitle}</Text>
            <View style={styles.chips}>
              {([null, 1, 0.8, 0.6, 0.4, 0.2] as (number | null)[]).map((o) => {
                const on = opacity === o;
                return (
                  <Pressable
                    key={String(o)}
                    onPress={() => pickOpacity(o)}
                    style={[styles.chip, { borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? `${theme.colors.primary}22` : 'transparent' }]}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>{o === null ? tr.cardShape.theme : `${Math.round(o * 100)}%`}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.title, { color: theme.colors.text, marginTop: 6 }]}>{tr.cardShape.title}</Text>
            {shapes.map(({ s, label }) =>
              row(`shape-${s}`, shape === s, label, () => pickShape(s), (
                <View style={styles.previewWrap}>
                  <View style={[styles.preview, cardSurface(theme, s), { borderColor: theme.colors.primary, borderWidth: 1.5, elevation: 0 }]} />
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: 290, maxHeight: '85%', borderRadius: 20, borderWidth: 1 },
  content: { padding: 10, gap: 2 },
  title: { fontSize: 16, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  previewWrap: { width: 48, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  preview: { width: 40, height: 26 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
});
