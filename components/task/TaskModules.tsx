import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Habit } from '@/lib/streaks';
import { SegmentedControl, Text } from '@/components/ui';
import { LayoutEditItem } from '@/components/ui/LayoutEditItem';
import { useTranslation } from '@/i18n';
import { HabitCard } from './HabitCard';
import { LevelCard } from './LevelCard';

const GAP = 10;
const LEVEL_KEY = 'level';

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
export function TaskModules({ habits, editing }: { habits: Habit[]; editing: boolean }) {
  const theme = useTheme();
  const tr = useTranslation();
  const savedOrder = useSettingsStore((s) => s.settings.tasksModuleOrder);
  const columns = useSettingsStore((s) => s.settings.tasksModuleColumns);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [width, setWidth] = useState(0);
  const [drops, setDrops] = useState<Record<string, number>>({});

  const modules = useMemo(
    () => ordered([{ key: LEVEL_KEY, habit: null }, ...habits.map((habit) => ({ key: habit.seriesId, habit }))], savedOrder),
    [habits, savedOrder]
  );
  const size = Math.floor((width - GAP * (columns - 1)) / columns);
  const rows = Math.ceil(modules.length / columns);

  return (
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
        {/* The faint grid behind the squares while editing — where things can go. */}
        {editing && width > 0 ? (
          <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={[StyleSheet.absoluteFill, styles.cells]} pointerEvents="none">
            {Array.from({ length: rows * columns }, (_, i) => (
              <View key={i} style={[styles.cell, { width: size, height: size, borderColor: theme.colors.border }]} />
            ))}
          </Animated.View>
        ) : null}

        {width > 0 ? (
          <Sortable.Grid
            data={modules}
            keyExtractor={(m) => m.key}
            columns={columns}
            rowGap={GAP}
            columnGap={GAP}
            sortEnabled={editing}
            dragActivationDelay={150}
            activeItemScale={0.9}
            inactiveItemOpacity={1}
            activeItemShadowOpacity={0.25}
            hapticsEnabled
            onDragEnd={({ data }) => updateSettings({ tasksModuleOrder: data.map((m) => m.key) })}
            onActiveItemDropped={({ key }) => setDrops((d) => ({ ...d, [key]: (d[key] ?? 0) + 1 }))}
            renderItem={({ item, index }) => (
              <LayoutEditItem hint={editing && index === 0} dropCount={drops[item.key] ?? 0}>
                {item.habit ? <HabitCard habit={item.habit} size={size} editing={editing} /> : <LevelCard size={size} />}
              </LayoutEditItem>
            )}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  columnsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  columnsLabel: { fontSize: 13, fontWeight: '600' },
  columnsControl: { width: 120 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 18, opacity: 0.6 },
});
