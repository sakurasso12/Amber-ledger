import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Habit } from '@/lib/streaks';
import { SegmentedControl, Text } from '@/components/ui';
import { LayoutEditItem, useLayoutHint } from '@/components/ui/LayoutEditItem';
import { LayoutEditingContext } from '@/components/ui/LayoutEditing';
import { useTranslation } from '@/i18n';
import { HabitCard } from './HabitCard';
import { LevelCard } from './LevelCard';

const GAP = 10;
const LEVEL_KEY = 'level';

const FOCUS_KEY = 'focus';

type Module = { key: string; habit: Habit | null };

/** Puts modules in the saved order; new ones (a just-created habit) go at the end. */
function ordered(modules: Module[], saved: string[]): Module[] {
  const rank = new Map(saved.map((key, i) => [key, i]));
  return [...modules].sort((a, b) => (rank.get(a.key) ?? Infinity) - (rank.get(b.key) ?? Infinity));
}

/**
 * The squares at the top of Tasks — the level ring and the habits. Two per row by default (three
 * if chosen). In edit mode (the pencil) they can be dragged around: the picked one shrinks, the
 * rest slide out of its way, and it settles with a jelly wobble.
 */
interface TaskModulesProps {
  habits: Habit[];
  editing: boolean;
  /** Vertical's "In focus" card — full width, moves around among the squares like they do. */
  focus?: React.ReactNode;
}

export function TaskModules({ habits, editing, focus }: TaskModulesProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const savedOrder = useSettingsStore((s) => s.settings.tasksModuleOrder);
  const columns = useSettingsStore((s) => s.settings.tasksModuleColumns);
  const { showHint, markSeen } = useLayoutHint('tasks-modules');
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [width, setWidth] = useState(0);
  const [drops, setDrops] = useState<Record<string, number>>({});

  const hasFocus = !!focus;
  const modules = useMemo(
    () =>
      ordered(
        [
          { key: LEVEL_KEY, habit: null },
          ...habits.map((habit) => ({ key: habit.seriesId, habit })),
          ...(hasFocus ? [{ key: FOCUS_KEY, habit: null }] : []),
        ],
        savedOrder
      ),
    [habits, savedOrder, hasFocus]
  );
  const size = Math.floor((width - GAP * (columns - 1)) / columns);

  return (
    <LayoutEditingContext.Provider value={editing}>
      <View style={styles.wrap}>
        {editing ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.columnsRow}>
            <Text style={[styles.columnsLabel, { color: theme.colors.textMuted }]}>{tr.layoutEdit.perRow}</Text>
            <View style={styles.columnsControl}>
              <SegmentedControl
                value={String(columns)}
                onChange={(value) => updateSettings({ tasksModuleColumns: value === '3' ? 3 : 2 })}
                segments={[
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                ]}
              />
            </View>
          </Animated.View>
        ) : null}

        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            // Flex rather than a grid: the squares and the full-width focus card share one order.
            <Sortable.Flex
              flexDirection="row"
              flexWrap="wrap"
              rowGap={GAP}
              columnGap={GAP}
              sortEnabled={editing}
              dragActivationDelay={150}
              activeItemScale={0.9}
              inactiveItemOpacity={1}
              activeItemShadowOpacity={0.25}
              hapticsEnabled
              onDragEnd={({ order }) => {
                updateSettings({ tasksModuleOrder: order(modules).map((m) => m.key) });
                markSeen();
              }}
              onActiveItemDropped={({ key }) => setDrops((d) => ({ ...d, [key]: (d[key] ?? 0) + 1 }))}
            >
              {modules.map((item, index) => (
                <View key={item.key} style={{ width: item.key === FOCUS_KEY ? width : size }}>
                  <LayoutEditItem hint={editing && index === 0 && showHint} dropCount={drops[item.key] ?? 0}>
                    {item.key === FOCUS_KEY ? focus : item.habit ? <HabitCard habit={item.habit} size={size} editing={editing} /> : <LevelCard size={size} />}
                    {/* The faint outline that marks each module's place while editing. */}
                    {editing ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderColor: theme.colors.primary }]} /> : null}
                  </LayoutEditItem>
                </View>
              ))}
            </Sortable.Flex>
          ) : null}
        </View>
      </View>
    </LayoutEditingContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  columnsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  columnsLabel: { fontSize: 13, fontWeight: '600' },
  columnsControl: { width: 120 },
  outline: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, opacity: 0.35, margin: -4 },
});
