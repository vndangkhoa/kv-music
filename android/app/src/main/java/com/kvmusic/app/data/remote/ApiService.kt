package com.kvmusic.app.data.remote

import com.kvmusic.app.data.model.ArtistChartEntry
import com.kvmusic.app.data.model.AuthResponse
import com.kvmusic.app.data.model.CollectionResponse
import com.kvmusic.app.data.model.CookieResult
import com.kvmusic.app.data.model.FeedSection
import com.kvmusic.app.data.model.LyricsResponse
import com.kvmusic.app.data.model.LoginRequest
import com.kvmusic.app.data.model.PairGenerateResponse
import com.kvmusic.app.data.model.PairLinkRequest
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.data.model.RegisterRequest
import com.kvmusic.app.data.model.StaticPlaylist
import com.kvmusic.app.data.model.TokenRequest
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.UniversalSearchResponse
import com.kvmusic.app.data.model.UpdateResult
import com.kvmusic.app.data.model.User
import com.kvmusic.app.data.model.VideoStats
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

@Serializable
data class SearchResponse(val tracks: List<Track> = emptyList())

@Serializable
data class ChartsResponse(val tracks: List<Track> = emptyList())

@Serializable
data class NewReleasesResponse(val tracks: List<Track> = emptyList())

@Serializable
data class ArtistsResponse(val artists: List<ArtistChartEntry> = emptyList())

@Serializable
data class ArtistInfoResponse(val image: String? = null)

@Serializable
data class MeResponse(val user: User)

interface ApiService {

    @GET("api/search")
    suspend fun search(@Query("q") query: String): SearchResponse

    @GET("api/suggestions")
    suspend fun suggestions(@Query("q") query: String): List<String>

    @GET("api/feed")
    suspend fun feed(): List<FeedSection>

    @GET("api/universal-search")
    suspend fun universalSearch(@Query("q") query: String): UniversalSearchResponse

    @GET("api/collection")
    suspend fun collection(@Query("id") id: String): CollectionResponse

    @GET("api/track/{id}")
    suspend fun trackInfo(@Path("id") id: String): Track

    @GET("api/artist/info")
    suspend fun artistInfo(@Query("q") name: String): ArtistInfoResponse

    @GET("api/browse")
    suspend fun browse(@Query("country") country: String): Map<String, List<StaticPlaylist>>

    @GET("api/recommendations")
    suspend fun recommendations(
        @Query("seed") seed: String,
        @Query("seed_type") seedType: String,
        @Query("limit") limit: Int,
    ): Recommendations

    @GET("api/lyrics")
    suspend fun lyrics(
        @Query("track") title: String,
        @Query("artist") artist: String,
        @Query("video_id") id: String,
    ): LyricsResponse

    @GET("api/video-stats")
    suspend fun videoStats(@Query("id") id: String): VideoStats

    @GET("api/charts")
    suspend fun charts(@Query("chart_type") type: String): ChartsResponse

    @GET("api/new-releases")
    suspend fun newReleases(@Query("region") region: String): NewReleasesResponse

    @GET("api/artists")
    suspend fun artists(@Query("region") region: String): ArtistsResponse

    @POST("api/settings/update-ytdlp")
    suspend fun updateYtdlp(): Response<UpdateResult>

    @POST("api/settings/fetch-cookies")
    suspend fun fetchCookies(): Response<CookieResult>

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("api/auth/logout")
    suspend fun logout(@Body body: TokenRequest): Response<Unit>

    @POST("api/auth/me")
    suspend fun me(@Body body: TokenRequest): MeResponse

    @POST("api/auth/pair/generate")
    suspend fun pairGenerate(@Body body: TokenRequest): PairGenerateResponse

    @POST("api/auth/pair/link")
    suspend fun pairLink(@Body body: PairLinkRequest): AuthResponse
}
