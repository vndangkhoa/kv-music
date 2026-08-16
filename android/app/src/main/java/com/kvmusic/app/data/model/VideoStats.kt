package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class VideoStats(
    val view_count: Long? = null,
    val like_count: Long? = null,
    val comment_count: Long? = null,
)
