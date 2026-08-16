package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Track(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    val album: String = "",
    val duration: Int = 0,
    val cover_url: String = "",
)
