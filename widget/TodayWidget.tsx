import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import { Task } from '@/types';

/** Fixed color scheme — the widget runs in a headless native context with no ThemeProvider, so
 * it can't read the app's live theme. Matches the light ("Amber") theme's palette. */
const COLORS = {
  background: '#FFFFFF',
  border: '#E4D8C6',
  text: '#241C13',
  textMuted: '#8A7A64',
  primary: '#B9702E',
  danger: '#C1502E',
} as const;

/** Used instead of COLORS.* when a custom background photo is set — the photo's own brightness is
 * unknown, so everything renders light-on-dark-scrim for guaranteed legibility. */
const ON_PHOTO_COLORS = {
  text: '#FFFFFF',
  textMuted: '#E4D8C6',
  accent: '#FFD9A8',
  danger: '#FF8A80',
} as const;

const MAX_TASKS_SHOWN = 3;

interface WidgetTask extends Pick<Task, 'id' | 'title'> {
  deadlineAt: string;
}

interface TodayWidgetProps {
  upcomingTasks: WidgetTask[];
  spentToday: number;
  currency: string;
  /** data: URI (already base64-inlined by widget-task-handler.ts — RemoteViews can't load a local
   * file:// path directly) of the user's chosen widget background photo, or null for the default. */
  backgroundImage: string | null;
  imageWidth: number;
  imageHeight: number;
}

/** Compact deadline label — just the time if it's today, otherwise "DD.MM HH:MM". */
function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return time;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${time}`;
}

type WidgetColor = (typeof COLORS)[keyof typeof COLORS] | (typeof ON_PHOTO_COLORS)[keyof typeof ON_PHOTO_COLORS];

/** Deadline color: lit up red once overdue, lit up amber for anything due today, muted otherwise. */
function deadlineColor(iso: string, onPhoto: boolean): WidgetColor {
  const d = new Date(iso);
  const now = new Date();
  if (d.getTime() < now.getTime()) return onPhoto ? ON_PHOTO_COLORS.danger : COLORS.danger;
  if (d.toDateString() === now.toDateString()) return onPhoto ? ON_PHOTO_COLORS.accent : COLORS.primary;
  return onPhoto ? ON_PHOTO_COLORS.textMuted : COLORS.textMuted;
}

/** "Today at a glance" home screen widget: the next few undone tasks plus today's spending —
 * tapping it opens the app. Rendered by widget-task-handler.ts, which fetches the data directly
 * from SQLite (no React tree / Zustand store is mounted in this headless context). */
export function TodayWidget({ upcomingTasks, spentToday, currency, backgroundImage, imageWidth, imageHeight }: TodayWidgetProps) {
  const onPhoto = !!backgroundImage;
  const textColor = onPhoto ? ON_PHOTO_COLORS.text : COLORS.text;
  const mutedColor = onPhoto ? ON_PHOTO_COLORS.textMuted : COLORS.textMuted;
  const titleColor = onPhoto ? ON_PHOTO_COLORS.accent : COLORS.primary;

  const content = (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: onPhoto ? undefined : COLORS.background,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <TextWidget text="Amber Ledger" style={{ fontSize: 13, fontWeight: 'bold', color: titleColor }} />

      <FlexWidget style={{ flexDirection: 'column', marginTop: 8, flex: 1 }}>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.slice(0, MAX_TASKS_SHOWN).map((task) => (
            <FlexWidget
              key={task.id}
              clickAction="OPEN_APP"
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
            >
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget text={`• ${task.title}`} maxLines={1} truncate="END" style={{ fontSize: 13, color: textColor }} />
              </FlexWidget>
              <TextWidget
                text={formatDeadline(task.deadlineAt)}
                style={{ fontSize: 12, fontWeight: 'bold', color: deadlineColor(task.deadlineAt, onPhoto), marginLeft: 6 }}
              />
            </FlexWidget>
          ))
        ) : (
          <TextWidget text="Нет активных задач" style={{ fontSize: 13, color: mutedColor }} />
        )}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 8 }}>
        <TextWidget text="Сегодня потрачено" style={{ fontSize: 11, color: mutedColor }} />
        <TextWidget
          text={`${spentToday.toFixed(0)} ${currency}`}
          style={{ fontSize: 11, fontWeight: 'bold', color: onPhoto ? ON_PHOTO_COLORS.danger : COLORS.danger }}
        />
      </FlexWidget>
    </FlexWidget>
  );

  if (!backgroundImage) return content;

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent', borderRadius: 16, overflow: 'hidden' }}>
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
