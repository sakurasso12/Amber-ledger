import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from './Screen';
import { Text } from './Text';

interface LayoutScreenProps {
  title: string;
  /** Shown under the rail letters (vertical header). */
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
  const topInset = useSafeAreaInsets().top;
  const { colors, layout } = theme;

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
          {/* Pulled left over the rail's empty edge (and kept off the right edge) so the cards sit
              roughly centred on screen instead of being pushed right by the rail. */}
          <View style={styles.railContent}>
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
  } else if (layout.header === 'accent') {
    header = (
      <View style={styles.accentRow}>
        <Text
          style={[styles.accentTitle, { color: colors.primary, textShadowColor: `${colors.primary}AA` }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
        {right}
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

  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  accentTitle: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },

  railRow: { flex: 1, flexDirection: 'row' },
  rail: { width: 36, alignItems: 'center', paddingTop: 14 },
  railContent: { flex: 1, marginLeft: -12, marginRight: 6 },
  railLetter: { fontSize: 19, fontWeight: '800', lineHeight: 21 },
  railCount: { marginTop: 10, minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  railCountText: { fontSize: 13, fontWeight: '800' },
  railLine: { width: 2, flex: 1, marginTop: 12, borderRadius: 1 },
  railRight: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  railSpacer: { height: 14 },
});
