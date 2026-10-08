import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';

/**
 * expo-notifications, loaded only where it works. In Expo Go on Android it throws on import; the
 * facade (./index) never loads these modules there, but Fast Refresh re-runs every file that depends
 * on an edited one — so they import the library through here instead of directly.
 */
const unavailable = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const Notifications: typeof NotificationsModule = unavailable
  ? ({} as typeof NotificationsModule)
  : require('expo-notifications');
