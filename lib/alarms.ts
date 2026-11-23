import { Alert, AppState } from 'react-native';
import SystemAlarm, { SystemAlarmItem } from '@/modules/system-alarm/src/SystemAlarmModule';
import { getTranslation } from '@/i18n';
import { Task } from '@/types';
import { nextOccurrence } from '@/lib/recurrence';

/**
 * Task alarms in the system Clock app (Android).
 *
 * The Clock only takes "hour:minute" and rings at the next such time, so we can't set it days
 * ahead. Each task with `alarm` on becomes a queue item handed to the native module: at midnight
 * of the task's day (or right away if that's already passed) it puts the alarm into the Clock.
 * Ringtone, snooze and silent mode are then the Clock's business.
 */

function hasClock(): boolean {
  try {
    return !!SystemAlarm && SystemAlarm.hasClock();
  } catch {
    return false;
  }
}

/** False on iOS / web / Expo Go / phones without a Clock — the toggle is hidden then. */
export const ALARMS_AVAILABLE = hasClock();

/** How far ahead to keep wake-ups armed; tasks further out join the queue on a later sync. */
const HORIZON_MS = 45 * 24 * 60 * 60_000;
/** Hand-off must happen before the alarm time (SET_ALARM picks the NEXT hour:minute). */
const LEAD_MS = 5 * 60_000;

/** Recurring tasks: how many upcoming days get an alarm queued (re-topped on every sync). */
const MAX_OCCURRENCES = 14;

/** The alarm times of a task from now on — one for a plain task, the next few for a repeating one. */
function alarmTimes(task: Task, now: number): number[] {
  if (!task.deadlineAt) return [];
  const first = new Date(task.deadlineAt).getTime();
  if (!Number.isFinite(first)) return [];
  if (!task.recurrenceRule) return [first];
  const times: number[] = [];
  let deadline: string | null = task.deadlineAt;
  // A missed instance (not ticked off yesterday) still repeats today — walk the rule forward.
  for (let safety = 0; deadline && times.length < MAX_OCCURRENCES && safety < 1000; safety++) {
    const t = new Date(deadline).getTime();
    if (t > now + HORIZON_MS) break;
    if (t > now) times.push(t);
    deadline = nextOccurrence(task.recurrenceRule, deadline);
  }
  return times;
}

/**
 * Days for a repeating Clock alarm (java.util.Calendar: 1 = Sunday … 7 = Saturday), or null when
 * the rule can't be one (every 2 days, monthly…) — those get a one-off alarm per occurrence.
 */
export function repeatDays(task: Task): number[] | null {
  const rule = task.recurrenceRule;
  if (!rule || (rule.interval ?? 1) !== 1 || rule.until) return null;
  if (rule.freq === 'daily') return [1, 2, 3, 4, 5, 6, 7];
  if (rule.freq === 'weekly') {
    const js = rule.weekdays && rule.weekdays.length ? rule.weekdays : task.deadlineAt ? [new Date(task.deadlineAt).getDay()] : [];
    return js.length ? [...new Set(js)].sort().map((d) => d + 1) : null;
  }
  return null;
}

export function alarmItems(tasks: Task[], now = Date.now()): SystemAlarmItem[] {
  const hint = getTranslation().alarm.tapToSet;
  const byKey = new Map<string, SystemAlarmItem>();
  for (const task of tasks) {
    if (!task.alarm || task.status === 'done') continue;
    // Every day / every week on set days: ONE repeating alarm in the Clock, which then repeats it
    // by itself — no nightly hand-off that a sleeping phone can miss (it rang only once).
    const repeat = repeatDays(task);
    if (repeat && task.deadlineAt) {
      const at = new Date(task.deadlineAt);
      const hour = at.getHours();
      const minute = at.getMinutes();
      const key = `${task.seriesId ?? task.id}@repeat@${hour}:${minute}@${repeat.join('')}`;
      byKey.set(key, {
        key,
        triggerAt: now - 1,
        alarmAt: alarmTimes(task, now)[0] ?? now + 24 * 60 * 60_000,
        hour,
        minute,
        label: task.title.slice(0, 80),
        hint,
        days: repeat,
      });
      continue;
    }
    for (const alarmAt of alarmTimes(task, now)) {
      if (alarmAt <= now + 30_000 || alarmAt > now + HORIZON_MS) continue;
      const at = new Date(alarmAt);
      const midnight = new Date(at);
      midnight.setHours(0, 0, 0, 0);
      // Keyed by series, not instance: ticking a repeating task off creates a new instance for
      // the same next day, and that must not put a second alarm into the Clock.
      // A moved deadline is a new key, so it gets set again.
      const key = `${task.seriesId ?? task.id}@${alarmAt}`;
      byKey.set(key, {
        key,
        triggerAt: Math.min(midnight.getTime(), alarmAt - LEAD_MS),
        alarmAt,
        hour: at.getHours(),
        minute: at.getMinutes(),
        label: task.title.slice(0, 80),
        hint,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.triggerAt - b.triggerAt);
}

let lastSent = '';

/** Safe to call on every task change — only talks to native when the queue actually changed. */
export function syncAlarms(tasks: Task[]): void {
  if (!ALARMS_AVAILABLE || !SystemAlarm) return;
  const items = alarmItems(tasks);
  const signature = JSON.stringify(items.map((i) => [i.key, i.label]));
  if (signature === lastSent) return;
  lastSent = signature;
  try {
    SystemAlarm.sync(items);
  } catch (error) {
    console.warn('[alarm] sync failed:', error);
  }
}

/**
 * Asked the first time an alarm is turned on: "display over other apps" (so the midnight hand-off
 * can open the Clock while we're closed) and no battery restrictions (so it isn't delayed).
 * Without them it still works — a "tap to set" notification comes instead.
 */
export function askAlarmPermissions(): void {
  if (!ALARMS_AVAILABLE || !SystemAlarm) return;
  const module = SystemAlarm;
  const needOverlay = !module.canRunInBackground();
  const needBattery = !module.isBatteryUnrestricted();
  if (!needOverlay && !needBattery) return;
  const tr = getTranslation().alarm;
  Alert.alert(tr.permTitle, tr.permMessage, [
    { text: tr.permLater, style: 'cancel' },
    {
      text: tr.permAllow,
      onPress: () => {
        if (!needBattery) {
          module.openBackgroundSettings();
          return;
        }
        module.requestBatteryUnrestricted();
        if (!needOverlay) return;
        // The battery dialog first; the overlay screen once we're back from it.
        let left = false;
        const sub = AppState.addEventListener('change', (state) => {
          if (state !== 'active') {
            left = true;
            return;
          }
          if (!left) return;
          sub.remove();
          if (!module.canRunInBackground()) module.openBackgroundSettings();
        });
      },
    },
  ]);
}
