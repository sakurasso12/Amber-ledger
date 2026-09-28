import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getTranslation } from '@/i18n';

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Requests notification permission with an up-front rationale, since Android/iOS both show a
 * one-shot system prompt — better to explain why before that prompt burns itself. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;

  const tr = getTranslation().notificationsContent;

  if (current.canAskAgain) {
    const granted = await new Promise<boolean>((resolve) => {
      Alert.alert(tr.permissionTitle, tr.permissionMessage, [
        { text: tr.notNow, style: 'cancel', onPress: () => resolve(false) },
        {
          text: tr.allow,
          onPress: async () => {
            const result = await Notifications.requestPermissionsAsync();
            resolve(result.status === 'granted');
          },
        },
      ]);
    });
    return granted;
  }

  Alert.alert(tr.disabledTitle, tr.disabledMessage);
  return false;
}
