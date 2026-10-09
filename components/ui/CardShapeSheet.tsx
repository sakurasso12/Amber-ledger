import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { CARD_SHAPES, CardShape, cardSurface } from '@/theme/surfaces';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Text } from './Text';

/** Small sheet with the corner shapes for one card, each shown as a mini preview. */
export function CardShapeSheet({ cardId, visible, onClose }: { cardId: string; visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const current = useSettingsStore((s) => s.settings.cardShapes[cardId] ?? null);
  const shapes = useSettingsStore((s) => s.settings.cardShapes);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  function pick(shape: CardShape | null) {
    haptics.tap();
    const next = { ...shapes };
    if (shape) next[cardId] = shape;
    else delete next[cardId];
    updateSettings({ cardShapes: next });
    onClose();
  }

  const options: { shape: CardShape | null; label: string }[] = [
    { shape: null, label: tr.cardShape.theme },
    ...CARD_SHAPES.map((shape) => ({ shape, label: tr.cardShape[shape] })),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{tr.cardShape.title}</Text>
          {options.map(({ shape, label }) => {
            const selected = current === shape;
            return (
              <Pressable key={label} onPress={() => pick(shape)} style={[styles.row, selected && { backgroundColor: `${theme.colors.primary}1A` }]}>
                <View style={[styles.preview, cardSurface(theme, shape), { borderColor: theme.colors.primary, borderWidth: 1.5, elevation: 0 }]} />
                <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
                {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 270, borderRadius: 20, borderWidth: 1, padding: 10, gap: 2 },
  title: { fontSize: 16, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12 },
  preview: { width: 40, height: 28 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});
