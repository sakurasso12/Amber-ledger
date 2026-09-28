// Custom entry point instead of the default "expo-router/entry" — needed so the Android home
// screen widget's headless task handler (react-native-android-widget) can register itself via
// AppRegistry before/alongside the app mounting. expo-router has no hook for this on its own.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import 'expo-router/entry';

// react-native-android-widget's New Architecture path calls TurboModuleRegistry.getEnforcing,
// which throws immediately at import time if the native module isn't linked — true in Expo Go,
// which can't include this third-party module. Only register in a dev-client/standalone build.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
