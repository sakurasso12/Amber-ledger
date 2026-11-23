import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import { createJellyRegistry, droppedKey, LayoutEditItem, useLayoutHint } from './LayoutEditItem';
import { LAYOUT_SCROLL_SPEED, LayoutEditingContext, useLayoutScroll } from './LayoutEditing';
import { HiddenModuleItem, RemoveModuleButton, useHiddenModules } from './HiddenModules';
import { Text } from './Text';
import { GridItemContext } from './GridItem';
import { GridCellContext } from './GridCell';

export type ModuleSize = 'half' | 'full';

export interface BoardModule {
  key: string;
  /** Name in the ⋮ list of removed widgets. */
  title: string;
  /** Sizes this module looks right in; the first is its default. One size = can't be resized. */
  sizes: ModuleSize[];
  /** `width` (px) is passed by the grid (GridBoard) for widgets that scale with their box. */
  render: (size: ModuleSize, width?: number) => React.ReactNode;
}

const GAP = 12;

/** The extra fields a GridBoard module may carry (this board uses them on the phone). */
type GridModuleLike = BoardModule & { removable?: boolean; resizableHeight?: { min: number; max: number; initial: number } };

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
  // Simple mode: the default order and sizes (the user's own arrangement waits for the advanced mode).
  const simple = useSettingsStore((s) => s.settings.uiMode === 'simple');
  const ownLayout = useSettingsStore((s) => s.settings.moduleLayouts[boardId]);
  const saved = simple ? undefined : ownLayout;
  const allLayouts = useSettingsStore((s) => s.settings.moduleLayouts);
  const { showHint, markSeen } = useLayoutHint(boardId);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [width, setWidth] = useState(0);
  const [jellies] = useState(createJellyRegistry);
  const { hidden, hide } = useHiddenModules(boardId);
  const scrollableRef = useLayoutScroll();

  const list = useMemo(
    () => ordered(modules.filter((m) => !hidden.includes(m.key)), saved?.order ?? []),
    [modules, saved?.order, hidden]
  );
  const sizeOf = (m: BoardModule): ModuleSize => {
    const chosen = saved?.sizes?.[m.key];
    return chosen && m.sizes.includes(chosen) ? chosen : m.sizes[0];
  };
  const half = Math.floor((width - GAP) / 2);

  // Two half cards side by side end on one line: the shorter one gets the taller one's height
  // (a ragged gap under it pushed the next row down).
  const [heights, setHeights] = useState<Record<string, number>>({});
  const rowHeight = useMemo(() => {
    const out: Record<string, number> = {};
    let pair: string[] = [];
    const flush = () => {
      if (pair.length === 2 && pair.every((k) => heights[k])) {
        const h = Math.max(...pair.map((k) => heights[k]));
        for (const k of pair) out[k] = h;
      }
      pair = [];
    };
    for (const m of list) {
      if (sizeOf(m) === 'full') {
        flush();
        continue;
      }
      pair.push(m.key);
      if (pair.length === 2) flush();
    }
    flush();
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, heights, saved?.sizes]);

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
            scrollableRef={scrollableRef}
            autoScrollMaxVelocity={LAYOUT_SCROLL_SPEED}
            dragActivationDelay={150}
            activeItemScale={0.92}
            activeItemShadowOpacity={0.25}
            inactiveItemOpacity={1}
            hapticsEnabled
            onDragEnd={({ order }) => {
              // Removed widgets keep their old spot at the end of the saved order, ready to come back.
              const visible = order(list).map((m) => m.key);
              save({ order: [...visible, ...(saved?.order ?? []).filter((key) => !visible.includes(key))] });
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
                    <View
                      onLayout={(e) => {
                        const h = Math.ceil(e.nativeEvent.layout.height);
                        if (Math.abs((heights[m.key] ?? 0) - h) > 1) setHeights((all) => ({ ...all, [m.key]: h }));
                      }}
                    >
                    <GridCellContext.Provider value={rowHeight[m.key] ?? null}>
                    <GridItemContext.Provider value={(m as GridModuleLike).removable === false ? null : { remove: () => hide(m.key) }}>
                      {(m as GridModuleLike).resizableHeight ? (
                        // A list block (tasks, expenses): a fixed height on the phone, scrolling inside.
                        <View style={{ height: (m as GridModuleLike).resizableHeight!.initial }}>{m.render(size, size === 'half' ? half : width)}</View>
                      ) : (
                        m.render(size, size === 'half' ? half : width)
                      )}
                    </GridItemContext.Provider>
                    {editing ? (
                      <>
                        {/* The faint outline that marks each card's place while editing. */}
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderColor: theme.colors.primary }]} />
                        <RemoveModuleButton onPress={() => hide(m.key)} />
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
                    </GridCellContext.Provider>
                    </View>
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

/** The removed widgets of a board, ready for the ⋮ list. */
export function useHiddenBoardItems(boardId: string, modules: BoardModule[]): HiddenModuleItem[] {
  const { hidden, show } = useHiddenModules(boardId);
  // Several of one kind ("Cash", "Cash") get numbers so they can be told apart.
  const seen = new Map<string, number>();
  return modules
    .filter((m) => hidden.includes(m.key))
    .map((m) => {
      const n = (seen.get(m.title) ?? 0) + 1;
      seen.set(m.title, n);
      return { key: m.key, title: n > 1 ? `${m.title} ${n}` : m.title, restore: () => show(m.key) };
    });
}
