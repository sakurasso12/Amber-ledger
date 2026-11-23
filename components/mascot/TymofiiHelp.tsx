import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { TymofiiFace, useMascotOn } from './Tymofii';
import { useFocusEffect } from 'expo-router';
import { useHelpStore } from '@/store/useHelpStore';
import { HELP_TARGETS } from './helpTopics';

/** After this long on one screen Тимофій asks whether help is needed (once per screen per app run). */
const NUDGE_AFTER_MS = 45_000;
const NUDGE_SHOWN_MS = 7_000;
const nudged = new Set<string>();

export type HelpScreen = 'tasks' | 'calendar' | 'finance' | 'stats' | 'settings';

/**
 * Тимофій in a screen's header: tap → "How does it work?" — the topics for that screen, each
 * opening into a short explanation. Hidden when the mascot is switched off.
 */
export function TymofiiHelpButton({ screen }: { screen: HelpScreen }) {
  const theme = useTheme();
  const tr = useTranslation();
  const insets = useSafeAreaInsets();
  const on = useMascotOn();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [nudge, setNudge] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTour = useHelpStore((s) => s.start);
  const topics = tr.help.screens[screen];

  // Staying on the screen a while → "Need a hand?" pops out next to Тимофій for a few seconds.
  useFocusEffect(
    useCallback(() => {
      if (!on || nudged.has(screen)) return;
      const show = setTimeout(() => {
        nudged.add(screen);
        setNudge(true);
        timers.current.push(setTimeout(() => setNudge(false), NUDGE_SHOWN_MS));
      }, NUDGE_AFTER_MS);
      timers.current.push(show);
      return () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setNudge(false);
      };
    }, [on, screen])
  );

  if (!on) return null;

  /** Picked a topic: close the sheet, then dim the screen and spotlight the thing it's about. */
  function showTopic(i: number) {
    const t = topics[i];
    setOpen(false);
    setTimeout(() => {
      startTour([{ target: HELP_TARGETS[screen][i] ?? null, title: t.title, text: t.text }]);
    }, 320);
  }

  return (
    <>
      {nudge ? (
        <Pressable
          onPress={() => {
            setNudge(false);
            setExpanded(0);
            setOpen(true);
          }}
          style={[styles.nudge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent }]}
          accessibilityRole="button"
        >
          <Text style={[styles.nudgeText, { color: theme.colors.text }]}>{tr.help.nudge}</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          setNudge(false);
          haptics.tap();
          setExpanded(0);
          setOpen(true);
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={tr.help.button}
        style={[styles.button, { backgroundColor: `${theme.colors.primary}22` }]}
      >
        <TymofiiFace mood="happy" size={34} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={tr.help.close} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.head}>
            <TymofiiFace mood="wink" prop="question" size={72} />
            <View style={styles.headText}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{tr.help.title}</Text>
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{tr.help.hint}</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel={tr.help.close}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {topics.map((t, i) => {
              const isOpen = expanded === i;
              return (
                <Pressable
                  key={t.title}
                  onPress={() => setExpanded(isOpen ? null : i)}
                  style={[styles.item, { backgroundColor: theme.colors.surfaceAlt, borderColor: isOpen ? theme.colors.primary : theme.colors.border }]}
                  accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={styles.itemHead}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{t.title}</Text>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
                  </View>
                  {isOpen ? (
                    <>
                      <Text style={[styles.itemText, { color: theme.colors.textMuted }]}>{t.text}</Text>
                      <Pressable onPress={() => showTopic(i)} style={[styles.showMe, { backgroundColor: theme.colors.primary }]} accessibilityRole="button">
                        <Text style={[styles.showMeText, { color: theme.colors.primaryText }]}>{tr.help.showMe}</Text>
                      </Pressable>
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  // On a PC the sheet stays a readable width instead of spanning the whole screen.
  sheet: { width: '100%', maxWidth: Platform.OS === 'web' ? 620 : undefined, alignSelf: 'center', maxHeight: '78%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headText: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '800' },
  hint: { fontSize: 13 },
  list: { gap: 8, paddingBottom: 8 },
  item: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  itemText: { fontSize: 14, lineHeight: 20 },
  showMe: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  showMeText: { fontSize: 14, fontWeight: '800' },
  nudge: { position: 'absolute', right: 52, top: 2, width: 170, borderWidth: 1, borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 10, paddingVertical: 8, zIndex: 10 },
  nudgeText: { fontSize: 13, fontWeight: '700' },
});
