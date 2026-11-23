package expo.modules.ikolistener

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class IkoListenerModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("IkoListener")

    /** Is the listener service in this build at all (personal build only)? */
    Function("isAvailable") {
      val cn = ComponentName(context, IkoNotificationService::class.java)
      try {
        context.packageManager.getServiceInfo(cn, 0)
        true
      } catch (e: Exception) {
        false
      }
    }

    /** Has the user allowed notification access for Amber Ledger? */
    Function("isEnabled") {
      val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: ""
      val me = ComponentName(context, IkoNotificationService::class.java)
      flat.split(":").any { ComponentName.unflattenFromString(it) == me }
    }

    /** Opens the system "Notification access" screen. */
    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** The app's language for our own "new transaction" notification (the service has no JS). */
    Function("setTexts") { title: String, channel: String ->
      context.getSharedPreferences(IkoNotificationService.TEXTS, android.content.Context.MODE_PRIVATE)
        .edit().putString("title", title).putString("channel", channel).apply()
    }

    /** Takes the queued notifications (JSON array string) and empties the queue. */
    Function("takePending") {
      IkoQueue.takeAll(context)
    }
  }
}
