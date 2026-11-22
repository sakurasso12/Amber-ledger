package expo.modules.systemalarm

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.AlarmClock
import android.provider.Settings
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Task alarms handed to the system Clock app.
 *
 * The Clock's SET_ALARM intent only takes hour + minute (it rings at the next such time), so an
 * alarm can't be set days ahead. Instead JS gives us a queue — "at [triggerAt] put an alarm for
 * [hour]:[minute] into the Clock" — and AlarmManager wakes [AlarmTriggerReceiver] at that moment
 * (midnight of the alarm's day). The queue lives in SharedPreferences so it survives the app being
 * killed and a reboot ([AlarmBootReceiver] re-arms it).
 */
object AlarmQueue {
  private const val TAG = "SystemAlarm"
  private const val PREFS = "amber_system_alarms"
  private const val KEY_ITEMS = "items"
  private const val KEY_FIRED = "fired"
  private const val CHANNEL = "system-alarm-setup"
  const val ACTION_TRIGGER = "expo.modules.systemalarm.TRIGGER"
  const val EXTRA_KEY = "key"

  data class Item(
    val key: String,
    val triggerAt: Long,
    val alarmAt: Long,
    val hour: Int,
    val minute: Int,
    val label: String,
    /** Translated "tap to set the alarm" (fallback notification text). */
    val hint: String,
  ) {
    fun toJson(): JSONObject = JSONObject()
      .put("key", key).put("triggerAt", triggerAt).put("alarmAt", alarmAt)
      .put("hour", hour).put("minute", minute).put("label", label).put("hint", hint)

    companion object {
      fun fromJson(o: JSONObject) = Item(
        o.getString("key"), o.getLong("triggerAt"), o.getLong("alarmAt"),
        o.getInt("hour"), o.getInt("minute"), o.optString("label"), o.optString("hint"),
      )
    }
  }

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun load(ctx: Context): List<Item> {
    val raw = prefs(ctx).getString(KEY_ITEMS, null) ?: return emptyList()
    return try {
      val arr = JSONArray(raw)
      (0 until arr.length()).map { Item.fromJson(arr.getJSONObject(it)) }
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun fired(ctx: Context): Set<String> = prefs(ctx).getStringSet(KEY_FIRED, emptySet()) ?: emptySet()

  private fun markFired(ctx: Context, key: String) {
    prefs(ctx).edit().putStringSet(KEY_FIRED, fired(ctx) + key).apply()
  }

  /** Replaces the queue: cancels wake-ups that are gone, arms the new ones, fires the due ones. */
  fun replace(ctx: Context, items: List<Item>, foreground: Context?) {
    val old = load(ctx)
    val keys = items.map { it.key }.toSet()
    for (item in old) if (item.key !in keys) cancel(ctx, item)
    val arr = JSONArray()
    items.forEach { arr.put(it.toJson()) }
    // Forget "already set" marks of items that left the queue (done / moved / deleted tasks).
    prefs(ctx).edit()
      .putString(KEY_ITEMS, arr.toString())
      .putStringSet(KEY_FIRED, fired(ctx).filter { it in keys }.toSet())
      .apply()
    armAll(ctx, foreground)
  }

  fun armAll(ctx: Context, foreground: Context? = null) {
    val now = System.currentTimeMillis()
    val done = fired(ctx)
    for (item in load(ctx)) {
      if (item.key in done || item.alarmAt <= now) continue
      if (item.triggerAt <= now) fire(ctx, item, foreground) else arm(ctx, item)
    }
  }

  private fun pending(ctx: Context, item: Item): PendingIntent {
    val intent = Intent(ctx, AlarmTriggerReceiver::class.java).apply {
      action = ACTION_TRIGGER
      data = Uri.parse("amberalarm://" + Uri.encode(item.key))
      putExtra(EXTRA_KEY, item.key)
    }
    return PendingIntent.getBroadcast(
      ctx, item.key.hashCode(), intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun arm(ctx: Context, item: Item) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = pending(ctx, item)
    val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
    if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.triggerAt, pi)
    else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.triggerAt, pi)
  }

  private fun cancel(ctx: Context, item: Item) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(pending(ctx, item))
  }

  fun fireKey(ctx: Context, key: String) {
    val item = load(ctx).firstOrNull { it.key == key } ?: return
    fire(ctx, item, null)
  }

  private fun clockIntent(item: Item) = Intent(AlarmClock.ACTION_SET_ALARM).apply {
    putExtra(AlarmClock.EXTRA_HOUR, item.hour)
    putExtra(AlarmClock.EXTRA_MINUTES, item.minute)
    putExtra(AlarmClock.EXTRA_MESSAGE, item.label)
    putExtra(AlarmClock.EXTRA_SKIP_UI, true)
    putExtra(AlarmClock.EXTRA_VIBRATE, true)
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }

  /**
   * Puts the alarm into the Clock. From the background Android only allows this with the
   * "display over other apps" permission; without it (or if the Clock refuses) we post a
   * notification whose tap does the same thing.
   */
  private fun fire(ctx: Context, item: Item, foreground: Context?) {
    if (item.key in fired(ctx)) return
    // SET_ALARM rings at the NEXT hour:minute — if that time has passed it would be tomorrow.
    if (item.alarmAt <= System.currentTimeMillis() + 30_000) return
    val launcher = foreground ?: if (Settings.canDrawOverlays(ctx)) ctx else null
    if (launcher != null) {
      try {
        launcher.startActivity(clockIntent(item))
        markFired(ctx, item.key)
        return
      } catch (e: ActivityNotFoundException) {
        Log.w(TAG, "no clock app", e)
      } catch (e: Exception) {
        Log.w(TAG, "clock launch refused", e)
      }
    }
    notifyTapToSet(ctx, item)
    markFired(ctx, item.key)
  }

  private fun notifyTapToSet(ctx: Context, item: Item) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL, "⏰", NotificationManager.IMPORTANCE_HIGH)
      )
    }
    val pi = PendingIntent.getActivity(
      ctx, item.key.hashCode(), clockIntent(item),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val icon = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
      .takeIf { it != 0 } ?: android.R.drawable.ic_lock_idle_alarm
    val time = String.format("%02d:%02d", item.hour, item.minute)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      android.app.Notification.Builder(ctx, CHANNEL)
    } else {
      @Suppress("DEPRECATION") android.app.Notification.Builder(ctx)
    }
    val n = builder
      .setSmallIcon(icon)
      .setContentTitle("⏰ $time — ${item.label}")
      .setContentText(item.hint)
      .setContentIntent(pi)
      .setAutoCancel(true)
      .build()
    try {
      nm.notify(item.key.hashCode(), n)
    } catch (e: SecurityException) {
      Log.w(TAG, "no notification permission", e)
    }
  }
}
