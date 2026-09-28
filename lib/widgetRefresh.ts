import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Pushes an immediate redraw of the home screen widget (e.g. right after the user changes its
 * background photo), instead of waiting for the next `updatePeriodMillis` tick. No-ops outside
 * Android and inside Expo Go — see index.js for why react-native-android-widget can't load there. */
export async function refreshHomeWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { buildTodayWidget, WIDGET_NAME } = require('../widget-task-handler');
    await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: buildTodayWidget });
  } catch (error) {
    console.warn('[widget] refresh failed:', error);
  }
}
