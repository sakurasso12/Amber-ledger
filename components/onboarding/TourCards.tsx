import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { cardSurface } from '@/theme/surfaces';
import { haptics } from '@/lib/haptics';
import { Button, Text } from '@/components/ui';
import { useTranslation } from '@/i18n';

export type TourSlide = { title: string; text: string; icon?: keyof typeof Ionicons.glyphMap };

/** One icon per welcome slide, in the same order as tr.welcome.slides. */
const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'sparkles',
  'checkbox-outline',
  'flame',
  'calendar-outline',
  'wallet-outline',
  'stats-chart',
  'color-palette-outline',
];

const CARD_MARGIN = 24;

interface TourCardsProps {
  onFinish: () => void;
  backRef: React.MutableRefObject<(() => boolean) | null>;
  /** Cards to show — the welcome tour by default; "What's new" passes its own. */
  slides?: TourSlide[];
  /** Label of the last card's button (default: Get started). */
  finishLabel?: string;
}

/**
 * Swipeable cards over the dimmed app — the last onboarding step (what each screen does) and the
 * "What's new" after an update. Skip / the last button call onFinish.
 */
export function TourCards({ onFinish, backRef, slides: customSlides, finishLabel }: TourCardsProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const list = useRef<Animated.FlatList<TourSlide>>(null);
  const [index, setIndex] = useState(0);

  const slides: TourSlide[] = customSlides ?? tr.welcome.slides.map((slide, i) => ({ ...slide, icon: ICONS[i] }));
  const isLast = index === slides.length - 1;

  function finish() {
    haptics.success();
    onFinish();
  }

  // Android back steps to the previous card; on the first card the onboarding handles it.
  backRef.current = () => {
    if (index === 0) return false;
    list.current?.scrollToOffset({ offset: (index - 1) * width, animated: true });
    return true;
  };

  function next() {
    if (isLast) return finish();
    haptics.tap();
    list.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
  }

  return (
    <View style={styles.flex}>
      <Animated.FlatList
        ref={list}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.flex}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => {
          // Neighbouring cards shrink and fade as they slide away.
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.88, 1, 0.88], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
          return (
            <View style={[styles.page, { width }]}>
              <Animated.View
                style={[styles.card, cardSurface(theme), { width: width - CARD_MARGIN * 2, opacity, transform: [{ scale }] }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}22` }]}>
                  <Ionicons name={item.icon ?? 'sparkles'} size={40} color={theme.colors.primary} />
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.text, { color: theme.colors.textMuted }]}>{item.text}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => {
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' }),
                  transform: [{ scaleX: scrollX.interpolate({ inputRange: range, outputRange: [1, 2.6, 1], extrapolate: 'clamp' }) }],
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={finish} hitSlop={10} style={[styles.skip, isLast && styles.hidden]} disabled={isLast}>
          <Text style={styles.skipText}>{tr.welcome.skip}</Text>
        </Pressable>
        <Button title={isLast ? (finishLabel ?? tr.welcome.start) : tr.welcome.next} onPress={next} style={styles.nextButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  card: { paddingHorizontal: 26, paddingVertical: 34, gap: 14, alignItems: 'center' },
  iconCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD_MARGIN },
  skip: { paddingVertical: 10, paddingRight: 10 },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  hidden: { opacity: 0 },
  nextButton: { minWidth: 150 },
});
