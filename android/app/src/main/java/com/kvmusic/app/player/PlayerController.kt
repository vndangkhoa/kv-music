package com.kvmusic.app.player

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.remote.ApiClient
import com.kvmusic.app.data.repository.LibraryRepository
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@OptIn(UnstableApi::class)
class PlayerController(
    context: Context,
    private val apiClient: ApiClient,
    private val libraryRepository: LibraryRepository,
) {

    private val appContext = context.applicationContext
    private val controllerScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private val _progress = MutableStateFlow(0L)
    val progress: StateFlow<Long> = _progress.asStateFlow()

    private val playerDelegate = lazy { createPlayer() }
    val player: ExoPlayer get() = playerDelegate.value

    private val trackQueue = mutableListOf<Track>()
    private val retriedAsM4a = mutableSetOf<String>()
    private var shuffleEnabled = false
    private var resumeAfterVideo = false

    private val playerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _state.update { it.copy(isPlaying = isPlaying) }
            if (isPlaying) startPlaybackService()
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            _state.update { it.copy(isBuffering = playbackState == Player.STATE_BUFFERING) }
            syncFromPlayer()
        }

        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            syncFromPlayer()
            recordPlayed(trackQueue.getOrNull(player.currentMediaItemIndex))
        }

        override fun onRepeatModeChanged(repeatMode: Int) {
            _state.update { it.copy(repeatMode = repeatMode) }
        }

        override fun onPlayerError(error: PlaybackException) {
            retryWithM4a()
        }
    }

    init {
        controllerScope.launch {
            while (true) {
                delay(250)
                if (playerDelegate.isInitialized() && player.isPlaying) {
                    _progress.value = player.currentPosition.coerceAtLeast(0L)
                }
            }
        }
    }

    fun playTrack(track: Track, queue: List<Track>? = null, startIndex: Int = 0) {
        val items = queue ?: listOf(track)
        if (items.isEmpty()) return
        retriedAsM4a.clear()
        val shuffle = shuffleEnabled && items.size > 1
        val ordered = if (shuffle) {
            val start = startIndex.coerceIn(0, items.lastIndex)
            listOf(items[start]) + items.filterIndexed { i, _ -> i != start }.shuffled()
        } else {
            items
        }
        trackQueue.clear()
        trackQueue.addAll(ordered)
        player.setMediaItems(
            ordered.map { buildMediaItem(it) },
            if (shuffle) 0 else startIndex.coerceIn(0, items.lastIndex),
            0L,
        )
        player.prepare()
        player.play()
        syncFromPlayer()
    }

    fun playQueue(tracks: List<Track>, startIndex: Int = 0) {
        if (tracks.isEmpty()) return
        playTrack(tracks[startIndex.coerceIn(0, tracks.lastIndex)], tracks, startIndex)
    }

    fun togglePlayPause() {
        if (player.mediaItemCount == 0) return
        if (player.isPlaying) player.pause() else player.play()
    }

    fun next() {
        if (trackQueue.isEmpty()) return
        if (shuffleEnabled && trackQueue.size > 1) {
            val current = player.currentMediaItemIndex
            var target = current
            while (target == current) {
                target = Random.nextInt(trackQueue.size)
            }
            seekToIndex(target)
        } else {
            player.seekToNextMediaItem()
            if (player.playbackState == Player.STATE_IDLE) player.prepare()
        }
    }

    fun previous() {
        if (player.mediaItemCount == 0) return
        if (player.currentPosition > 3_000L) {
            player.seekTo(0L)
            _progress.value = 0L
            _state.update { it.copy(positionMs = 0L) }
        } else if (player.currentMediaItemIndex > 0) {
            seekToIndex(player.currentMediaItemIndex - 1)
        } else {
            seekToIndex(0)
        }
    }

    fun seekTo(ms: Long) {
        if (player.mediaItemCount == 0) return
        val position = ms.coerceAtLeast(0L)
        player.seekTo(position)
        _progress.value = position
        _state.update { it.copy(positionMs = position) }
    }

    fun setShuffle(on: Boolean) {
        shuffleEnabled = on
        _state.update { it.copy(shuffle = on) }
    }

    fun cycleRepeat() {
        player.repeatMode = (player.repeatMode + 1) % 3
    }

    fun setVideoMode(on: Boolean) {
        if (_state.value.isVideoMode == on) return
        if (playerDelegate.isInitialized()) {
            if (on) {
                resumeAfterVideo = player.isPlaying
                player.pause()
                player.volume = 0f
            } else {
                player.volume = _state.value.volume
                if (resumeAfterVideo) player.play()
            }
        }
        _state.update { it.copy(isVideoMode = on) }
    }

    fun removeFromQueue(index: Int) {
        if (index !in trackQueue.indices) return
        trackQueue.removeAt(index)
        player.removeMediaItem(index)
        if (trackQueue.isEmpty()) {
            player.stop()
            player.clearMediaItems()
            resetPlayerState()
        } else {
            syncFromPlayer()
        }
    }

    fun clearQueue() {
        trackQueue.clear()
        retriedAsM4a.clear()
        player.stop()
        player.clearMediaItems()
        resetPlayerState()
    }

    private fun createPlayer(): ExoPlayer =
        ExoPlayer.Builder(appContext)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                true,
            )
            .setHandleAudioBecomingNoisy(true)
            .build()
            .apply { addListener(playerListener) }

    private fun buildMediaItem(track: Track, fmt: String? = null): MediaItem {
        val metadata = MediaMetadata.Builder()
            .setTitle(track.title)
            .setArtist(track.artist)
            .setAlbumTitle(track.album)
            .apply {
                if (track.cover_url.isNotBlank()) {
                    setArtworkUri(Uri.parse(track.cover_url))
                }
            }
            .build()
        return MediaItem.Builder()
            .setMediaId(track.id)
            .setUri(apiClient.streamUrl(track.id, fmt))
            .setMediaMetadata(metadata)
            .build()
    }

    private fun retryWithM4a() {
        val index = player.currentMediaItemIndex
        val track = trackQueue.getOrNull(index) ?: return
        if (!retriedAsM4a.add(track.id)) {
            _state.update { it.copy(isBuffering = false, isPlaying = false) }
            return
        }
        player.replaceMediaItem(index, buildMediaItem(track, fmt = "m4a"))
        if (player.playbackState == Player.STATE_IDLE) player.prepare()
    }

    private fun seekToIndex(index: Int) {
        if (index !in trackQueue.indices) return
        if (player.playbackState == Player.STATE_IDLE) player.prepare()
        player.seekToDefaultPosition(index)
    }

    private fun syncFromPlayer() {
        val index = player.currentMediaItemIndex
        val track = trackQueue.getOrNull(index)
        val duration = player.duration
        _state.update {
            it.copy(
                currentTrack = track,
                queue = trackQueue.toList(),
                isPlaying = player.isPlaying,
                positionMs = player.currentPosition.coerceAtLeast(0),
                durationMs = if (duration == C.TIME_UNSET) 0 else duration,
            )
        }
    }

    private fun resetPlayerState() {
        _state.value = PlayerUiState(
            shuffle = shuffleEnabled,
            repeatMode = player.repeatMode,
            volume = _state.value.volume,
            isVideoMode = _state.value.isVideoMode,
        )
    }

    private fun recordPlayed(track: Track?) {
        if (track == null) return
        controllerScope.launch(Dispatchers.IO) {
            try {
                libraryRepository.recordPlayed(track)
            } catch (_: Exception) {
            }
        }
    }

    private fun startPlaybackService() {
        try {
            val intent = Intent(appContext, PlaybackService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                appContext.startForegroundService(intent)
            } else {
                appContext.startService(intent)
            }
        } catch (_: Exception) {
        }
    }
}
