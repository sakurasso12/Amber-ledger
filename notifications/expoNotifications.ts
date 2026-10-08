import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';

/**
 * expo-notifications, loaded only where it works. In Expo Go on Android it throws on import; the
 * facade (./index) never loads these modules there, but Fast Refresh re-runs every file that depends
 * on an edited one — so they import the library through here instead of directly.
 */
const unavailable = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// In Expo Go every member is a do-nothing function, so even top-level calls (impl.ts sets the
// notification handler on load) are harmless when Fast Refresh re-runs those files.
const inert = new Proxy({}, { get: () => () => undefined }) as typeof NotificationsModule;

export const Notifications: typeof NotificationsModule = unavailable ? inert : require('expo-notifications');
