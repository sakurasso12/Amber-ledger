import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import { Task } from '@/types';
import type { Translation } from '@/i18n/translations';
import { WidgetPalette, widgetDeadlineLabel } from './widgetShared';

/** Used instead of the palette when a custom background photo is set — the photo's own brightness
 * is unknown, so everything renders light-on-dark-scrim for guaranteed legibility. */
const ON_PHOTO: WidgetPalette = {
  background: '#00000000',
  text: '#FFFFFF',
  textMuted: '#E4D8C6',
  accent: '#FFD9A8',
  danger: '#FF8A80',
  radius: 16,
};

const MAX_TASKS_SHOWN = 4;

export interface WidgetTask extends Pick<Task, 'id' | 'title'> {
  deadlineAt: string;
}

interface TodayWidgetProps {
  upcomingTasks: WidgetTask[];
  spentToday: number;
  currency: string;
  palette: WidgetPalette;
  tr: Translation['homeWidgets'];
  /** data: URI (already base64-inlined by widget-task-handler.ts — RemoteViews can't load a local
   * file:// path directly) of the user's chosen widget background photo, or null for the default. */
  backgroundImage: string | null;
  imageWidth: number;
  imageHeight: number;
}

/** Deadline color: red once overdue, accent for anything due today, muted otherwise. */
function deadlineColor(iso: string, colors: WidgetPalette) {
  const d = new Date(iso);
  const now = new Date();
  if (d.getTime() < now.getTime()) return colors.danger;
  if (d.toDateString() === now.toDateString()) return colors.accent;
  return colors.textMuted;
}

/** Large "today at a glance" widget: the next few undone tasks plus today's spending — tapping it
 * opens the app. Rendered by widget-task-handler.ts straight from SQLite (no React tree here). */
export function TodayWidget({
  upcomingTasks,
  spentToday,
  currency,
  palette,
  tr,
  backgroundImage,
  imageWidth,
  imageHeight,
}: TodayWidgetProps) {
  const colors = backgroundImage ? { ...ON_PHOTO, radius: palette.radius } : palette;

  const content = (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: backgroundImage ? undefined : (colors.background as `#${string}`),
        borderRadius: colors.radius,
        padding: 14,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <TextWidget text={tr.todayTitle} style={{ fontSize: 17, fontWeight: 'bold', color: colors.accent as `#${string}` }} />
        <TextWidget text="Amber Ledger" style={{ fontSize: 12, color: colors.textMuted as `#${string}` }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', marginTop: 10, flex: 1, width: 'match_parent' }}>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.slice(0, MAX_TASKS_SHOWN).map((task) => (
            <FlexWidget
              key={task.id}
              clickAction="OPEN_APP"
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, width: 'match_parent' }}
            >
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget
                  text={`• ${task.title}`}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 16, color: colors.text as `#${string}` }}
                />
              </FlexWidget>
              <TextWidget
                text={widgetDeadlineLabel(task.deadlineAt)}
                style={{ fontSize: 15, fontWeight: 'bold', color: deadlineColor(task.deadlineAt, colors) as `#${string}`, marginLeft: 8 }}
              />
            </FlexWidget>
          ))
        ) : (
          <TextWidget text={tr.noTasks} style={{ fontSize: 16, color: colors.textMuted as `#${string}` }} />
        )}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, width: 'match_parent' }}>
        <TextWidget text={tr.spentToday} style={{ fontSize: 14, color: colors.textMuted as `#${string}` }} />
        <TextWidget
          text={`${spentToday.toFixed(0)} ${currency}`}
          style={{ fontSize: 15, fontWeight: 'bold', color: colors.danger as `#${string}` }}
        />
      </FlexWidget>
    </FlexWidget>
  );

  if (!backgroundImage) return content;

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: colors.radius, overflow: 'hidden' }}>
      <ImageWidget
        image={backgroundImage as `data:image${string}`}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        resizeMode="cover"
        style={{ height: 'match_parent', width: 'match_parent' }}
      />
      {/* Dark scrim so text stays legible over an arbitrary photo. */}
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#00000066' }} />
      {content}
    </OverlapWidget>
  );
}
