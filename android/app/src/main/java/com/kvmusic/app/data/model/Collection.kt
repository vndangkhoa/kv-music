package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CollectionResponse(
    val tracks: List<Track> = emptyList(),
    val title: String = "Collection",
    val cover_url: String = "",
)
