import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Translation } from '@/i18n/translations';
import { ON_PHOTO_PALETTE, WidgetCorners, WidgetPalette } from './widgetShared';
import { WidgetFrame, WidgetPhoto } from './WidgetFrame';

interface DayOffWidgetProps {
  /** Date key (yyyy-MM-dd) of the next day marked as a day off (red) in the work calendar, or null. */
  nextDayOff: string | null;
  /** Calendar days from today to that day off (0 = today). */
  daysUntil: number;
  /** Days marked as worked between today and the day off. */
  shiftsBefore: number;
  localeCode: string;
  palette: WidgetPalette;
  corners: WidgetCorners | null;
  photo: WidgetPhoto | null;
  /** Widget size in dp — the layout changes for tall (vertical) and long (strip) shapes. */
  width: number;
  height: number;
  tr: Translation['homeWidgets'];
}

type Hex = `#${string}`;

/** Small widget: when the next day off is, based on the days marked in the work calendar. */
export function DayOffWidget(props: DayOffWidgetProps) {
  const { nextDayOff, daysUntil, shiftsBefore, localeCode, corners, photo, width, height, tr } = props;
  const palette = photo ? { ...props.palette, ...ON_PHOTO_PALETTE } : props.palette;
  const when = !nextDayOff ? tr.noDayOff : daysUntil === 0 ? tr.dayOffToday : daysUntil === 1 ? tr.dayOffTomorrow : tr.dayOffIn(daysUntil);
  const dateLabel = nextDayOff
    ? new Date(`${nextDayOff}T12:00:00`).toLocaleDateString(localeCode, { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const highlight = (daysUntil === 0 && nextDayOff ? palette.danger : palette.text) as Hex;

  // Tall shape: one giant number of days, stacked.
  if (height > width * 1.3) {
    return (
      <WidgetFrame palette={palette} corners={corners} photo={photo} justifyContent="space-between">
        <TextWidget text="🌴" style={{ fontSize: 22 }} />
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={nextDayOff ? String(daysUntil) : '—'} style={{ fontSize: 56, fontWeight: 'bold', color: highlight }} />
          <TextWidget text={tr.days} style={{ fontSize: 16, fontWeight: 'bold', color: palette.textMuted as Hex }} />
        </FlexWidget>
        <TextWidget text={dateLabel || tr.noDayOff} maxLines={2} style={{ fontSize: 12, color: palette.textMuted as Hex }} />
      </WidgetFrame>
    );
  }

  // Long strip: title on the left, the answer on the right.
  if (width > height * 2.6) {
    return (
      <WidgetFrame palette={palette} corners={corners} photo={photo} flexDirection="row" justifyContent="space-between">
        <FlexWidget style={{ flexDirection: 'column', justifyContent: 'center', height: 'match_parent' }}>
          <TextWidget text={`🌴 ${tr.dayOffTitle}`} style={{ fontSize: 13, fontWeight: 'bold', color: palette.textMuted as Hex }} />
          {nextDayOff ? <TextWidget text={dateLabel} style={{ fontSize: 12, color: palette.textMuted as Hex }} /> : null}
        </FlexWidget>
        <FlexWidget style={{ justifyContent: 'center', height: 'match_parent' }}>
          <TextWidget text={when} maxLines={1} style={{ fontSize: 24, fontWeight: 'bold', color: highlight }} />
        </FlexWidget>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame palette={palette} corners={corners} photo={photo} padding={12} justifyContent="center">
      <TextWidget text={`🌴 ${tr.dayOffTitle}`} style={{ fontSize: 13, fontWeight: 'bold', color: palette.textMuted as Hex }} />
      <TextWidget text={when} maxLines={1} style={{ fontSize: 24, fontWeight: 'bold', color: highlight }} />
      {nextDayOff ? (
        <TextWidget text={`${dateLabel} · ${tr.shiftsBefore(shiftsBefore)}`} maxLines={1} style={{ fontSize: 12, color: palette.textMuted as Hex }} />
      ) : null}
    </WidgetFrame>
  );
}
