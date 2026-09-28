import * as Haptics from 'expo-haptics';

/** Thin wrapper around expo-haptics — every call is fire-and-forget and swallows errors, since
 * haptics are unavailable on web/some Android devices and should never break the action they
 * accompany. */
function fire(fn: () => Promise<void>): void {
  fn().catch(() => {});
}

export const haptics = {
  /** Light tap — toggling a checkbox, selecting a chip, starting a swipe/drag. */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Medium tap — completing a swipe action, dropping a dragged item into place. */
  impact: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Completing a task, saving a form. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Deleting something, a validation error. */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
