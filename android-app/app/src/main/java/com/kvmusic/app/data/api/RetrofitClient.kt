package com.kvmusic.app.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private var currentBaseUrl: String = "https://sp.khoavo.myds.me" // Default KV Music domain
    private var apiInstance: KVMusicApi? = null

    fun getBaseUrl(): String = currentBaseUrl

    fun setBaseUrl(newUrl: String) {
        var formatted = newUrl.trim()
        if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
            formatted = "http://$formatted"
        }
        if (formatted.endsWith("/")) {
            formatted = formatted.dropLast(1)
        }
        if (currentBaseUrl != formatted || apiInstance == null) {
            currentBaseUrl = formatted
            apiInstance = createApi(formatted)
        }
    }

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
