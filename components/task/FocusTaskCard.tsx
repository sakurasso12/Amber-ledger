import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/ui/PressableScale';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { priorityColor } from '@/theme/theme';
import { Task } from '@/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { formatDuration } from '@/widget/widgetShared';

/** "Vertical" layout: the nearest task as one huge card with a countdown and a big Done button. */
export function FocusTaskCard({ task, onDone }: { task: Task; onDone: () => void }) {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const ms = task.deadlineAt ? new Date(task.deadlineAt).getTime() - Date.now() : null;
  const countdown =
    ms === null
      ? tr.layoutText.noDeadline
      : ms < 0
        ? tr.homeWidgets.overdueBy(formatDuration(ms, tr.homeWidgets))
        : tr.homeWidgets.dueIn(formatDuration(ms, tr.homeWidgets));

  return (
    <PressableScale onPress={() => router.push(`/task/${task.id}`)} style={[styles.card, cardSurface(theme)]}>
      <View style={styles.kickerRow}>
        <View style={[styles.dot, { backgroundColor: priorityColor(theme, task.priority) }]} />
        <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>{tr.layoutText.focus}</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={3}>
        {task.title}
      </Text>
      <Text style={[styles.countdown, { color: ms !== null && ms < 0 ? theme.colors.danger : theme.colors.primary }]}>
        {countdown}
      </Text>
      <Pressable
        onPress={() => {
          haptics.success();
          onDone();
        }}
        style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.doneText, { color: theme.colors.primaryText }]}>✓ {tr.layoutText.done}</Text>
      </Pressable>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { padding: 22, gap: 10 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
  countdown: { fontSize: 18, fontWeight: '700' },
  doneButton: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  doneText: { fontSize: 15, fontWeight: '800' },
});
