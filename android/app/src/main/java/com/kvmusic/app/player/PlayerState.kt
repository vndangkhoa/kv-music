package com.kvmusic.app.player

import com.kvmusic.app.data.model.Track

data class PlayerUiState(
    val currentTrack: Track? = null,
    val queue: List<Track> = emptyList(),
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val positionMs: Long = 0,
    val durationMs: Long = 0,
    val shuffle: Boolean = false,
    val repeatMode: Int = 0,
    val volume: Float = 1f,
    val isVideoMode: Boolean = false,
)
