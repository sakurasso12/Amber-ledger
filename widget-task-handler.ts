import React from 'react';
import type { WidgetInfo, WidgetTaskHandler } from 'react-native-android-widget';
// SDK 57 replaced expo-file-system's API with a class-based File/Directory model; the classic
// path-string API (readAsStringAsync with base64 encoding) still ships under this subpath.
import * as FileSystem from 'expo-file-system/legacy';
import { differenceInCalendarDays } from 'date-fns';
import * as tasksRepo from '@/db/tasksRepo';
import * as financeRepo from '@/db/financeRepo';
import { getSetting } from '@/db/settingsRepo';
import { todayKey } from '@/lib/dateRanges';
import { imageSizeFromBase64 } from '@/lib/imageSize';
import { DESIGNS, DesignId } from '@/theme/designs';
import { LAYOUTS, LayoutId } from '@/theme/layouts';
import type { WidgetPhoto } from './widget/WidgetFrame';
import { translations } from '@/i18n/translations';
import type { AppLanguage } from '@/types';
import { TodayWidget, WidgetTask } from './widget/TodayWidget';
import { DayOffWidget } from './widget/DayOffWidget';
import { NextTaskWidget } from './widget/NextTaskWidget';
import { StreakWidget } from './widget/StreakWidget';
import { buildHabits } from '@/lib/streaks';

export const WIDGET_NAME = 'AmberLedgerToday';
export const DAY_OFF_WIDGET_NAME = 'AmberLedgerDayOff';
export const NEXT_TASK_WIDGET_NAME = 'AmberLedgerNextTask';
export const STREAK_WIDGET_NAME = 'AmberLedgerStreak';
export const ALL_WIDGET_NAMES = [WIDGET_NAME, DAY_OFF_WIDGET_NAME, NEXT_TASK_WIDGET_NAME, STREAK_WIDGET_NAME];

interface WidgetSettings {
  currency: string;
  /** Background photo per widget name. */
  backgrounds: Record<string, string | null>;
  designId: DesignId;
  layoutId: LayoutId;
  language: AppLanguage;
  /** Finance lock is on and not currently unlocked — widgets show •••• instead of amounts. */
  moneyHidden: boolean;
  /** Streak widget id → habit series id. */
  streakWidgets: Record<string, string>;
}

async function readWidgetSettings(): Promise<WidgetSettings> {
  const fallback: WidgetSettings = { currency: 'zł', backgrounds: {}, designId: 'amber', layoutId: 'standard', language: 'en', moneyHidden: false, streakWidgets: {} };
  try {
    const raw = await getSetting('app-settings');
    const settings = raw ? JSON.parse(raw)?.state?.settings : null;
    return {
      currency: settings?.currency ?? fallback.currency,
      backgrounds: { ...(settings?.homeWidgetBackgrounds ?? {}), [WIDGET_NAME]: settings?.homeWidgetBackgroundUri ?? null },
      layoutId: settings?.layoutId && LAYOUTS[settings.layoutId as LayoutId] ? settings.layoutId : fallback.layoutId,
      designId: settings?.designId && DESIGNS[settings.designId as DesignId] ? settings.designId : fallback.designId,
      language: settings?.language && translations[settings.language as AppLanguage] ? settings.language : fallback.language,
      moneyHidden:
        !!settings?.financeLockEnabled &&
        !(settings?.financeUnlockedUntil && new Date(settings.financeUnlockedUntil).getTime() > Date.now()),
      streakWidgets: settings?.streakWidgets ?? {},
    };
  } catch {
    return fallback;
  }
}

/** Android widgets (RemoteViews) can't load an app-private file:// URI directly — ImageWidget only
 * accepts http(s) or data: URIs — so the picked photo is inlined as a base64 data URI here. */
async function readBackgroundAsDataUri(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase();
    const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    console.warn('[widget] failed to read background image:', error);
    return null;
  }
}

/**
 * The widget's background photo, sized to cover the widget while keeping its proportions. The
 * widget library first scales the bitmap to exactly imageWidth × imageHeight and only then
 * centre-crops it, so passing the widget's own size squashed every photo whose shape differed;
 * passing the photo's aspect ratio, scaled up to cover the widget, gives a proper centred crop.
 * Sizes are in dp (the library converts them to pixels).
 */
async function widgetPhoto(widgetInfo: WidgetInfo, settings: WidgetSettings): Promise<WidgetPhoto | null> {
  const image = await readBackgroundAsDataUri(settings.backgrounds[widgetInfo.widgetName] ?? null);
  if (!image) return null;
  const widgetWidth = Math.max(1, widgetInfo.width);
  const widgetHeight = Math.max(1, widgetInfo.height);
  const source = imageSizeFromBase64(image.slice(image.indexOf(',') + 1));
  if (!source || source.width <= 0 || source.height <= 0) {
    return { image, width: widgetWidth, height: widgetHeight };
  }
  const scale = Math.max(widgetWidth / source.width, widgetHeight / source.height);
  return {
    image,
    width: Math.max(widgetWidth, Math.round(source.width * scale)),
    height: Math.max(widgetHeight, Math.round(source.height * scale)),
  };
}

