import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { controlSurface } from '@/theme/surfaces';
import { SPRING } from '@/theme/motion';
import { haptics } from '@/lib/haptics';

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

const PAD = 3;
const GAP = 3;

/** iOS-style segmented control: the highlight slides between segments on a spring. */
export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const activeIndex = Math.max(0, segments.findIndex((s) => s.value === value));
  const position = useRef(new Animated.Value(activeIndex)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    Animated.spring(position, { toValue: activeIndex, ...SPRING, useNativeDriver: true }).start();
  }, [activeIndex, position]);

  const segmentWidth = width > 0 ? (width - PAD * 2 - GAP * (segments.length - 1)) / segments.length : 0;
  const radius = Math.max(0, theme.design.radius.control - 3);
  const wrapperStyle = StyleSheet.flatten([
    styles.wrapper,
    { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
    controlSurface(theme),
  ]);
  const border = typeof wrapperStyle.borderWidth === 'number' ? wrapperStyle.borderWidth : 0;

  return (
    // The highlight is positioned inside the border, so measure the width without it.
    <View style={wrapperStyle} onLayout={(e) => setWidth(e.nativeEvent.layout.width - border * 2)}>
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlight,
            {
              width: segmentWidth,
              borderRadius: radius,
              backgroundColor: theme.colors.primary,
              transform: [{ translateX: Animated.multiply(position, segmentWidth + GAP) }],
            },
          ]}
        />
      ) : null}
      {segments.map((segment) => {
        const isActive = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => {
              if (!isActive) haptics.tap();
              onChange(segment.value);
            }}
            style={[styles.segment, { borderRadius: radius }]}
          >
            <Text style={[styles.label, { color: isActive ? theme.colors.primaryText : theme.colors.textMuted }]}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: PAD,
    gap: GAP,
  },
  highlight: { position: 'absolute', left: PAD, top: PAD, bottom: PAD },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
