package expo.modules.voiceinput

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Voice input through Android's own speech dialog (RecognizerIntent) — no recognizer of our own,
 * no microphone permission needed: the system / Google app does the listening and returns text.
 */
class VoiceInputModule : Module() {
  private var pending: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("VoiceInput")

    /** Resolves with the recognized text, or null if cancelled / nothing heard / no speech app. */
    AsyncFunction("recognize") { language: String?, prompt: String?, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        if (!language.isNullOrBlank()) {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
          // Some recognizers only honour the preference extra; set both.
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language)
          putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, true)
        }
        if (!prompt.isNullOrBlank()) putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
      }
      pending?.resolve(null)
      pending = promise
      try {
        activity.startActivityForResult(intent, REQUEST_CODE)
      } catch (e: ActivityNotFoundException) {
        pending = null
        promise.resolve(null)
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val p = pending ?: return@OnActivityResult
      pending = null
      val text = if (payload.resultCode == Activity.RESULT_OK) {
        payload.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
      } else null
      p.resolve(text)
    }
  }

  companion object {
    private const val REQUEST_CODE = 47021
  }
}