/** Palette from the theme style, corners from the app design (layout). */
function widgetLook(settings: WidgetSettings) {
  return { palette: DESIGNS[settings.designId].widget, corners: LAYOUTS[settings.layoutId].widgetCorners };
}

async function upcomingTasks(): Promise<WidgetTask[]> {
  const tasks = await tasksRepo.listTasks();
  return tasks
    .filter((t) => t.status !== 'done' && t.deadlineAt)
    .sort((a, b) => (a.deadlineAt ?? '').localeCompare(b.deadlineAt ?? ''))
    .map((t) => ({ id: t.id, title: t.title, deadlineAt: t.deadlineAt as string }));
}

export async function buildTodayWidget(widgetInfo: WidgetInfo) {
  const [tasks, expenses, settings] = await Promise.all([upcomingTasks(), financeRepo.listExpenses(), readWidgetSettings()]);
  const today = todayKey();
  const spentToday = expenses.filter((e) => e.date === today).reduce((sum, e) => sum + e.amount, 0);

  return React.createElement(TodayWidget, {
    upcomingTasks: tasks,
    spentToday: settings.moneyHidden ? null : spentToday,
    currency: settings.currency,
    ...widgetLook(settings),
    photo: await widgetPhoto(widgetInfo, settings),
    tr: translations[settings.language].homeWidgets,
  });
}

export async function buildDayOffWidget(widgetInfo: WidgetInfo) {
  const [workDays, settings] = await Promise.all([financeRepo.listWorkDays(), readWidgetSettings()]);
  const today = todayKey();
  const future = workDays.filter((w) => w.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const dayOff = future.find((w) => !w.isWorked) ?? null;
  const shiftsBefore = dayOff ? future.filter((w) => w.isWorked && w.date < dayOff.date).length : 0;
  const daysUntil = dayOff ? differenceInCalendarDays(new Date(`${dayOff.date}T12:00:00`), new Date(`${today}T12:00:00`)) : 0;

  return React.createElement(DayOffWidget, {
    nextDayOff: dayOff?.date ?? null,
    daysUntil,
    shiftsBefore,
    localeCode: translations[settings.language].localeCode,
    ...widgetLook(settings),
    photo: await widgetPhoto(widgetInfo, settings),
    width: widgetInfo.width,
    height: widgetInfo.height,
    tr: translations[settings.language].homeWidgets,
  });
}

export async function buildNextTaskWidget(widgetInfo: WidgetInfo) {
  const [tasks, settings] = await Promise.all([upcomingTasks(), readWidgetSettings()]);
  const task = tasks[0] ?? null;
  const todayString = new Date().toDateString();
  const moreToday = tasks.filter((t) => t !== task && new Date(t.deadlineAt).toDateString() === todayString).length;

  return React.createElement(NextTaskWidget, {
    task,
    moreToday,
    ...widgetLook(settings),
    photo: await widgetPhoto(widgetInfo, settings),
    width: widgetInfo.width,
    height: widgetInfo.height,
    tr: translations[settings.language].homeWidgets,
  });
}

export async function buildStreakWidget(widgetInfo: WidgetInfo) {
  const [tasks, settings] = await Promise.all([tasksRepo.listTasks(), readWidgetSettings()]);
  const seriesId = settings.streakWidgets[String(widgetInfo.widgetId)];
  const habit = seriesId ? buildHabits(tasks).find((h) => h.seriesId === seriesId) ?? null : null;

  return React.createElement(StreakWidget, {
    habit: habit ? { title: habit.title, streak: habit.streak, doneToday: habit.doneToday } : null,
    pickUri: `amberledger://habit-widget?widgetId=${widgetInfo.widgetId}`,
    ...widgetLook(settings),
    photo: await widgetPhoto(widgetInfo, settings),
    width: widgetInfo.width,
    tr: translations[settings.language].homeWidgets,
  });
}

/** Builds whichever of the app's home screen widgets `widgetInfo` refers to. */
export async function buildWidget(widgetInfo: WidgetInfo) {
  if (widgetInfo.widgetName === STREAK_WIDGET_NAME) return buildStreakWidget(widgetInfo);
  if (widgetInfo.widgetName === DAY_OFF_WIDGET_NAME) return buildDayOffWidget(widgetInfo);
  if (widgetInfo.widgetName === NEXT_TASK_WIDGET_NAME) return buildNextTaskWidget(widgetInfo);
  return buildTodayWidget(widgetInfo);
}

/** Headless task handler for the home screen widgets (Android only). Reads straight from SQLite via
 * the same repo functions the app's stores use — this runs outside the React tree, so there's no
 * ThemeProvider/Zustand store mounted to read from. Registered from the custom `index.js` entry
 * point (see there for why expo-router needed a custom entry file). */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, widgetInfo, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;

  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
    renderWidget(await buildWidget(widgetInfo));
  }
};
