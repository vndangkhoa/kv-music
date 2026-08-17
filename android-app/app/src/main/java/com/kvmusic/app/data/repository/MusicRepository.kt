package com.kvmusic.app.data.repository

import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MusicRepository {

    private val api get() = RetrofitClient.getApi()

    suspend fun search(query: String): Result<List<Track>> = withContext(Dispatchers.IO) {
        try {
            val response = api.search(query)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.tracks)
            } else {
                Result.failure(Exception("Search failed: ${response.message()}"))
            }
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
        try {
            val response = api.getCharts(country, chartType)
            if (response.isSuccessful && response.body() != null) {
                val tracks = response.body()!!.tracks
                if (tracks.isNotEmpty()) {
                    Result.success(tracks)
                } else {
                    search("Top Hits")
                }
            } else {
                search("Top Hits")
            }
        } catch (e: Exception) {
            search("Top Hits")
        }
    }

    suspend fun getNewReleases(country: String = "VN"): Result<List<Track>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getNewReleases(country)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.tracks)
            } else {
                search("New Music")
            }
        } catch (e: Exception) {
            search("New Music")
        }
    }

    suspend fun getArtists(region: String = "vn"): Result<List<ArtistHit>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getArtists(region)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.artists)
            } else {
                Result.failure(Exception("Artists failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRecommendations(trackId: String): Result<List<Track>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getRecommendations(trackId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                search("Recommended Music")
            }
        } catch (e: Exception) {
            search("Recommended Music")
        }
    }

    suspend fun getLyrics(trackId: String, title: String, artist: String): Result<SyncedLyricsResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getLyrics(trackId, title, artist)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Lyrics failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
