package expo.modules.ikolistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Listens to notifications of the IKO app (PKO BP) only. Each new one is queued for JS and the user
 * gets Amber Ledger's own "new transaction — confirm?" notification that opens Finance.
 * Declared in the manifest only in the personal build (plugins/withIkoListener.js).
 */
class IkoNotificationService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!isIko(sbn.packageName)) return
    val extras = sbn.notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: return
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim() ?: return
    // Only transaction notifications carry an amount line.
    if (!text.contains("Kwota", ignoreCase = true)) return

    if (IkoQueue.add(this, title, text, sbn.postTime)) showConfirm(text)
  }

  private fun isIko(pkg: String?) = pkg != null && (pkg == IKO_PACKAGE || pkg.startsWith("pl.pkobp"))

  private fun showConfirm(text: String) {
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(NotificationChannel(CHANNEL, "Bank transactions", NotificationManager.IMPORTANCE_DEFAULT))
    }

    val amount = lineAfter(text, "Kwota:")?.trimEnd('.') ?: ""
    val place = lineAfter(text, "Lokalizacja:")?.substringAfterLast(':')?.trim() ?: ""
    val body = listOf(amount, place).filter { it.isNotEmpty() }.joinToString(" · ")

    val open = Intent(Intent.ACTION_VIEW, Uri.parse("amberledger://finance")).setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    var icon = resources.getIdentifier("notification_icon", "drawable", packageName)
    if (icon == 0) icon = applicationInfo.icon

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    val n = builder
      .setSmallIcon(icon)
      .setContentTitle("Нова операція — підтвердити?")
      .setContentText(body)
      .setContentIntent(pending)
      .setAutoCancel(true)
      .build()
    nm.notify(NOTIFY_ID, n)
  }

  private fun lineAfter(text: String, label: String): String? =
    text.lineSequence().map { it.trim() }.firstOrNull { it.startsWith(label, ignoreCase = true) }
      ?.substring(label.length)?.trim()

  companion object {
    const val IKO_PACKAGE = "pl.pkobp.iko"
    private const val CHANNEL = "bank_transactions"
    private const val NOTIFY_ID = 4711
  }
}
