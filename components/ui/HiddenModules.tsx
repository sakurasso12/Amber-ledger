import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { Text } from './Text';

/** Which widgets of a board were removed with "−", and how to remove/bring one back. */
export function useHiddenModules(boardId: string) {
  const hidden = useSettingsStore((s) => s.settings.hiddenModules[boardId]) ?? EMPTY;
  const set = (keys: string[]) => {
    const { settings, updateSettings } = useSettingsStore.getState();
    updateSettings({ hiddenModules: { ...settings.hiddenModules, [boardId]: keys } });
  };
  return {
    hidden,
    hide: (key: string) => {
      const current = useSettingsStore.getState().settings.hiddenModules[boardId] ?? [];
      if (!current.includes(key)) set([...current, key]);
    },
    show: (key: string) => set((useSettingsStore.getState().settings.hiddenModules[boardId] ?? []).filter((k) => k !== key)),
  };
}

const EMPTY: string[] = [];

/** The "−" in a widget's top-right corner while editing: removes it from the screen. */
export function RemoveModuleButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  return (
    <Animated.View entering={ZoomIn.duration(180)} exiting={ZoomOut.duration(120)} style={styles.removeWrap}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        hitSlop={8}
        accessibilityLabel={tr.layoutEdit.remove}
        style={[styles.remove, { backgroundColor: theme.colors.danger, borderColor: theme.colors.surface }]}
      >
        <Ionicons name="remove" size={16} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

export interface HiddenModuleItem {
  key: string;
  title: string;
  /** Puts it back on the screen. */
  restore: () => void;
}

/**
 * ⋮ next to the pencil while editing: the widgets removed from this screen, tap one to bring it
 * back (it returns to its old place).
 */
export function HiddenModulesButton({ items }: { items: HiddenModuleItem[] }) {
  const theme = useTheme();
  const tr = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        hitSlop={10}
        accessibilityLabel={tr.layoutEdit.hiddenTitle}
        style={[styles.dots, { backgroundColor: `${theme.colors.primary}1F` }]}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.primary} />
        {items.length > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.badgeText, { color: theme.colors.primaryText }]}>{items.length}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{tr.layoutEdit.hiddenTitle}</Text>
            {items.length === 0 ? <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{tr.layoutEdit.hiddenEmpty}</Text> : null}
            <ScrollView style={styles.list}>
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    haptics.success();
                    item.restore();
                    if (items.length === 1) setOpen(false);
                  }}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: `${theme.colors.primary}14` }]}
                >
                  <Ionicons name="add-circle" size={22} color={theme.colors.success} />
                  <Text style={[styles.rowText, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  removeWrap: { position: 'absolute', top: -8, right: -8, zIndex: 10 },
  remove: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dots: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 290, maxHeight: '70%', borderRadius: 20, borderWidth: 1, padding: 10, gap: 4 },
  title: { fontSize: 16, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 8 },
  empty: { fontSize: 13, lineHeight: 18, paddingHorizontal: 10, paddingBottom: 10 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
