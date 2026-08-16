package com.kvmusic.app.data.remote

import android.content.Context
import android.content.pm.ApplicationInfo
import com.kvmusic.app.data.local.ServerConfigStore
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

class ApiClient(
    context: Context,
    private val serverConfigStore: ServerConfigStore,
) {

    private val appContext = context.applicationContext
    private val isDebug = (appContext.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    private val lock = Any()

    @Volatile
    private var cachedHost: String? = null

    @Volatile
    private var cachedClient: OkHttpClient? = null

    @Volatile
    private var cachedService: ApiService? = null

    fun baseUrl(): String = serverConfigStore.currentHost().trim().trimEnd('/')

    fun service(): ApiService {
        val host = baseUrl()
        if (host.isBlank()) {
            throw IllegalStateException("Chưa cấu hình máy chủ")
        }
        synchronized(lock) {
            if (cachedService == null || cachedHost != host) {
                cachedHost = host
                cachedClient = buildClient()
                cachedService = buildService(host, cachedClient!!)
            }
            return cachedService!!
        }
    }

    fun okHttpClient(): OkHttpClient {
        val host = baseUrl()
        synchronized(lock) {
            if (cachedClient == null || cachedHost != host) {
                cachedHost = host
                cachedClient = buildClient()
                cachedService = null
            }
            return cachedClient!!
        }
    }

    fun streamUrl(id: String, fmt: String? = null): String {
        val base = baseUrl()
        if (base.isBlank()) return ""
        val suffix = if (fmt.isNullOrBlank()) "" else "?fmt=$fmt"
        return "$base/api/stream/$id$suffix"
    }

    fun downloadUrl(id: String, fmt: String): String {
        val base = baseUrl()
        if (base.isBlank()) return ""
        val suffix = if (fmt.isBlank()) "" else "?fmt=$fmt"
        return "$base/api/download/$id$suffix"
    }

    private fun buildClient(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .apply {
                if (isDebug) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BASIC
                        },
                    )
                }
            }
            .build()

    private fun buildService(host: String, client: OkHttpClient): ApiService {
        val retrofit = Retrofit.Builder()
            .baseUrl("$host/")
            .client(client)
            .addConverterFactory(
                JsonProvider.json.asConverterFactory("application/json".toMediaType()),
            )
            .build()
        return retrofit.create(ApiService::class.java)
    }
}
