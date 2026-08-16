package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Recommendations(
    val tracks: List<Track> = emptyList(),
    val albums: List<AlbumSuggestion> = emptyList(),
    val playlists: List<PlaylistSuggestion> = emptyList(),
    val artists: List<ArtistSuggestion> = emptyList(),
)

@Serializable
data class AlbumSuggestion(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    val cover_url: String? = null,
)

@Serializable
data class PlaylistSuggestion(
    val id: String = "",
    val title: String = "",
    val cover_url: String? = null,
)

@Serializable
data class ArtistSuggestion(
    val id: String = "",
    val name: String = "",
    val photo_url: String? = null,
)
