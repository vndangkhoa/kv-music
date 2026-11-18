package com.kvmusic.app.data.api

import android.net.Uri
import android.util.Log
import androidx.media3.common.MimeTypes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Direct YouTube InnerTube audio resolver ported from KV-Tube's `InnerTubeApi`.
 *
 * When a self-hosted KV Music server's residential IPv4 is rate-limited/bot-blocked
 * by YouTube, resolving audio streams directly from the Android device (over mobile,
 * home ISP, or an optional WARP proxy configured in Settings) binds signed
 * `googlevideo.com` URLs to the device/proxy's own egress IP via
 * `RetrofitClient.mediaCallFactory`, guaranteeing strict IP-symmetry.
 */
object InnerTubeMusicClient {

    private const val TAG = "InnerTubeMusicClient"
    private const val PLAYER_URL = "https://music.youtube.com/youtubei/v1/player?prettyPrint=false"
    private const val FALLBACK_PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false"

    data class ResolvedAudioStream(
        val url: String,
        val mimeType: String,
        val userAgent: String,
        val clientName: String,
        val bitrateBps: Int,
        val expiresAtMs: Long
    )

    private data class ClientConfig(
        val name: String,
        val version: String,
        val userAgent: String,
        val endpointUrl: String = FALLBACK_PLAYER_URL,
        val androidSdk: Int? = null,
        val extraClientFields: Map<String, Any> = emptyMap()
    )

    private val clients = listOf(
        ClientConfig(
            name = "ANDROID",
            version = "20.10.38",
            userAgent = "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
            endpointUrl = FALLBACK_PLAYER_URL,
            androidSdk = 30
        ),
        ClientConfig(
            name = "ANDROID_MUSIC",
            version = "7.29.52",
            userAgent = "com.google.android.apps.youtube.music/7.29.52 (Linux; U; Android 11) gzip",
            endpointUrl = PLAYER_URL,
            androidSdk = 30
        ),
        ClientConfig(
            name = "VISIONOS",
            version = "1.0",
            userAgent = "com.google.ios.youtube/19.29.1 (iPhone14,3; U; CPU iOS 17_5 like Mac OS X)",
            endpointUrl = FALLBACK_PLAYER_URL,
            extraClientFields = mapOf("deviceMake" to "Apple", "deviceModel" to "RealityDevice14,1")
        ),
        ClientConfig(
            name = "IOS",
            version = "19.29.1",
            userAgent = "com.google.ios.youtube/19.29.1 (iPhone14,3; U; CPU iOS 17_5 like Mac OS X)",
            endpointUrl = FALLBACK_PLAYER_URL,
            extraClientFields = mapOf("deviceMake" to "Apple", "deviceModel" to "iPhone16,2")
        )
    )

    private val cache = ConcurrentHashMap<String, ResolvedAudioStream>()

    fun invalidate(trackId: String) {
        val clean = extractVideoId(trackId)
        cache.remove(clean)
    }

    fun clearCache() {
        cache.clear()
    }

    fun extractVideoId(rawId: String): String {
        val trimmed = rawId.trim()
        if (trimmed.contains("v=")) {
            val v = Uri.parse(trimmed).getQueryParameter("v")
            if (!v.isNullOrBlank()) return v.take(11)
        }
        val candidate = trimmed.substringAfterLast('/')
            .substringBefore('?')
            .substringBefore('&')
        if (trimmed.startsWith("discovery-") || trimmed.startsWith("artist-")) {
            val tail = trimmed.split('-').lastOrNull()
            if (tail != null && tail.length == 11) return tail
        }
        return if (candidate.length == 11) candidate else trimmed
    }

    suspend fun resolveAudioStream(
        trackId: String,
        preferM4a: Boolean = false,
        bypassCache: Boolean = false
    ): ResolvedAudioStream? = withContext(Dispatchers.IO) {
        val videoId = extractVideoId(trackId)
        if (!videoId.matches(Regex("[A-Za-z0-9_-]{11}"))) {
            return@withContext null
        }

        val now = System.currentTimeMillis()
        if (!bypassCache) {
            cache[videoId]?.let { cached ->
                if (cached.expiresAtMs - now > 120_000L) {
                    return@withContext cached
                } else {
                    cache.remove(videoId)
                }
            }
        }

        for (cfg in clients) {
            try {
                val resolved = fetchWithClient(videoId, cfg, preferM4a)
                if (resolved != null) {
                    cache[videoId] = resolved
                    RetrofitClient.registerStreamUserAgent(resolved.url, resolved.userAgent)
                    Log.d(TAG, "Resolved $videoId directly via ${cfg.name} (${resolved.mimeType})")
                    return@withContext resolved
                }
            } catch (e: Exception) {
                Log.w(TAG, "InnerTube ${cfg.name} failed for $videoId: ${e.message}")
            }
        }
        null
    }

