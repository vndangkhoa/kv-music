package com.kvmusic.app.data.api

import android.content.Context
import android.content.SharedPreferences
import okhttp3.Call
import okhttp3.Dns
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.URI
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val PREFS_NAME = "kv_music_network_prefs"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_WARP_BYPASS = "warp_bypass_enabled"
    private const val KEY_WARP_PROXY_URL = "warp_proxy_url"
    private const val DEFAULT_BASE_URL = "https://sp.khoavo.myds.me"

    private var prefs: SharedPreferences? = null
    private var currentBaseUrl: String = DEFAULT_BASE_URL
    private var warpBypassEnabled: Boolean = true
    private var warpProxyUrl: String = ""

    private var apiInstance: KVMusicApi? = null
    private var mediaClientInstance: OkHttpClient? = null
    private val streamUserAgents = ConcurrentHashMap<String, String>()

    /**
     * System DNS with automatic Cloudflare DoH (1.1.1.1) fallback when ISP/emulator DNS
     * blocks or fails to resolve YouTube / server hostnames.
     */
    private val cloudflareFallbackDns = object : Dns {
        override fun lookup(hostname: String): List<InetAddress> {
            return try {
                Dns.SYSTEM.lookup(hostname)
            } catch (systemErr: Exception) {
                val doh = lookupCloudflareDoH(hostname)
                if (doh.isNotEmpty()) doh else throw systemErr
            }
        }
    }

    private fun lookupCloudflareDoH(hostname: String): List<InetAddress> {
        return try {
            val encoded = URLEncoder.encode(hostname, "UTF-8")
            val conn = (URL("https://1.1.1.1/dns-query?name=$encoded&type=A").openConnection() as HttpURLConnection).apply {
                setRequestProperty("Accept", "application/dns-json")
                connectTimeout = 2500
                readTimeout = 2500
            }
            conn.inputStream.bufferedReader().use { reader ->
                val json = JSONObject(reader.readText())
                val answers = json.optJSONArray("Answer") ?: return emptyList()
                val result = ArrayList<InetAddress>()
                for (i in 0 until answers.length()) {
                    val item = answers.optJSONObject(i) ?: continue
                    if (item.optInt("type") == 1) {
                        val ip = item.optString("data").trim()
                        if (ip.isNotEmpty()) {
                            runCatching { InetAddress.getByName(ip) }.getOrNull()?.let { result.add(it) }
                        }
                    }
                }
                result
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    @Synchronized
    fun init(context: Context) {
        if (prefs != null) return
        val p = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs = p
        val savedUrl = p.getString(KEY_BASE_URL, null)?.trim().orEmpty()
        if (savedUrl.isNotBlank()) {
            currentBaseUrl = normalizeServerUrl(savedUrl)
        }
        warpBypassEnabled = p.getBoolean(KEY_WARP_BYPASS, true)
        warpProxyUrl = p.getString(KEY_WARP_PROXY_URL, "")?.trim().orEmpty()
        apiInstance = null
        mediaClientInstance = null
    }

    private fun normalizeServerUrl(raw: String): String {
        var formatted = raw.trim()
        if (formatted.isBlank()) return DEFAULT_BASE_URL
        if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
            val isLan = formatted.startsWith("192.168.") ||
                formatted.startsWith("10.") ||
                formatted.startsWith("172.") ||
                formatted.startsWith("127.0.0.1") ||
                formatted.startsWith("localhost") ||
                formatted.contains(":")
            formatted = if (isLan) "http://$formatted" else "https://$formatted"
        }
        return formatted.trimEnd('/')
    }

    private fun normalizeProxyUrl(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isBlank()) return ""
        return if (trimmed.contains("://")) trimmed.trimEnd('/') else "http://$trimmed".trimEnd('/')
    }

    fun getBaseUrl(): String = currentBaseUrl

    @Synchronized
    fun setBaseUrl(newUrl: String) {
        val formatted = normalizeServerUrl(newUrl)
        prefs?.edit()?.putString(KEY_BASE_URL, formatted)?.apply()
        if (currentBaseUrl != formatted || apiInstance == null) {
            currentBaseUrl = formatted
            apiInstance = createApi(formatted)
        }
    }

    fun isWarpBypassEnabled(): Boolean = warpBypassEnabled

    @Synchronized
    fun setWarpBypassEnabled(enabled: Boolean) {
        warpBypassEnabled = enabled
        prefs?.edit()?.putBoolean(KEY_WARP_BYPASS, enabled)?.apply()
    }

    fun getWarpProxyUrl(): String = warpProxyUrl

    @Synchronized
    fun setWarpProxyUrl(rawProxy: String) {
        val normalized = normalizeProxyUrl(rawProxy)
        warpProxyUrl = normalized
        prefs?.edit()?.putString(KEY_WARP_PROXY_URL, normalized)?.apply()
        mediaClientInstance = null
        apiInstance = null
    }

    fun parseProxyOrNull(raw: String = warpProxyUrl): Proxy? {
        if (raw.isBlank()) return null
        return try {
            val normalized = normalizeProxyUrl(raw)
            val uri = URI(normalized)
            val host = uri.host ?: return null
            val scheme = uri.scheme?.lowercase().orEmpty()
            val defaultPort = if (scheme.startsWith("socks")) 1080 else 29083
            val port = if (uri.port > 0) uri.port else defaultPort
            val type = if (scheme.startsWith("socks")) Proxy.Type.SOCKS else Proxy.Type.HTTP
            Proxy(type, InetSocketAddress.createUnresolved(host, port))
        } catch (_: Exception) {
            null
        }
    }

    fun registerStreamUserAgent(streamUrl: String, userAgent: String) {
        if (streamUrl.isNotBlank() && userAgent.isNotBlank()) {
            if (streamUserAgents.size > 64) {
                streamUserAgents.clear()
            }
            streamUserAgents[streamUrl] = userAgent
        }
    }

    /**
     * Dynamic Call.Factory passed to ExoPlayer's OkHttpDataSource.Factory so proxy
     * updates and client-matched User-Agents take effect without recreating ExoPlayer.
     */
    val mediaCallFactory: Call.Factory = Call.Factory { request ->
        getMediaOkHttpClient().newCall(request)
    }

    @Synchronized
    fun getMediaOkHttpClient(): OkHttpClient {
        mediaClientInstance?.let { return it }
        val builder = OkHttpClient.Builder()
            .dns(cloudflareFallbackDns)
            .followRedirects(true)
            .followSslRedirects(true)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val req = chain.request()
                val fullUrl = req.url.toString()
                val matchedUa = streamUserAgents[fullUrl]
                val host = req.url.host.lowercase()
                val ua = when {
                    !matchedUa.isNullOrBlank() -> matchedUa
                    host.contains("googlevideo.com") || host.contains("youtube.com") ->
                        "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
                    else -> "KVMusic-Android/1.2"
                }
                val updated = req.newBuilder()
                    .header("User-Agent", ua)
                    .build()
                chain.proceed(updated)
            }

        parseProxyOrNull()?.let { proxy ->
            val serverHost = runCatching { URI(currentBaseUrl).host?.lowercase() }.getOrNull().orEmpty()
            builder.proxySelector(object : java.net.ProxySelector() {
                override fun select(uri: URI?): List<Proxy> {
                    val h = uri?.host?.lowercase().orEmpty()
                    val isDirectLocal = h.isBlank() ||
                        h == "localhost" ||
                        h == "127.0.0.1" ||
                        h == "::1" ||
                        h == serverHost ||
                        h.endsWith(".local") ||
                        h.startsWith("192.168.") ||
                        h.startsWith("10.") ||
                        h.startsWith("172.16.") || h.startsWith("172.17.") ||
                        h.startsWith("172.18.") || h.startsWith("172.19.") ||
                        h.startsWith("172.20.") || h.startsWith("172.21.") ||
                        h.startsWith("172.22.") || h.startsWith("172.23.") ||
                        h.startsWith("172.24.") || h.startsWith("172.25.") ||
                        h.startsWith("172.26.") || h.startsWith("172.27.") ||
                        h.startsWith("172.28.") || h.startsWith("172.29.") ||
                        h.startsWith("172.30.") || h.startsWith("172.31.")
                    return if (isDirectLocal) listOf(Proxy.NO_PROXY) else listOf(proxy)
                }

                override fun connectFailed(uri: URI?, sa: java.net.SocketAddress?, ioe: java.io.IOException?) {}
            })
        }

        return builder.build().also { mediaClientInstance = it }
    }

    @Synchronized
    fun getApi(): KVMusicApi {
        if (apiInstance == null) {
            apiInstance = createApi(currentBaseUrl)
        }
        return apiInstance!!
    }

    private fun createApi(baseUrl: String): KVMusicApi {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .dns(cloudflareFallbackDns)
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl("$baseUrl/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        return retrofit.create(KVMusicApi::class.java)
    }

    fun getStreamUrl(trackId: String): String {
        return "$currentBaseUrl/api/stream/$trackId"
    }
}
