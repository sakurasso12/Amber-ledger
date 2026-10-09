import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { buildHabits } from '@/lib/streaks';
import { haptics } from '@/lib/haptics';
import { refreshHomeWidget } from '@/lib/widgetRefresh';
import { PressableScale, Screen, SubScreenHeader, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';

/**
 * Opened by tapping a streak widget on the home screen (amberledger://habit-widget?widgetId=…):
 * pick which habit that widget shows.
 */
export function HabitWidgetPickerScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { widgetId } = useLocalSearchParams<{ widgetId?: string }>();
  const tasks = useTaskStore((s) => s.tasks);
  const habits = useMemo(() => buildHabits(tasks), [tasks]);
  const streakWidgets = useSettingsStore((s) => s.settings.streakWidgets);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [saved, setSaved] = useState(false);
  const current = widgetId ? streakWidgets[widgetId] : undefined;

  function pick(seriesId: string) {
    if (!widgetId) return;
    haptics.success();
    updateSettings({ streakWidgets: { ...streakWidgets, [widgetId]: seriesId } });
    setSaved(true);
    // Settings are persisted asynchronously; give it a moment before the widget re-reads them.
    setTimeout(() => refreshHomeWidget(), 300);
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 700);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <SubScreenHeader title={tr.habitWidget.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          {habits.length > 0 ? tr.habitWidget.subtitle : tr.habitWidget.empty}
        </Text>

        {habits.map((habit) => {
          const selected = habit.seriesId === current;
          return (
            <PressableScale
              key={habit.seriesId}
              scaleTo={0.97}
              onPress={() => pick(habit.seriesId)}
              style={[styles.row, cardSurface(theme), selected && { borderColor: theme.colors.primary, borderWidth: 2 }]}
            >
              <Text style={styles.flame}>🔥</Text>
              <Text style={[styles.count, { color: theme.colors.text }]}>{habit.streak}</Text>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {habit.title}
              </Text>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? theme.colors.primary : theme.colors.textMuted}
              />
            </PressableScale>
          );
        })}

        {saved ? (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>{tr.habitWidget.done}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 10 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  flame: { fontSize: 22 },
  count: { fontSize: 22, fontWeight: '800', minWidth: 28, fontVariant: ['tabular-nums'] },
  title: { flex: 1, fontSize: 16, fontWeight: '600' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 },
});
