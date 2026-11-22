package expo.modules.ikolistener

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Raw IKO notifications waiting for JS. The listener service adds here (the app may be closed then);
 * JS takes everything when Amber Ledger opens. Kept in SharedPreferences, so it survives restarts.
 */
object IkoQueue {
  private const val PREFS = "iko_listener"
  private const val KEY_QUEUE = "queue"
  private const val KEY_SEEN = "seen"
  private const val MAX_SEEN = 200

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Adds one notification. False when the same title+text was already seen (IKO re-posts/updates). */
  @Synchronized
  fun add(context: Context, title: String, text: String, time: Long): Boolean {
    val p = prefs(context)
    val id = (title + "\n" + text).hashCode().toString()

    val seen = JSONArray(p.getString(KEY_SEEN, "[]"))
    for (i in 0 until seen.length()) if (seen.getString(i) == id) return false
    seen.put(id)
    while (seen.length() > MAX_SEEN) seen.remove(0)

    val queue = JSONArray(p.getString(KEY_QUEUE, "[]"))
    queue.put(JSONObject().put("id", id).put("title", title).put("text", text).put("time", time))

    p.edit().putString(KEY_QUEUE, queue.toString()).putString(KEY_SEEN, seen.toString()).apply()
    return true
  }

  /** The whole queue as a JSON array string; the queue is emptied. */
  @Synchronized
  fun takeAll(context: Context): String {
    val p = prefs(context)
    val queue = p.getString(KEY_QUEUE, "[]") ?: "[]"
    p.edit().putString(KEY_QUEUE, "[]").apply()
    return queue
  }
}
