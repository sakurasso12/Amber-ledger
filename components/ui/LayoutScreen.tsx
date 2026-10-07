import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { Screen } from './Screen';
import { Text } from './Text';

/** Top safe-area padding a tab screen needs — none when the layout puts the tab bar on top,
 * because then the bar itself sits under the status bar. */
export function useTabScreenTopInset(): number {
  const insets = useSafeAreaInsets();
  const { layout } = useTheme();
  return layout.tabBar === 'top' ? 0 : insets.top;
}

interface LayoutScreenProps {
  title: string;
  /** Shown as a big counter (giant header) or under the rail letters (vertical header). */
  count?: number;
  /** Extra controls next to the title (links, buttons). */
  right?: React.ReactNode;
  /** Replaces the whole header (e.g. the bulk-selection bar on the task list). */
  headerOverride?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Root of every main tab: draws the header the active layout asks for (see theme/layouts.ts). */
export function LayoutScreen({ title, count, right, headerOverride, children, style }: LayoutScreenProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const topInset = useTabScreenTopInset();
  const { colors, layout } = theme;
  const kicker = new Date().toLocaleDateString(tr.localeCode, { weekday: 'long', day: 'numeric', month: 'long' });

  if (layout.header === 'vertical') {
    return (
      <Screen style={[styles.flex, { paddingTop: topInset }, style]}>
        <View style={styles.railRow}>
          <View style={styles.rail}>
            {[...title.toUpperCase()].map((letter, i) => (
              <Text key={i} style={[styles.railLetter, { color: i === 0 ? colors.primary : colors.text }]}>
                {letter}
              </Text>
            ))}
            {count !== undefined ? (
              <View style={[styles.railCount, { backgroundColor: colors.primary }]}>
                <Text style={[styles.railCountText, { color: colors.primaryText }]}>{count}</Text>
              </View>
            ) : null}
            <View style={[styles.railLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.flex}>
            {headerOverride ?? (right ? <View style={styles.railRight}>{right}</View> : <View style={styles.railSpacer} />)}
            {children}
          </View>
        </View>
      </Screen>
    );
  }

  let header: React.ReactNode;
  if (headerOverride) {
    header = headerOverride;
  } else if (layout.header === 'giant') {
    header = (
      <View style={styles.giantWrap}>
        <View style={styles.giantRow}>
          <Text style={[styles.giantTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {title}
            <Text style={{ color: colors.primary }}>.</Text>
          </Text>
          {count !== undefined ? (
            <View style={[styles.giantCount, { borderColor: colors.primary }]}>
              <Text style={[styles.giantCountText, { color: colors.primary }]}>{count}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.giantKicker, { color: colors.textMuted }]}>{kicker}</Text>
        {right ? <View style={styles.giantRight}>{right}</View> : null}
      </View>
    );
  } else if (layout.header === 'magazine') {
    header = (
      <View style={styles.magWrap}>
        <Text style={[styles.magKicker, { color: colors.textMuted }]}>
          {kicker.toUpperCase()}
          {count !== undefined ? `  ·  ${count}` : ''}
        </Text>
        <View style={styles.magRow}>
          <Text style={[styles.magTitle, { color: colors.text }]}>{title}</Text>
          {right}
        </View>
        <View style={[styles.magBar, { backgroundColor: colors.primary }]} />
      </View>
    );
  } else {
    header = (
      <View style={styles.classicRow}>
        <Text style={[styles.classicTitle, { color: colors.text }]}>{title}</Text>
        {right}
      </View>
    );
  }

  return (
    <Screen style={[styles.flex, { paddingTop: topInset }, style]}>
      {header}
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  classicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  classicTitle: { fontSize: 26, fontWeight: '700' },

  giantWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  giantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  giantTitle: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5, flexShrink: 1 },
  giantCount: { minWidth: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  giantCountText: { fontSize: 22, fontWeight: '800' },
  giantKicker: { fontSize: 13, marginTop: -2, textTransform: 'capitalize' },
  giantRight: { marginTop: 10, alignSelf: 'flex-start' },

  magWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  magKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  magRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  magTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  magBar: { width: 56, height: 5, borderRadius: 3, marginTop: 8 },

  railRow: { flex: 1, flexDirection: 'row' },
  rail: { width: 42, alignItems: 'center', paddingTop: 14 },
  railLetter: { fontSize: 19, fontWeight: '800', lineHeight: 21 },
  railCount: { marginTop: 10, minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  railCountText: { fontSize: 13, fontWeight: '800' },
  railLine: { width: 2, flex: 1, marginTop: 12, borderRadius: 1 },
  railRight: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  railSpacer: { height: 14 },
});
