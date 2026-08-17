package com.kvmusic.app.player

import android.content.Context
import android.content.Intent
import android.os.Build
import android.net.Uri
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import java.io.ByteArrayOutputStream
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import com.kvmusic.app.KVMusicApp
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.Track
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.random.Random

object PlayerManager {

    private var exoPlayer: ExoPlayer? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val _currentTrack = MutableStateFlow<Track?>(null)
    val currentTrack: StateFlow<Track?> = _currentTrack

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying

    private val _currentCoverBitmap = MutableStateFlow<Bitmap?>(null)
    val currentCoverBitmap: StateFlow<Bitmap?> = _currentCoverBitmap

    private val _currentPosition = MutableStateFlow(0L)
    val currentPosition: StateFlow<Long> = _currentPosition

    private val _duration = MutableStateFlow(0L)
    val duration: StateFlow<Long> = _duration

    private val _queue = MutableStateFlow<List<Track>>(emptyList())
    val queue: StateFlow<List<Track>> = _queue

    private val _queueIndex = MutableStateFlow(0)
    val queueIndex: StateFlow<Int> = _queueIndex

    private val _isShuffle = MutableStateFlow(false)
    val isShuffle: StateFlow<Boolean> = _isShuffle

    private val _isRepeat = MutableStateFlow(false)
    val isRepeat: StateFlow<Boolean> = _isRepeat

    private val _waveformBars = MutableStateFlow<List<Float>>(emptyList())
    val waveformBars: StateFlow<List<Float>> = _waveformBars

    private val _likedTrackIds = MutableStateFlow<Set<String>>(emptySet())
    val likedTrackIds: StateFlow<Set<String>> = _likedTrackIds

    private val _recentlyPlayedHistory = MutableStateFlow<List<Track>>(emptyList())
    val recentlyPlayedHistory: StateFlow<List<Track>> = _recentlyPlayedHistory

    init {
        startProgressTracker()
    }

    fun getExoPlayer(context: Context): ExoPlayer {
        if (exoPlayer == null) {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build()

            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setUserAgent("KVMusic-Android/1.0")

            val mediaSourceFactory = DefaultMediaSourceFactory(context.applicationContext)
                .setDataSourceFactory(httpDataSourceFactory)

            exoPlayer = ExoPlayer.Builder(context.applicationContext)
                .setMediaSourceFactory(mediaSourceFactory)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build().apply {
                    addListener(object : Player.Listener {
                        override fun onIsPlayingChanged(playing: Boolean) {
                            _isPlaying.value = playing
                        }

                        override fun onPlaybackStateChanged(state: Int) {
                            if (state == Player.STATE_READY) {
                                _duration.value = duration.coerceAtLeast(0L)
                            } else if (state == Player.STATE_ENDED) {
                                playNext()
                            }
                        }
                    })
                }
        }
        return exoPlayer!!
    }

    fun playTrack(track: Track, newQueue: List<Track> = listOf(track)) {
        val player = exoPlayer ?: getExoPlayer(KVMusicApp.instance)
        _currentTrack.value = track
        _queue.value = newQueue
        _queueIndex.value = newQueue.indexOfFirst { it.id == track.id }.coerceAtLeast(0)

        // Save to Recently Played History
        val currentHistory = _recentlyPlayedHistory.value.toMutableList()
        currentHistory.removeAll { it.id == track.id }
        currentHistory.add(0, track)
        _recentlyPlayedHistory.value = currentHistory.take(50)

        // Generate synthetic SoundCloud waveform peaks deterministically based on track ID
        generateWaveform(track.id)

        val rawUrl = if (track.url.startsWith("http")) track.url else RetrofitClient.getStreamUrl(track.id)
        val streamUrl = if (rawUrl.contains("?")) "$rawUrl&fmt=m4a" else "$rawUrl?fmt=m4a"

        val mediaItem = MediaItem.Builder()
            .setUri(Uri.parse(streamUrl))
            .setMimeType(MimeTypes.AUDIO_AAC)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(track.title)
                    .setArtist(track.artist)
                    .setAlbumTitle(track.artist)
                    .setArtworkUri(Uri.parse(track.coverUrl))
                    .setIsPlayable(true)
                    .build()
            )
            .build()

        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        _isPlaying.value = true

