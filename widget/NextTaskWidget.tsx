import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Translation } from '@/i18n/translations';
import { formatDuration, ON_PHOTO_PALETTE, widgetDeadlineLabel, WidgetCorners, WidgetPalette } from './widgetShared';
import { WidgetFrame, WidgetPhoto } from './WidgetFrame';
import type { WidgetTask } from './TodayWidget';

interface NextTaskWidgetProps {
  /** The soonest undone task with a deadline (an overdue one wins), or null. */
  task: WidgetTask | null;
  /** Other undone tasks due today besides the one shown. */
  moreToday: number;
  palette: WidgetPalette;
  corners: WidgetCorners | null;
  photo: WidgetPhoto | null;
  width: number;
  height: number;
  tr: Translation['homeWidgets'];
}

type Hex = `#${string}`;

/** Medium widget: the nearest task and how much time is left until its deadline. Home screen
 * widgets refresh about every 30 minutes (and whenever tasks change), so the countdown is approximate. */
export function NextTaskWidget(props: NextTaskWidgetProps) {
  const { task, moreToday, corners, photo, width, height, tr } = props;
  const palette = photo ? { ...props.palette, ...ON_PHOTO_PALETTE } : props.palette;
  const msLeft = task ? new Date(task.deadlineAt).getTime() - Date.now() : 0;
  const overdue = msLeft < 0;
  const countdown = task ? (overdue ? tr.overdueBy(formatDuration(msLeft, tr)) : tr.dueIn(formatDuration(msLeft, tr))) : '';
  const countdownColor = (overdue ? palette.danger : palette.accent) as Hex;

  // Long horizontal strip: task on the left, countdown on the right.
  if (width > height * 2.2) {
    return (
      <WidgetFrame palette={palette} corners={corners} photo={photo} flexDirection="row" justifyContent="space-between">
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', height: 'match_parent' }}>
          <TextWidget text={tr.nextTaskTitle} style={{ fontSize: 12, fontWeight: 'bold', color: palette.textMuted as Hex }} />
          <TextWidget
            text={task ? task.title : tr.noTasks}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 17, fontWeight: 'bold', color: palette.text as Hex }}
          />
        </FlexWidget>
        {task ? (
          <FlexWidget style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', height: 'match_parent', marginLeft: 10 }}>
            <TextWidget text={countdown} maxLines={1} style={{ fontSize: 17, fontWeight: 'bold', color: countdownColor }} />
            <TextWidget text={widgetDeadlineLabel(task.deadlineAt)} style={{ fontSize: 12, color: palette.textMuted as Hex }} />
          </FlexWidget>
        ) : null}
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame palette={palette} corners={corners} photo={photo} justifyContent="space-between">
      <TextWidget text={tr.nextTaskTitle} style={{ fontSize: 13, fontWeight: 'bold', color: palette.textMuted as Hex }} />
      {task ? (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
          <TextWidget text={task.title} maxLines={2} truncate="END" style={{ fontSize: 18, fontWeight: 'bold', color: palette.text as Hex }} />
          <TextWidget text={countdown} maxLines={1} style={{ fontSize: 20, fontWeight: 'bold', color: countdownColor, marginTop: 4 }} />
          <TextWidget text={widgetDeadlineLabel(task.deadlineAt)} style={{ fontSize: 13, color: palette.textMuted as Hex }} />
        </FlexWidget>
      ) : (
        <TextWidget text={tr.noTasks} style={{ fontSize: 16, color: palette.textMuted as Hex }} />
      )}
      <TextWidget text={moreToday > 0 ? tr.moreToday(moreToday) : ' '} style={{ fontSize: 12, color: palette.textMuted as Hex }} />
    </WidgetFrame>
  );
}
