package com.kvmusic.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.kvmusic.app.KVMusicApp
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.ArtistHit
import com.kvmusic.app.data.model.SyncedLyricsResponse
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.UniversalSearchResponse
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class MusicRepository(
    context: Context = KVMusicApp.instance
) {

    private val appContext = context.applicationContext
    private val prefs: SharedPreferences by lazy {
        appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val api get() = RetrofitClient.getApi()

    private val chartsMemCache = ConcurrentHashMap<String, List<Track>>()
    private val releasesMemCache = ConcurrentHashMap<String, List<Track>>()
    private val artistsMemCache = ConcurrentHashMap<String, List<ArtistHit>>()

    fun getCachedCharts(country: String = "VN", chartType: String = "trending"): List<Track> {
        val key = "charts_${country.uppercase()}_${chartType.lowercase()}"
        chartsMemCache[key]?.let { if (it.isNotEmpty()) return it }
        val loaded = readTracksFromPrefs(key)
        if (loaded.isNotEmpty()) chartsMemCache[key] = loaded
        return loaded
    }

    fun getCachedNewReleases(country: String = "VN"): List<Track> {
        val key = "releases_${country.lowercase()}"
        releasesMemCache[key]?.let { if (it.isNotEmpty()) return it }
        val loaded = readTracksFromPrefs(key)
        if (loaded.isNotEmpty()) releasesMemCache[key] = loaded
        return loaded
    }

    fun getCachedArtists(region: String = "vn"): List<ArtistHit> {
        val key = "artists_${region.lowercase()}"
        artistsMemCache[key]?.let { if (it.isNotEmpty()) return it }
        val loaded = readArtistsFromPrefs(key)
        if (loaded.isNotEmpty()) artistsMemCache[key] = loaded
        return loaded
    }

    suspend fun search(query: String): Result<List<Track>> = withContext(Dispatchers.IO) {
        try {
            val response = api.search(query)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.tracks)
            } else {
                Result.failure(Exception("Search failed: ${response.message()}"))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun universalSearch(query: String): Result<UniversalSearchResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.universalSearch(query)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Universal search failed: ${response.message()}"))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getFeed(): Result<List<Track>> = withContext(Dispatchers.IO) {
        val chartsRes = getCharts("VN", "trending")
        if (chartsRes.isSuccess && chartsRes.getOrDefault(emptyList()).isNotEmpty()) {
            chartsRes
        } else {
            search("Trending Music")
        }
    }

    suspend fun getCharts(country: String = "VN", chartType: String = "trending"): Result<List<Track>> = withContext(Dispatchers.IO) {
        val cacheKey = "charts_${country.uppercase()}_${chartType.lowercase()}"
        try {
            val response = api.getCharts(country, chartType)
            if (response.isSuccessful && response.body() != null) {
                val tracks = response.body()!!.tracks
                if (tracks.isNotEmpty()) {
                    chartsMemCache[cacheKey] = tracks
                    writeTracksToPrefs(cacheKey, tracks)
                    return@withContext Result.success(tracks)
                }
            }
            val cached = getCachedCharts(country, chartType)
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                search("Top Hits")
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            val cached = getCachedCharts(country, chartType)
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                search("Top Hits")
            }
        }
    }

    suspend fun getNewReleases(country: String = "VN"): Result<List<Track>> = withContext(Dispatchers.IO) {
        val regionParam = country.lowercase()
        val cacheKey = "releases_$regionParam"
        try {
            val response = api.getNewReleases(region = regionParam)
            if (response.isSuccessful && response.body() != null) {
                val tracks = response.body()!!.tracks
                if (tracks.isNotEmpty()) {
                    releasesMemCache[cacheKey] = tracks
                    writeTracksToPrefs(cacheKey, tracks)
                    return@withContext Result.success(tracks)
                }
            }
            val cached = getCachedNewReleases(country)
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                search("New Music")
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            val cached = getCachedNewReleases(country)
            if (cached.isNotEmpty()) {
                Result.success(cached)
            } else {
                search("New Music")
            }
        }
    }

    suspend fun getArtists(region: String = "vn"): Result<List<ArtistHit>> = withContext(Dispatchers.IO) {
        val cleanRegion = region.lowercase()
        val cacheKey = "artists_$cleanRegion"
        try {
            val response = api.getArtists(cleanRegion)
            if (response.isSuccessful && response.body() != null) {
                val artists = response.body()!!.artists
                if (artists.isNotEmpty()) {
                    artistsMemCache[cacheKey] = artists
                    writeArtistsToPrefs(cacheKey, artists)
                }
                Result.success(artists)
            } else {
                val cached = getCachedArtists(cleanRegion)
                if (cached.isNotEmpty()) Result.success(cached)
                else Result.failure(Exception("Artists failed: ${response.message()}"))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            val cached = getCachedArtists(cleanRegion)
            if (cached.isNotEmpty()) Result.success(cached)
            else Result.failure(e)
        }
    }

    suspend fun getRecommendations(trackId: String): Result<List<Track>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getRecommendations(seed = trackId, seedType = "track", limit = 20)
            if (response.isSuccessful && response.body() != null) {
                val tracks = response.body()!!.tracks
                if (tracks.isNotEmpty()) {
                    return@withContext Result.success(tracks)
                }
            }
            search("Recommended Music")
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            search("Recommended Music")
        }
    }

    suspend fun getLyrics(trackId: String, title: String, artist: String): Result<SyncedLyricsResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getLyrics(
                track = title,
                artist = artist,
                videoId = trackId.ifBlank { null }
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Lyrics failed"))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun writeTracksToPrefs(key: String, tracks: List<Track>) {
        runCatching {
            val arr = JSONArray()
            tracks.take(40).forEach { t ->
                arr.put(
                    JSONObject().apply {
                        put("id", t.id)
                        put("title", t.title)
                        put("artist", t.artist)
                        put("album", t.album)
                        put("duration", t.duration)
                        put("cover_url", t.coverUrl)
                        put("url", t.url)
                    }
                )
            }
            prefs.edit().putString(key, arr.toString()).apply()
        }
    }

    private fun readTracksFromPrefs(key: String): List<Track> {
        return runCatching {
            val raw = prefs.getString(key, null) ?: return emptyList()
            val arr = JSONArray(raw)
            val list = ArrayList<Track>(arr.length())
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val id = obj.optString("id")
                if (id.isBlank()) continue
                list.add(
                    Track(
                        id = id,
                        title = obj.optString("title"),
                        artist = obj.optString("artist"),
                        album = obj.optString("album"),
                        duration = obj.optInt("duration", 0),
                        coverUrl = obj.optString("cover_url"),
                        url = obj.optString("url")
                    )
                )
            }
            list
        }.getOrDefault(emptyList())
    }

    private fun writeArtistsToPrefs(key: String, artists: List<ArtistHit>) {
        runCatching {
            val arr = JSONArray()
            artists.take(30).forEach { a ->
                arr.put(
                    JSONObject().apply {
                        put("id", a.id)
                        put("name", a.name)
                        put("avatar", a.avatar)
                        put("photo", a.photo)
                        put("subscribers", a.subscribers)
                        put("followers", a.followers)
                    }
                )
            }
            prefs.edit().putString(key, arr.toString()).apply()
        }
    }

    private fun readArtistsFromPrefs(key: String): List<ArtistHit> {
        return runCatching {
            val raw = prefs.getString(key, null) ?: return emptyList()
            val arr = JSONArray(raw)
            val list = ArrayList<ArtistHit>(arr.length())
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val name = obj.optString("name")
                if (name.isBlank()) continue
                list.add(
                    ArtistHit(
                        id = obj.optString("id"),
                        name = name,
                        avatar = obj.optString("avatar"),
                        photo = obj.optString("photo"),
                        subscribers = obj.optString("subscribers"),
                        followers = obj.optString("followers")
                    )
                )
            }
            list
        }.getOrDefault(emptyList())
    }

    companion object {
        private const val PREFS_NAME = "kv_music_api_cache"
    }
}
