package com.kvmusic.app.data.model

import com.google.gson.annotations.SerializedName

data class Track(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    val album: String = "",
    val duration: Int = 0,
    @SerializedName("cover_url") val coverUrl: String = "",
    val url: String = "",
    @SerializedName("view_count") val viewCount: Long? = null,
    @SerializedName("like_count") val likeCount: Long? = null,
    @SerializedName("comment_count") val commentCount: Long? = null,
    val bitrate: Int? = null,
    val codec: String? = null
)

data class AlbumHit(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    @SerializedName("cover_url") val coverUrl: String = "",
    val year: String = ""
)

data class PlaylistHit(
    val id: String = "",
    val title: String = "",
    val author: String = "",
    @SerializedName("cover_url") val coverUrl: String = "",
    @SerializedName("track_count") val trackCount: Int = 0
)

data class ArtistHit(
    val id: String = "",
    val name: String = "",
    @SerializedName("avatar") val avatar: String = "",
    @SerializedName("photo") val photo: String = "",
    @SerializedName("subscribers") val subscribers: String = "",
    @SerializedName("followers") val followers: String = ""
) {
    val displayPhoto: String get() = photo.ifEmpty { avatar }
    val displayFollowers: String get() = followers.ifEmpty { subscribers.ifEmpty { "150K followers" } }
}

data class SearchResponse(
    val tracks: List<Track> = emptyList()
)

data class ArtistsResponse(
    val artists: List<ArtistHit> = emptyList()
)

data class UniversalSearchResponse(
    val songs: List<Track> = emptyList(),
    val albums: List<AlbumHit> = emptyList(),
    val playlists: List<PlaylistHit> = emptyList(),
    val artists: List<ArtistHit> = emptyList()
)

data class FeedSection(
    val title: String,
    val subtitle: String = "",
    val items: List<Track>
)

data class LyricLine(
    val time: Double = 0.0,
    val text: String = ""
)

data class SyncedLyricsResponse(
    val synced: Boolean = false,
    val lyrics: List<LyricLine> = emptyList(),
    val source: String = ""
)

data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    @SerializedName("avatar_color") val avatarColor: String = "",
    @SerializedName("created_at") val createdAt: Long = 0L,
    val liked: List<Track> = emptyList(),
    val history: List<Track> = emptyList()
)

data class AuthResponse(
    val user: User? = null,
    val token: String? = null,
    val error: String? = null
)

data class PairResponse(
    @SerializedName("pair_code") val pairCode: String? = null,
    val error: String? = null,
    val user: User? = null,
    val token: String? = null
)
