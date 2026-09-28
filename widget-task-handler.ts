import React from 'react';
import type { WidgetInfo, WidgetTaskHandler } from 'react-native-android-widget';
// SDK 57 replaced expo-file-system's API with a class-based File/Directory model; the classic
// path-string API (readAsStringAsync with base64 encoding) still ships under this subpath.
import * as FileSystem from 'expo-file-system/legacy';
import * as tasksRepo from '@/db/tasksRepo';
import * as financeRepo from '@/db/financeRepo';
import { getSetting } from '@/db/settingsRepo';
import { todayKey } from '@/lib/dateRanges';
import { TodayWidget } from './widget/TodayWidget';

export const WIDGET_NAME = 'AmberLedgerToday';

async function readWidgetSettings(): Promise<{ currency: string; backgroundImageUri: string | null }> {
  try {
    const raw = await getSetting('app-settings');
    const settings = raw ? JSON.parse(raw)?.state?.settings : null;
    return {
      currency: settings?.currency ?? 'zł',
      backgroundImageUri: settings?.homeWidgetBackgroundUri ?? null,
    };
  } catch {
    return { currency: 'zł', backgroundImageUri: null };
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

export async function buildTodayWidget(widgetInfo: WidgetInfo) {
  const [tasks, expenses, { currency, backgroundImageUri }] = await Promise.all([
    tasksRepo.listTasks(),
    financeRepo.listExpenses(),
    readWidgetSettings(),
  ]);

  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done' && t.deadlineAt)
    .sort((a, b) => (a.deadlineAt ?? '').localeCompare(b.deadlineAt ?? ''))
    .map((t) => ({ id: t.id, title: t.title, deadlineAt: t.deadlineAt as string }));

  const today = todayKey();
  const spentToday = expenses.filter((e) => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  const backgroundImage = await readBackgroundAsDataUri(backgroundImageUri);
  const { density } = widgetInfo.screenInfo;

  return React.createElement(TodayWidget, {
    upcomingTasks,
    spentToday,
    currency,
    backgroundImage,
    imageWidth: Math.max(1, Math.round(widgetInfo.width * density)),
    imageHeight: Math.max(1, Math.round(widgetInfo.height * density)),
  });
}

/** Headless task handler for the "Amber Ledger — Today" home screen widget (Android only). Reads
 * straight from SQLite via the same repo functions the app's stores use — this runs outside the
 * React tree, so there's no ThemeProvider/Zustand store mounted to read from. Registered from the
 * custom `index.js` entry point (see there for why expo-router needed a custom entry file). */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, widgetInfo, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;

  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
    renderWidget(await buildTodayWidget(widgetInfo));
  }
};
