package expo.modules.localtransfer

import android.util.Base64
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Phone-to-phone transfer over the local network (same Wi-Fi or one phone's hotspot).
 *
 * The sending phone opens a one-shot server and shows a QR with its address, a random key and a
 * random token. The receiving phone connects, proves it scanned the QR (the token), and gets the
 * data encrypted with AES-256-GCM under that key — anyone else on the network sees only noise.
 * The server hands the data out once, then closes; it also closes by itself after a few minutes.
 *
 * Wire format: client → [token length:int][token bytes]; server → [iv:12 bytes][length:int][ciphertext].
 */
class LocalTransferModule : Module() {
  private var server: ServerSocket? = null
  private val random = SecureRandom()

  override fun definition() = ModuleDefinition {
    Name("LocalTransfer")

    Events("onSent", "onClosed")

    /** Starts sending `payload`. Resolves with what goes into the QR: address, port, key, token. */
    AsyncFunction("startSending") Coroutine { payload: String ->
      withContext(Dispatchers.IO) {
        stop()
        val ip = localIpv4() ?: throw IllegalStateException("NO_NETWORK")
        val key = ByteArray(32).also(random::nextBytes)
        val token = ByteArray(16).also(random::nextBytes)
        val socket = ServerSocket()
        socket.reuseAddress = true
        socket.bind(InetSocketAddress(0))
        socket.soTimeout = OPEN_FOR_MS
        server = socket
        serve(socket, payload.toByteArray(Charsets.UTF_8), key, token)
        mapOf(
          "host" to ip,
          "port" to socket.localPort,
          "key" to Base64.encodeToString(key, Base64.NO_WRAP),
          "token" to Base64.encodeToString(token, Base64.NO_WRAP),
          "expiresAt" to System.currentTimeMillis() + OPEN_FOR_MS
        )
      }
    }

    /** Stops sending (screen closed, cancelled). */
    AsyncFunction("stopSending") {
      stop()
    }

    /** Fetches the data from the phone that shows the QR. Rejects on a wrong key or no connection. */
    AsyncFunction("receive") Coroutine { host: String, port: Int, keyB64: String, tokenB64: String ->
      withContext(Dispatchers.IO) {
        val key = Base64.decode(keyB64, Base64.NO_WRAP)
        val token = Base64.decode(tokenB64, Base64.NO_WRAP)
        Socket().use { socket ->
          socket.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
          socket.soTimeout = READ_TIMEOUT_MS
          val output = DataOutputStream(socket.getOutputStream())
          output.writeInt(token.size)
          output.write(token)
          output.flush()
          val input = DataInputStream(socket.getInputStream())
          val iv = ByteArray(IV_BYTES).also(input::readFully)
          val length = input.readInt()
          if (length <= 0 || length > MAX_BYTES) throw IllegalStateException("BAD_DATA")
          val sealed = ByteArray(length).also(input::readFully)
          String(cipher(Cipher.DECRYPT_MODE, key, iv).doFinal(sealed), Charsets.UTF_8)
        }
      }
    }

    OnDestroy {
      stop()
    }
  }

  /** Accepts connections on a background thread until the right token arrives (or it times out). */
  private fun serve(socket: ServerSocket, payload: ByteArray, key: ByteArray, token: ByteArray) {
    val port = socket.localPort
    Thread {
      try {
        while (!socket.isClosed) {
          val client = socket.accept()
          client.use {
            it.soTimeout = READ_TIMEOUT_MS
            val input = DataInputStream(it.getInputStream())
            val size = input.readInt()
            if (size != token.size) return@use
            val sent = ByteArray(size).also(input::readFully)
            // Constant-time compare, so timing doesn't hint how much of the token matched.
            if (!MessageDigest.isEqual(sent, token)) return@use
            val iv = ByteArray(IV_BYTES).also(random::nextBytes)
            val sealed = cipher(Cipher.ENCRYPT_MODE, key, iv).doFinal(payload)
            val output = DataOutputStream(it.getOutputStream())
            output.write(iv)
            output.writeInt(sealed.size)
            output.write(sealed)
            output.flush()
            sendEvent("onSent", mapOf<String, Any>("port" to port))
            socket.close()
          }
        }
      } catch (_: Exception) {
        // Timed out, stopped, or a bad client — in every case the transfer window is over.
      } finally {
        if (server === socket) server = null
        if (!socket.isClosed) socket.close()
        sendEvent("onClosed", mapOf<String, Any>("port" to port))
      }
    }.start()
  }

  private fun stop() {
    server?.close()
    server = null
  }

  private fun cipher(mode: Int, key: ByteArray, iv: ByteArray): Cipher =
    Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(mode, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
    }

  /** This phone's address on the Wi-Fi (or its own hotspot), e.g. 192.168.1.23. */
  private fun localIpv4(): String? =
    NetworkInterface.getNetworkInterfaces().toList()
      .filter { it.isUp && !it.isLoopback }
      .flatMap { it.inetAddresses.toList() }
      .filterIsInstance<Inet4Address>()
      .firstOrNull { it.isSiteLocalAddress }
      ?.hostAddress

  companion object {
    private const val OPEN_FOR_MS = 5 * 60 * 1000
    private const val CONNECT_TIMEOUT_MS = 8_000
    private const val READ_TIMEOUT_MS = 30_000
    private const val IV_BYTES = 12
    private const val MAX_BYTES = 64 * 1024 * 1024
  }
}
