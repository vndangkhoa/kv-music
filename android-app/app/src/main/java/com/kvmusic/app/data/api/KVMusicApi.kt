package com.kvmusic.app.data.api

import com.kvmusic.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface KVMusicApi {

    @GET("/api/search")
    suspend fun search(
        @Query("q") query: String
    ): Response<SearchResponse>

    @GET("/api/universal-search")
    suspend fun universalSearch(
        @Query("q") query: String
    ): Response<UniversalSearchResponse>

    @GET("/api/suggestions")
    suspend fun getSuggestions(
        @Query("q") query: String
    ): Response<List<String>>

    @GET("/api/feed")
    suspend fun getFeed(): Response<List<Any>>

    @GET("/api/charts")
    suspend fun getCharts(
        @Query("country") country: String = "VN",
        @Query("chart_type") chartType: String = "trending"
    ): Response<SearchResponse>

    @GET("/api/new-releases")
    suspend fun getNewReleases(
        @Query("country") country: String = "VN"
    ): Response<SearchResponse>

    @GET("/api/artists")
    suspend fun getArtists(
        @Query("region") region: String = "vn"
    ): Response<ArtistsResponse>

    @GET("/api/recommendations")
    suspend fun getRecommendations(
        @Query("id") trackId: String
    ): Response<List<Track>>

    @GET("/api/lyrics")
    suspend fun getLyrics(
        @Query("id") trackId: String,
        @Query("title") title: String,
        @Query("artist") artist: String
    ): Response<SyncedLyricsResponse>

    @POST("/api/auth/login")
    suspend fun login(
        @Body payload: Map<String, String>
    ): Response<AuthResponse>

    @POST("/api/auth/register")
    suspend fun register(
        @Body payload: Map<String, String>
    ): Response<AuthResponse>

    @POST("/api/auth/me")
    suspend fun getMe(
        @Body payload: Map<String, String>
    ): Response<AuthResponse>

    @POST("/api/auth/pair/generate")
    suspend fun generatePairCode(
        @Body payload: Map<String, String>
    ): Response<PairResponse>

    @POST("/api/auth/pair/link")
    suspend fun linkPairCode(
        @Body payload: Map<String, String>
    ): Response<PairResponse>
}
