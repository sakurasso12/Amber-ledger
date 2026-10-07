import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Translation } from '@/i18n/translations';
import { WidgetPalette } from './widgetShared';

interface DayOffWidgetProps {
  /** Date key (yyyy-MM-dd) of the next day marked as a day off (red) in the work calendar, or null. */
  nextDayOff: string | null;
  /** Calendar days from today to that day off (0 = today). */
  daysUntil: number;
  /** Days marked as worked between today and the day off. */
  shiftsBefore: number;
  localeCode: string;
  palette: WidgetPalette;
  tr: Translation['homeWidgets'];
}

/** Small widget: when the next day off is, based on the days marked in the work calendar. */
export function DayOffWidget({ nextDayOff, daysUntil, shiftsBefore, localeCode, palette, tr }: DayOffWidgetProps) {
  const when = !nextDayOff ? tr.noDayOff : daysUntil === 0 ? tr.dayOffToday : daysUntil === 1 ? tr.dayOffTomorrow : tr.dayOffIn(daysUntil);
  const dateLabel = nextDayOff
    ? new Date(`${nextDayOff}T12:00:00`).toLocaleDateString(localeCode, { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: palette.background as `#${string}`,
        borderRadius: palette.radius,
        padding: 12,
      }}
    >
      <TextWidget text={`🌴 ${tr.dayOffTitle}`} style={{ fontSize: 13, fontWeight: 'bold', color: palette.textMuted as `#${string}` }} />
      <TextWidget
        text={when}
        maxLines={1}
        style={{ fontSize: 24, fontWeight: 'bold', color: (daysUntil === 0 && nextDayOff ? palette.danger : palette.text) as `#${string}` }}
      />
      {nextDayOff ? (
        <TextWidget
          text={`${dateLabel} · ${tr.shiftsBefore(shiftsBefore)}`}
          maxLines={1}
          style={{ fontSize: 12, color: palette.textMuted as `#${string}` }}
        />
      ) : null}
    </FlexWidget>
  );
}
