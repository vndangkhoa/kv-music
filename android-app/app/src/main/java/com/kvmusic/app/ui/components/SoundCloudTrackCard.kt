package com.kvmusic.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.player.PlayerManager

@Composable
fun SoundCloudTrackCard(
    track: Track,
    queue: List<Track> = listOf(track),
    @Suppress("UNUSED_PARAMETER") repostedBy: String? = null,
    modifier: Modifier = Modifier
) {
    val currentTrack by PlayerManager.currentTrack.collectAsState()
    val likedTrackIds by PlayerManager.likedTrackIds.collectAsState()
    val isCurrent = currentTrack?.id == track.id
    val isLiked = likedTrackIds.contains(track.id)

    TrackListItem(
        track = track,
        onTrackClick = {
            if (isCurrent) {
                PlayerManager.togglePlayPause()
            } else {
                PlayerManager.playTrack(track, queue)
            }
        },
        isLiked = isLiked,
        onLikeClick = { PlayerManager.toggleLike(track.id) },
        modifier = modifier,
        queue = queue
    )
}
