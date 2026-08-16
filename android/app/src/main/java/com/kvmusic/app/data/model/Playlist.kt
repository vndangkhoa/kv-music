package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class StaticPlaylist(
    val id: String = "",
    val type: String = "Playlist",
    val title: String = "",
    val cover_url: String? = null,
    val description: String? = null,
    val creator: String? = null,
)