    private fun fetchWithClient(
        videoId: String,
        cfg: ClientConfig,
        preferM4a: Boolean
    ): ResolvedAudioStream? {
        val clientObj = JSONObject().apply {
            put("clientName", cfg.name)
            put("clientVersion", cfg.version)
            if (cfg.androidSdk != null) {
                put("androidSdkVersion", cfg.androidSdk)
            }
            cfg.extraClientFields.forEach { (k, v) -> put(k, v) }
            if (cfg.name != "ANDROID") {
                put("hl", "en")
                put("gl", "VN")
            }
        }
        val bodyJson = JSONObject().apply {
            put("videoId", videoId)
            put("context", JSONObject().apply { put("client", clientObj) })
            put("contentCheckOk", true)
            put("racyCheckOk", true)
        }.toString()

        val req = Request.Builder()
            .url(cfg.endpointUrl)
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .header("Content-Type", "application/json")
            .header("User-Agent", cfg.userAgent)
            .header("X-Goog-Api-Format-Version", "2")
            .build()

        RetrofitClient.getMediaOkHttpClient().newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) return null
            val raw = resp.body?.string() ?: return null
            val json = JSONObject(raw)

            val playability = json.optJSONObject("playabilityStatus")?.optString("status").orEmpty()
            if (playability.isNotEmpty() && playability != "OK" && playability != "LIVE_STREAM_OFFLINE") {
                return null
            }

            val streamingData = json.optJSONObject("streamingData") ?: return null
            val adaptiveFormats = streamingData.optJSONArray("adaptiveFormats")
            val combinedFormats = streamingData.optJSONArray("formats")

            data class Candidate(
                val url: String,
                val mime: String,
                val bitrate: Int,
                val isMp4Audio: Boolean,
                val isOpusAudio: Boolean
            )

            val candidates = mutableListOf<Candidate>()

            if (adaptiveFormats != null) {
                for (i in 0 until adaptiveFormats.length()) {
                    val f = adaptiveFormats.optJSONObject(i) ?: continue
                    val directUrl = f.optString("url")
                    if (directUrl.isBlank()) continue // Skip encrypted signatureCipher formats
                    val mime = f.optString("mimeType").lowercase()
                    if (!mime.startsWith("audio/")) continue
                    val bitrate = f.optInt("bitrate", f.optInt("averageBitrate", 0))
                    candidates += Candidate(
                        url = directUrl,
                        mime = mime,
                        bitrate = bitrate,
                        isMp4Audio = mime.contains("audio/mp4"),
                        isOpusAudio = mime.contains("opus") || mime.contains("audio/webm")
                    )
                }
            }

            if (candidates.isEmpty() && combinedFormats != null) {
                for (i in 0 until combinedFormats.length()) {
                    val f = combinedFormats.optJSONObject(i) ?: continue
                    val directUrl = f.optString("url")
                    if (directUrl.isBlank()) continue
                    val mime = f.optString("mimeType").lowercase()
                    val bitrate = f.optInt("bitrate", 0)
                    candidates += Candidate(
                        url = directUrl,
                        mime = mime,
                        bitrate = bitrate,
                        isMp4Audio = mime.contains("mp4"),
                        isOpusAudio = mime.contains("webm")
                    )
                }
            }

            if (candidates.isEmpty()) {
                val hlsUrl = streamingData.optString("hlsManifestUrl")
                if (hlsUrl.isNotBlank()) {
                    return ResolvedAudioStream(
                        url = hlsUrl,
                        mimeType = MimeTypes.APPLICATION_M3U8,
                        userAgent = cfg.userAgent,
                        clientName = cfg.name,
                        bitrateBps = 128_000,
                        expiresAtMs = System.currentTimeMillis() + 3_600_000L
                    )
                }
                return null
            }

            val best = if (preferM4a) {
                candidates
                    .sortedWith(compareByDescending<Candidate> { it.isMp4Audio }.thenByDescending { it.bitrate })
                    .first()
            } else {
                candidates
                    .sortedWith(compareByDescending<Candidate> { it.isOpusAudio }.thenByDescending { it.isMp4Audio }.thenByDescending { it.bitrate })
                    .first()
            }

            val exoMime = when {
                best.isMp4Audio -> MimeTypes.AUDIO_MP4
                best.isOpusAudio -> MimeTypes.AUDIO_WEBM
                else -> MimeTypes.AUDIO_AAC
            }

            val expireSec = Uri.parse(best.url).getQueryParameter("expire")?.toLongOrNull()
            val expiresAtMs = if (expireSec != null) expireSec * 1000L else (System.currentTimeMillis() + 5 * 3600_000L)

            return ResolvedAudioStream(
                url = best.url,
                mimeType = exoMime,
                userAgent = cfg.userAgent,
                clientName = cfg.name,
                bitrateBps = best.bitrate,
                expiresAtMs = expiresAtMs
            )
        }
    }
}