        try {
            val context = KVMusicApp.instance
            val serviceIntent = Intent(context, PlaybackService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Asynchronously load artwork bytes for Android 13/14 System Lockscreen & Notification Media Control Card
        scope.launch(Dispatchers.IO) {
            try {
                val context = KVMusicApp.instance
                val request = ImageRequest.Builder(context)
                    .data(track.coverUrl)
                    .allowHardware(false)
                    .build()
                val result = (context.imageLoader.execute(request) as? SuccessResult)?.drawable
                val bitmap = (result as? BitmapDrawable)?.bitmap
                if (bitmap != null) {
                    val stream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
                    val byteArray = stream.toByteArray()

                    withContext(Dispatchers.Main) {
                        if (_currentTrack.value?.id == track.id) {
                            _currentCoverBitmap.value = bitmap
                            val updatedMetadata = MediaMetadata.Builder()
                                .setTitle(track.title)
                                .setArtist(track.artist)
                                .setAlbumTitle(track.artist)
                                .setArtworkData(byteArray, MediaMetadata.PICTURE_TYPE_FRONT_COVER)
                                .setArtworkUri(Uri.parse(track.coverUrl))
                                .setIsPlayable(true)
                                .build()

                            val updatedItem = mediaItem.buildUpon()
                                .setMediaMetadata(updatedMetadata)
                                .build()

                            val p = exoPlayer
                            if (p != null) {
                                val curPos = p.currentPosition
                                p.replaceMediaItem(p.currentMediaItemIndex.coerceAtLeast(0), updatedItem)
                                p.seekTo(curPos)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun togglePlayPause() {
        val player = exoPlayer ?: return
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
        _currentPosition.value = positionMs
    }

    fun playNext() {
        val q = _queue.value
        if (q.isEmpty()) return
        var nextIdx = _queueIndex.value + 1
        if (nextIdx >= q.size) {
            if (_isRepeat.value) {
                nextIdx = 0
            } else {
                return
            }
        }
        val nextTrack = q[nextIdx]
        playTrack(nextTrack, q)
    }

    fun playPrevious() {
        val q = _queue.value
        if (q.isEmpty()) return
        val prevIdx = (_queueIndex.value - 1).coerceAtLeast(0)
        val prevTrack = q[prevIdx]
        playTrack(prevTrack, q)
    }

    private val _downloadedTrackIds = MutableStateFlow<Set<String>>(emptySet())
    val downloadedTrackIds: StateFlow<Set<String>> = _downloadedTrackIds

    fun toggleDownload(context: Context, track: Track) {
        val current = _downloadedTrackIds.value.toMutableSet()
        if (current.contains(track.id)) {
            current.remove(track.id)
            _downloadedTrackIds.value = current
            android.widget.Toast.makeText(context, "Removed '${track.title}' from app storage", android.widget.Toast.LENGTH_SHORT).show()
        } else {
            current.add(track.id)
            _downloadedTrackIds.value = current
            android.widget.Toast.makeText(context, "Saved '${track.title}' for offline playback in app!", android.widget.Toast.LENGTH_SHORT).show()
        }
    }

    fun isTrackDownloaded(trackId: String): Boolean {
        return _downloadedTrackIds.value.contains(trackId)
    }

    fun toggleLike(trackId: String) {
        val current = _likedTrackIds.value.toMutableSet()
        if (current.contains(trackId)) {
            current.remove(trackId)
        } else {
            current.add(trackId)
        }
        _likedTrackIds.value = current
    }

    fun isTrackLiked(trackId: String): Boolean {
        return _likedTrackIds.value.contains(trackId)
    }

    fun clearAllUserData() {
        _likedTrackIds.value = emptySet()
        _recentlyPlayedHistory.value = emptyList()
        _downloadedTrackIds.value = emptySet()
        _currentTrack.value = null
        _queue.value = emptyList()
        _queueIndex.value = 0
        _isPlaying.value = false
        try {
            exoPlayer?.stop()
            exoPlayer?.clearMediaItems()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun toggleShuffle() {
        _isShuffle.value = !_isShuffle.value
    }

    fun toggleRepeat() {
        _isRepeat.value = !_isRepeat.value
    }

    private fun generateWaveform(seedStr: String) {
        val seed = seedStr.hashCode().toLong()
        val random = Random(seed)
        val barCount = 70
        val bars = ArrayList<Float>(barCount)
        for (i in 0 until barCount) {
            val norm = (i.toFloat() / barCount)
            val envelope = (Math.sin(norm * Math.PI) * 0.4 + 0.6).toFloat()
            val amp = (random.nextFloat() * 0.7f + 0.3f) * envelope
            bars.add(amp.coerceIn(0.12f, 1.0f))
        }
        _waveformBars.value = bars
    }

    private fun startProgressTracker() {
        scope.launch {
            while (isActive) {
                exoPlayer?.let { player ->
                    if (player.isPlaying) {
                        _currentPosition.value = player.currentPosition
                        _duration.value = player.duration.coerceAtLeast(0L)
                    }
                }
                delay(200)
            }
        }
    }
}
