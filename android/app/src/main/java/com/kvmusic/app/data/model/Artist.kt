package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ArtistChartEntry(
    val id: String = "",
    val name: String = "",
    val photo: String = "",
    val followers: String = "",
)
