package expo.modules.systemalarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.AlarmClock
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SystemAlarmModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext?.applicationContext ?: throw IllegalStateException("no context")

  override fun definition() = ModuleDefinition {
    Name("SystemAlarm")

    /** Is there a Clock app that accepts SET_ALARM? */
    Function("hasClock") {
      Intent(AlarmClock.ACTION_SET_ALARM).resolveActivity(ctx.packageManager) != null
    }

    Function("canRunInBackground") { Settings.canDrawOverlays(ctx) }

    Function("isBatteryUnrestricted") {
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    Function("openBackgroundSettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + ctx.packageName))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      (appContext.currentActivity ?: ctx).startActivity(intent)
    }

    Function("requestBatteryUnrestricted") {
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.packageName))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        (appContext.currentActivity ?: ctx).startActivity(intent)
      } catch (e: Exception) {
        val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        (appContext.currentActivity ?: ctx).startActivity(fallback)
      }
    }

    /** Replaces the whole queue (see AlarmQueue). Items: key, triggerAt, alarmAt (ms), hour, minute, label. */
    Function("sync") { items: List<Map<String, Any?>> ->
      val parsed = items.mapNotNull { m ->
        val key = m["key"] as? String ?: return@mapNotNull null
        AlarmQueue.Item(
          key = key,
          triggerAt = (m["triggerAt"] as? Number)?.toLong() ?: return@mapNotNull null,
          alarmAt = (m["alarmAt"] as? Number)?.toLong() ?: return@mapNotNull null,
          hour = (m["hour"] as? Number)?.toInt() ?: 0,
          minute = (m["minute"] as? Number)?.toInt() ?: 0,
          label = m["label"] as? String ?: "",
          hint = m["hint"] as? String ?: "",
        )
      }
      AlarmQueue.replace(ctx, parsed, appContext.currentActivity)
    }
  }
}
