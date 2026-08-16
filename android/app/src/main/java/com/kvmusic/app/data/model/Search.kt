package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UniversalSearchResponse(
    val songs: List<Track> = emptyList(),
    val albums: List<AlbumHit> = emptyList(),
    val playlists: List<PlaylistHit> = emptyList(),
    val artists: List<ArtistHit> = emptyList(),
)

@Serializable
data class AlbumHit(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    val cover_url: String? = null,
)

@Serializable
data class PlaylistHit(
    val id: String = "",
    val title: String = "",
    val cover_url: String? = null,
)

@Serializable
data class ArtistHit(
    val id: String = "",
    val name: String = "",
    val photo: String? = null,
)
