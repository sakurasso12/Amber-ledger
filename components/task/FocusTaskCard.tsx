import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
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

interface FocusTaskCardProps {
  task: Task;
  onDone: () => void;
  /** Small caps line above the title — "In focus" by default; size-L task cards show the priority. */
  kicker?: string;
  /** While the layout is being edited: no opening, no ticking off. */
  editing?: boolean;
}

/** One task as a big card with a countdown and a big Done button — the Vertical layout's "In
 * focus" card, and size L in the task list. */
export function FocusTaskCard({ task, onDone, kicker, editing = false }: FocusTaskCardProps) {
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
  // With a photo the card's text sits on the image, so it switches to light text over a dark fade.
  const photo = task.imageUri;
  const textColor = photo ? '#FFFFFF' : theme.colors.text;
  const mutedColor = photo ? 'rgba(255,255,255,0.8)' : theme.colors.textMuted;

  return (
    <PressableScale
      disabled={editing}
      onPress={() => router.push(`/task/${task.id}`)}
      // overflow: hidden clips the photo to the card's exact (leaf-shaped) corners.
      style={[styles.card, cardSurface(theme), photo && styles.photoCard]}
    >
      {photo ? (
        <>
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, styles.photoFade]} />
        </>
      ) : null}
      <View style={styles.kickerRow}>
        <View style={[styles.dot, { backgroundColor: priorityColor(theme, task.priority) }]} />
        <Text style={[styles.kicker, { color: mutedColor }]}>{kicker ?? tr.layoutText.focus}</Text>
      </View>
      <Text style={[styles.title, { color: textColor }, photo && styles.photoText]} numberOfLines={3}>
        {task.title}
      </Text>
      <Text
        style={[
          styles.countdown,
          { color: ms !== null && ms < 0 ? theme.colors.danger : photo ? '#FFFFFF' : theme.colors.primary },
          photo && styles.photoText,
        ]}
      >
        {countdown}
      </Text>
      <Pressable
        disabled={editing}
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
  photoCard: { overflow: 'hidden', minHeight: 220, justifyContent: 'flex-end' },
  // Darker towards the bottom, where the title and button sit.
  photoFade: { experimental_backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.7))' },
  photoText: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
  countdown: { fontSize: 18, fontWeight: '700' },
  doneButton: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  doneText: { fontSize: 15, fontWeight: '800' },
});
