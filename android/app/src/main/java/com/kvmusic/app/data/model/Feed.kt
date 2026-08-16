package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class FeedItem(
    val videoId: String? = null,
    val title: String = "",
    val artist: String? = null,
    val thumb: String? = null,
    val playlistId: String? = null,
)

@Serializable
data class FeedSection(
    val title: String = "",
    val items: List<FeedItem> = emptyList(),
)
