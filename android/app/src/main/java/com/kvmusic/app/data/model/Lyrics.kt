package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LyricLine(
    val time: Double = 0.0,
    val text: String = "",
)

@Serializable
data class LyricsResponse(
    val syncedLyrics: String? = null,
    val plainLyrics: String? = null,
)
