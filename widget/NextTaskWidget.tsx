import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Translation } from '@/i18n/translations';
import { formatDuration, widgetDeadlineLabel, WidgetPalette } from './widgetShared';
import type { WidgetTask } from './TodayWidget';

interface NextTaskWidgetProps {
  /** The soonest undone task with a deadline (an overdue one wins), or null. */
  task: WidgetTask | null;
  /** Other undone tasks due today besides the one shown. */
  moreToday: number;
  palette: WidgetPalette;
  tr: Translation['homeWidgets'];
}

/** Medium widget: the nearest task and how much time is left until its deadline. Home screen
 * widgets refresh about every 30 minutes, so the countdown is approximate between refreshes. */
export function NextTaskWidget({ task, moreToday, palette, tr }: NextTaskWidgetProps) {
  const msLeft = task ? new Date(task.deadlineAt).getTime() - Date.now() : 0;
  const overdue = msLeft < 0;
  const countdown = task ? (overdue ? tr.overdueBy(formatDuration(msLeft, tr)) : tr.dueIn(formatDuration(msLeft, tr))) : '';

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: palette.background as `#${string}`,
        borderRadius: palette.radius,
        padding: 14,
      }}
    >
      <TextWidget text={tr.nextTaskTitle} style={{ fontSize: 13, fontWeight: 'bold', color: palette.textMuted as `#${string}` }} />
      {task ? (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
          <TextWidget
            text={task.title}
            maxLines={2}
            truncate="END"
            style={{ fontSize: 18, fontWeight: 'bold', color: palette.text as `#${string}` }}
          />
          <TextWidget
            text={countdown}
            maxLines={1}
            style={{ fontSize: 20, fontWeight: 'bold', color: (overdue ? palette.danger : palette.accent) as `#${string}`, marginTop: 4 }}
          />
          <TextWidget
            text={widgetDeadlineLabel(task.deadlineAt)}
            style={{ fontSize: 13, color: palette.textMuted as `#${string}` }}
          />
        </FlexWidget>
      ) : (
        <TextWidget text={tr.noTasks} style={{ fontSize: 16, color: palette.textMuted as `#${string}` }} />
      )}
      {moreToday > 0 ? (
        <TextWidget text={tr.moreToday(moreToday)} style={{ fontSize: 12, color: palette.textMuted as `#${string}` }} />
      ) : (
        <TextWidget text=" " style={{ fontSize: 12 }} />
      )}
    </FlexWidget>
  );
}
