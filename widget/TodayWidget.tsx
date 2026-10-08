import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { Task } from '@/types';
import type { Translation } from '@/i18n/translations';
import { ON_PHOTO_PALETTE, WidgetCorners, WidgetPalette, widgetDeadlineLabel } from './widgetShared';
import { WidgetFrame, WidgetPhoto } from './WidgetFrame';

const MAX_TASKS_SHOWN = 4;

export interface WidgetTask extends Pick<Task, 'id' | 'title'> {
  deadlineAt: string;
}

interface TodayWidgetProps {
  upcomingTasks: WidgetTask[];
  /** null while Finance is locked — shown as •••• instead of the amount. */
  spentToday: number | null;
  currency: string;
  palette: WidgetPalette;
  corners: WidgetCorners | null;
  photo: WidgetPhoto | null;
  tr: Translation['homeWidgets'];
}

/** Deadline color: red once overdue, accent for anything due today, muted otherwise. */
function deadlineColor(iso: string, colors: Pick<WidgetPalette, 'danger' | 'accent' | 'textMuted'>) {
  const d = new Date(iso);
  const now = new Date();
  if (d.getTime() < now.getTime()) return colors.danger;
  if (d.toDateString() === now.toDateString()) return colors.accent;
  return colors.textMuted;
}

/** Large "today at a glance" widget: the next few undone tasks plus today's spending — tapping it
 * opens the app. Rendered by widget-task-handler.ts straight from SQLite (no React tree here). */
export function TodayWidget({ upcomingTasks, spentToday, currency, palette, corners, photo, tr }: TodayWidgetProps) {
  const colors = photo ? { ...palette, ...ON_PHOTO_PALETTE } : palette;

  return (
    <WidgetFrame palette={colors} corners={corners} photo={photo}>
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
          text={spentToday === null ? `🔒 •••• ${currency}` : `${spentToday.toFixed(0)} ${currency}`}
          style={{ fontSize: 15, fontWeight: 'bold', color: colors.danger as `#${string}` }}
        />
      </FlexWidget>
    </WidgetFrame>
  );
}
