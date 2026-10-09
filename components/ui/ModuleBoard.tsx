import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { createJellyRegistry, droppedKey, LayoutEditItem, useLayoutHint } from './LayoutEditItem';
import { LayoutEditingContext } from './LayoutEditing';
import { Text } from './Text';

export type ModuleSize = 'half' | 'full';

export interface BoardModule {
  key: string;
  /** Sizes this module looks right in; the first is its default. One size = can't be resized. */
  sizes: ModuleSize[];
  render: (size: ModuleSize) => React.ReactNode;
}

const GAP = 12;

/** Puts modules in the saved order; ones the saved order doesn't know yet keep their place at the end. */
function ordered(modules: BoardModule[], order: string[]): BoardModule[] {
  const rank = new Map(order.map((key, i) => [key, i]));
  return [...modules].sort((a, b) => (rank.get(a.key) ?? 1e6 + modules.indexOf(a)) - (rank.get(b.key) ?? 1e6 + modules.indexOf(b)));
}

/**
 * A screen's cards as an editable board (Finance, Stats): full-width or half-width, at most two
 * per row. In edit mode (the screen's pencil) cards can be dragged into any order, the ones that
 * allow it switch between half and full with the corner button, and tapping a card changes its
 * corner shape. Order and sizes are saved per `boardId`.
 */
export function ModuleBoard({ boardId, modules, editing }: { boardId: string; modules: BoardModule[]; editing: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const saved = useSettingsStore((s) => s.settings.moduleLayouts[boardId]);
  const allLayouts = useSettingsStore((s) => s.settings.moduleLayouts);
  const { showHint, markSeen } = useLayoutHint(boardId);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [width, setWidth] = useState(0);
  const [jellies] = useState(createJellyRegistry);

  const list = useMemo(() => ordered(modules, saved?.order ?? []), [modules, saved?.order]);
  const sizeOf = (m: BoardModule): ModuleSize => {
    const chosen = saved?.sizes?.[m.key];
    return chosen && m.sizes.includes(chosen) ? chosen : m.sizes[0];
  };
  const half = Math.floor((width - GAP) / 2);

  function save(patch: { order?: string[]; sizes?: Record<string, ModuleSize> }) {
    updateSettings({
      moduleLayouts: {
        ...allLayouts,
        [boardId]: { order: patch.order ?? saved?.order ?? [], sizes: patch.sizes ?? saved?.sizes ?? {} },
      },
    });
  }

  function toggleSize(m: BoardModule) {
    haptics.tap();
    save({ sizes: { ...(saved?.sizes ?? {}), [m.key]: sizeOf(m) === 'half' ? 'full' : 'half' } });
  }

  return (
    <LayoutEditingContext.Provider value={editing}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Sortable.Flex
            flexDirection="row"
            flexWrap="wrap"
            rowGap={GAP}
            columnGap={GAP}
            sortEnabled={editing}
            dragActivationDelay={150}
            activeItemScale={0.92}
            activeItemShadowOpacity={0.25}
            inactiveItemOpacity={1}
            hapticsEnabled
            onDragEnd={({ order }) => {
              save({ order: order(list).map((m) => m.key) });
              markSeen();
            }}
            onActiveItemDropped={({ key }) => jellies.get(droppedKey(key))?.()}
            reorderTriggerOrigin="touch"
            dropAnimationDuration={200}
          >
            {list.map((m, index) => {
              const size = sizeOf(m);
              return (
                <View key={m.key} style={{ width: size === 'half' ? half : width }}>
                  <LayoutEditItem hint={editing && index === 0 && showHint} jellies={jellies} jellyKey={m.key}>
                    {m.render(size)}
                    {editing ? (
                      <>
                        {/* The faint outline that marks each card's place while editing. */}
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderColor: theme.colors.primary }]} />
                        {m.sizes.length > 1 ? (
                          <Pressable
                            onPress={() => toggleSize(m)}
                            hitSlop={8}
                            accessibilityLabel={tr.layoutEdit.resize}
                            style={[styles.resize, { backgroundColor: theme.colors.primary }]}
                          >
                            <Ionicons name="resize" size={14} color={theme.colors.primaryText} />
                            <Text style={[styles.resizeText, { color: theme.colors.primaryText }]}>{size === 'half' ? '½' : '1'}</Text>
                          </Pressable>
                        ) : null}
                      </>
                    ) : null}
                  </LayoutEditItem>
                </View>
              );
            })}
          </Sortable.Flex>
        ) : null}
      </View>
    </LayoutEditingContext.Provider>
  );
}

const styles = StyleSheet.create({
  outline: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, opacity: 0.35, margin: -4 },
  resize: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  resizeText: { fontSize: 12, fontWeight: '800' },
});
