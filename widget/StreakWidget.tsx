import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Translation } from '@/i18n/translations';
import { ON_PHOTO_PALETTE, WidgetCorners, WidgetPalette } from './widgetShared';
import { WidgetFrame, WidgetPhoto } from './WidgetFrame';

export interface StreakWidgetHabit {
  title: string;
  streak: number;
  doneToday: boolean;
}

interface StreakWidgetProps {
  /** null until a habit is picked for this widget. */
  habit: StreakWidgetHabit | null;
  /** Deep link to the habit picker for this widget. */
  pickUri: string;
  palette: WidgetPalette;
  corners: WidgetCorners | null;
  photo: WidgetPhoto | null;
  width: number;
  tr: Translation['homeWidgets'];
}

type Hex = `#${string}`;

/** 1×1 square: the flame, the streak number and the habit's name. Tapping it picks the habit. */
export function StreakWidget({ habit, pickUri, corners, photo, width, tr, ...rest }: StreakWidgetProps) {
  const palette = photo ? { ...rest.palette, ...ON_PHOTO_PALETTE } : rest.palette;
  // A 1×1 cell is ~60–80 dp; grow the number when the widget is stretched.
  const big = Math.max(24, Math.min(56, Math.round(width * 0.36)));

  if (!habit) {
    return (
      <WidgetFrame palette={palette} corners={corners} photo={photo} padding={8} justifyContent="center" openUri={pickUri}>
        <FlexWidget style={{ width: 'match_parent', alignItems: 'center', flexDirection: 'column' }}>
          <TextWidget text="🔥" style={{ fontSize: Math.round(big * 0.8) }} />
          <TextWidget
            text={tr.streakChoose}
            maxLines={2}
            style={{ fontSize: 10, color: palette.textMuted as Hex, textAlign: 'center' }}
          />
        </FlexWidget>
      </WidgetFrame>
    );
  }

  const active = habit.streak > 0;
  return (
    <WidgetFrame palette={palette} corners={corners} photo={photo} padding={8} justifyContent="center" openUri={pickUri}>
      <FlexWidget style={{ width: 'match_parent', alignItems: 'center', flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text="🔥" style={{ fontSize: Math.round(big * 0.62) }} />
          <TextWidget
            text={String(habit.streak)}
            style={{ fontSize: big, fontWeight: 'bold', color: (active ? palette.text : palette.textMuted) as Hex }}
          />
        </FlexWidget>
        <TextWidget
          text={habit.doneToday ? `✓ ${habit.title}` : habit.title}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, fontWeight: 'bold', color: (habit.doneToday ? palette.accent : palette.textMuted) as Hex, textAlign: 'center' }}
        />
      </FlexWidget>
    </WidgetFrame>
  );
}
