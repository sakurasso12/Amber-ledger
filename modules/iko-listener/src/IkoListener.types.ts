/** One raw notification taken from the native queue. */
export interface RawIkoNotification {
  id: string;
  title: string;
  text: string;
  /** ms since epoch, when the notification was posted. */
  time: number;
}
