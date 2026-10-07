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
import { DESIGNS, DesignId } from '@/theme/designs';
import { LAYOUTS, LayoutId } from '@/theme/layouts';
import type { WidgetPhoto } from './widget/WidgetFrame';
import { translations } from '@/i18n/translations';
import type { AppLanguage } from '@/types';
import { TodayWidget, WidgetTask } from './widget/TodayWidget';
import { DayOffWidget } from './widget/DayOffWidget';
import { NextTaskWidget } from './widget/NextTaskWidget';

export const WIDGET_NAME = 'AmberLedgerToday';
export const DAY_OFF_WIDGET_NAME = 'AmberLedgerDayOff';
export const NEXT_TASK_WIDGET_NAME = 'AmberLedgerNextTask';
export const ALL_WIDGET_NAMES = [WIDGET_NAME, DAY_OFF_WIDGET_NAME, NEXT_TASK_WIDGET_NAME];

interface WidgetSettings {
  currency: string;
  /** Background photo per widget name. */
  backgrounds: Record<string, string | null>;
  designId: DesignId;
  layoutId: LayoutId;
  language: AppLanguage;
}

async function readWidgetSettings(): Promise<WidgetSettings> {
  const fallback: WidgetSettings = { currency: 'zł', backgrounds: {}, designId: 'amber', layoutId: 'standard', language: 'ru' };
  try {
    const raw = await getSetting('app-settings');
    const settings = raw ? JSON.parse(raw)?.state?.settings : null;
    return {
      currency: settings?.currency ?? fallback.currency,
      backgrounds: { ...(settings?.homeWidgetBackgrounds ?? {}), [WIDGET_NAME]: settings?.homeWidgetBackgroundUri ?? null },
      layoutId: settings?.layoutId && LAYOUTS[settings.layoutId as LayoutId] ? settings.layoutId : fallback.layoutId,
      designId: settings?.designId && DESIGNS[settings.designId as DesignId] ? settings.designId : fallback.designId,
      language: settings?.language && translations[settings.language as AppLanguage] ? settings.language : fallback.language,
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

/** The widget's background photo at its pixel size, or null when it has none. */
async function widgetPhoto(widgetInfo: WidgetInfo, settings: WidgetSettings): Promise<WidgetPhoto | null> {
  const image = await readBackgroundAsDataUri(settings.backgrounds[widgetInfo.widgetName] ?? null);
  if (!image) return null;
  const { density } = widgetInfo.screenInfo;
  return {
    image,
    width: Math.max(1, Math.round(widgetInfo.width * density)),
    height: Math.max(1, Math.round(widgetInfo.height * density)),
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
    spentToday,
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

/** Builds whichever of the app's home screen widgets `widgetInfo` refers to. */
export async function buildWidget(widgetInfo: WidgetInfo) {
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
