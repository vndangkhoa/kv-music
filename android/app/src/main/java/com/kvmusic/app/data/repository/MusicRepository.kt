package com.kvmusic.app.data.repository

import com.kvmusic.app.data.model.ArtistChartEntry
import com.kvmusic.app.data.model.CollectionResponse
import com.kvmusic.app.data.model.FeedSection
import com.kvmusic.app.data.model.LyricsResponse
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.data.model.StaticPlaylist
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.UniversalSearchResponse
import com.kvmusic.app.data.model.VideoStats
import com.kvmusic.app.data.remote.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request

class MusicRepository(private val apiClient: ApiClient) {

    suspend fun browse(country: String): Map<String, List<StaticPlaylist>> =
        safeCall { apiClient.service().browse(country) } ?: emptyMap()

    suspend fun charts(type: String): List<Track> =
        safeCall { apiClient.service().charts(type).tracks } ?: emptyList()

    suspend fun artists(region: String): List<ArtistChartEntry> =
        safeCall { apiClient.service().artists(region).artists } ?: emptyList()

    suspend fun newReleases(country: String): List<Track> =
        safeCall { apiClient.service().newReleases(country).tracks } ?: emptyList()

    suspend fun feed(): List<FeedSection> =
        safeCall { apiClient.service().feed() } ?: emptyList()

    suspend fun search(query: String): List<Track> =
        safeCall { apiClient.service().search(query).tracks } ?: emptyList()

    suspend fun suggestions(query: String): List<String> =
        safeCall { apiClient.service().suggestions(query) } ?: emptyList()

    suspend fun universalSearch(query: String): UniversalSearchResponse =
        safeCall { apiClient.service().universalSearch(query) } ?: UniversalSearchResponse()

    suspend fun collection(id: String): CollectionResponse? =
        safeCall { apiClient.service().collection(id) }

    suspend fun trackInfo(id: String): Track? =
        safeCall { apiClient.service().trackInfo(id) }

    suspend fun videoStats(id: String): VideoStats? =
        safeCall { apiClient.service().videoStats(id) }

    suspend fun recommendations(query: String, type: String, limit: Int): Recommendations? =
        safeCall { apiClient.service().recommendations(seed = query, seedType = type, limit = limit) }

    suspend fun lyrics(title: String, artist: String, id: String): LyricsResponse? =
        safeCall { apiClient.service().lyrics(title = title, artist = artist, id = id) }

    suspend fun artistPhoto(name: String): String? =
        safeCall { apiClient.service().artistInfo(name).image }

    suspend fun canConnect(): Boolean =
        withContext(Dispatchers.IO) {
            val host = apiClient.baseUrl()
            if (host.isBlank()) return@withContext false
            try {
                val request = Request.Builder().url(host).get().build()
                apiClient.okHttpClient().newCall(request).execute().use { true }
            } catch (_: Exception) {
                false
            }
        }

    fun streamUrl(id: String): String = apiClient.streamUrl(id)

    fun downloadUrl(id: String, fmt: String): String = apiClient.downloadUrl(id, fmt)

    private suspend fun <T> safeCall(block: suspend () -> T): T? =
        try {
            block()
        } catch (_: Exception) {
            null
        }
}
