package expo.modules.systemalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Woken by AlarmManager at the alarm's hand-off time. */
class AlarmTriggerReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val key = intent.getStringExtra(AlarmQueue.EXTRA_KEY) ?: return
    AlarmQueue.fireKey(context.applicationContext, key)
  }
}

/** AlarmManager forgets everything on reboot / app update — re-arm the queue. */
class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED ->
        AlarmQueue.armAll(context.applicationContext)
    }
  }
}
