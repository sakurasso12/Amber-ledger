import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface WidgetMenuProps {
  hasImage: boolean;
  onPickImage: () => void;
  onRemoveImage: () => void;
  /** Adds "Card shape" to the menu. */
  onPickShape?: () => void;
  tint?: 'light' | 'dark';
}

/** The "⋮" button in a widget's corner — a tiny menu: background picture, and the card's shape. */
export function WidgetMenu({ hasImage, onPickImage, onRemoveImage, onPickShape, tint }: WidgetMenuProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [open, setOpen] = useState(false);
  const dotColor = tint === 'light' ? '#FFFFFF' : theme.colors.textMuted;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.trigger}>
        <Text style={[styles.dots, { color: dotColor }]}>⋮</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Pressable
              style={styles.item}
              onPress={() => {
                setOpen(false);
                onPickImage();
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{tr.widgetMenu.pick}</Text>
            </Pressable>
            {hasImage ? (
              <Pressable
                style={styles.item}
                onPress={() => {
                  setOpen(false);
                  onRemoveImage();
                }}
              >
                <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '600' }}>{tr.widgetMenu.remove}</Text>
              </Pressable>
            ) : null}
            {onPickShape ? (
              <Pressable
                style={styles.item}
                onPress={() => {
                  setOpen(false);
                  onPickShape();
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>{tr.widgetMenu.shape}</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { padding: 4 },
  dots: { fontSize: 18, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 240, borderRadius: 18, borderWidth: 1, padding: 8, gap: 2 },
  item: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
});
