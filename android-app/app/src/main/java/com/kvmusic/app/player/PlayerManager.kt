package com.kvmusic.app.player

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.util.Log
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.kvmusic.app.KVMusicApp
import com.kvmusic.app.data.api.InnerTubeMusicClient
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.download.OfflineDownloadManager
import com.kvmusic.app.data.model.Track
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.random.Random

object PlayerManager {

    private const val TAG = "PlayerManager"
    private const val BENCH_TAG = "KV_BENCH"

    private var exoPlayer: ExoPlayer? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var activePlayJob: Job? = null
    private var prefetchJob: Job? = null

    @Volatile
    private var currentPlayUsedDirectInnerTube: Boolean = false
    private val failoverAttemptedTrackIds = java.util.Collections.synchronizedSet(mutableSetOf<String>())

    // Latency instrumentation state
    @Volatile
    private var benchTrackId: String = ""
    @Volatile
    private var benchTapElapsedMs: Long = 0L
    @Volatile
    private var benchSource: String = ""
    @Volatile
    private var benchReadyLogged: Boolean = false
    @Volatile
    private var benchPlayingLogged: Boolean = false

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

    private val _lastLoadLatencyMs = MutableStateFlow<Long?>(null)
    val lastLoadLatencyMs: StateFlow<Long?> = _lastLoadLatencyMs

    private val _lastLoadSource = MutableStateFlow<String?>(null)
    val lastLoadSource: StateFlow<String?> = _lastLoadSource

    val downloadedTracks: StateFlow<List<Track>> get() = OfflineDownloadManager.downloadedTracks
    val downloadedTrackIds: StateFlow<Set<String>> get() = OfflineDownloadManager.downloadedTrackIds
    val downloadProgress: StateFlow<Map<String, Float>> get() = OfflineDownloadManager.downloadProgress
    val totalDownloadBytes: StateFlow<Long> get() = OfflineDownloadManager.totalStorageBytes

    init {
        startProgressTracker()
    }

    @OptIn(UnstableApi::class)
    fun getExoPlayer(context: Context): ExoPlayer {
        if (exoPlayer == null) {
            val appCtx = context.applicationContext
            OfflineDownloadManager.init(appCtx)

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build()

            val dataSourceFactory = AudioCacheManager.buildPlaybackDataSourceFactory(appCtx)

            val mediaSourceFactory = DefaultMediaSourceFactory(appCtx)
                .setDataSourceFactory(dataSourceFactory)

            // Tuned for ultra-low tap-to-audio start latency while keeping generous steady-state buffer
            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(15_000, 50_000, 250, 750)
                .build()

            exoPlayer = ExoPlayer.Builder(appCtx)
                .setLoadControl(loadControl)
                .setMediaSourceFactory(mediaSourceFactory)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build().apply {
                    addListener(object : Player.Listener {
                        override fun onIsPlayingChanged(playing: Boolean) {
                            _isPlaying.value = playing
                            if (playing) {
                                maybeLogPlayStart()
                            }
                        }

                        override fun onPlaybackStateChanged(state: Int) {
                            if (state == Player.STATE_READY) {
                                _duration.value = duration.coerceAtLeast(0L)
                                val track = _currentTrack.value
                                if (track != null && track.id == benchTrackId && !benchReadyLogged) {
                                    benchReadyLogged = true
                                    val readyMs = (SystemClock.elapsedRealtime() - benchTapElapsedMs).coerceAtLeast(0L)
                                    _lastLoadLatencyMs.value = readyMs
                                    _lastLoadSource.value = benchSource
                                    Log.i(
                                        BENCH_TAG,
                                        "PLAY_READY track=${track.id} title=\"${track.title}\" source=$benchSource readyMs=$readyMs"
                                    )
                                }
                                if (isPlaying) {
                                    maybeLogPlayStart()
                                }
                            } else if (state == Player.STATE_ENDED) {
                                playNext()
                            }
                        }

                        override fun onPlayerError(error: PlaybackException) {
                            val track = _currentTrack.value ?: return
                            Log.w(TAG, "Playback error on ${track.id} (directInnerTube=$currentPlayUsedDirectInnerTube): ${error.message}")
                            if (!failoverAttemptedTrackIds.add(track.id)) return

                            if (currentPlayUsedDirectInnerTube) {
                                InnerTubeMusicClient.invalidate(track.id)
                                benchSource = "SERVER_FAILOVER"
                                val fallbackUrl = buildServerStreamUrl(track)
                                startMediaItem(
                                    track = track,
                                    streamUrl = fallbackUrl,
                                    mimeType = null,
                                    usedDirectInnerTube = false,
                                    cacheKey = AudioCacheManager.trackCacheKey(track.id)
                                )
                            } else {
                                // Evict any incomplete/bad cache entry before failover
                                AudioCacheManager.evictTrack(appCtx, track.id)
                                if (RetrofitClient.isWarpBypassEnabled()) {
                                    activePlayJob?.cancel()
                                    activePlayJob = scope.launch {
                                        val resolved = InnerTubeMusicClient.resolveAudioStream(
                                            trackId = track.id,
                                            preferM4a = true,
                                            bypassCache = true
                                        )
                                        if (resolved != null && _currentTrack.value?.id == track.id) {
                                            benchSource = "INNERTUBE_FALLBACK"
                                            startMediaItem(
                                                track = track,
                                                streamUrl = resolved.url,
                                                mimeType = resolved.mimeType,
                                                usedDirectInnerTube = true,
                                                cacheKey = null
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                            if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO || reason == Player.MEDIA_ITEM_TRANSITION_REASON_SEEK) {
                                val currentMediaUri = mediaItem?.localConfiguration?.uri?.toString()
                                val queueList = _queue.value
                                if (currentMediaUri != null && queueList.isNotEmpty()) {
                                    val matchedIndex = queueList.indexOfFirst { track ->
                                        val trackRawUrl = buildServerStreamUrl(track)
                                        currentMediaUri.contains(track.id) || trackRawUrl.contains(currentMediaUri)
                                    }
                                    if (matchedIndex != -1 && matchedIndex != _queueIndex.value) {
                                        _queueIndex.value = matchedIndex
                                        _currentTrack.value = queueList[matchedIndex]
                                    }
                                }
                            }
                        }
                    })
                }
        }
        return exoPlayer!!
    }

    private fun maybeLogPlayStart() {
        val track = _currentTrack.value ?: return
        if (track.id == benchTrackId && benchReadyLogged && !benchPlayingLogged) {
            benchPlayingLogged = true
            val playingMs = (SystemClock.elapsedRealtime() - benchTapElapsedMs).coerceAtLeast(0L)
            Log.i(
                BENCH_TAG,
                "PLAY_START track=${track.id} title=\"${track.title}\" source=$benchSource playingMs=$playingMs"
            )
        }
    }

    /**
     * Uses default `/api/stream/{id}` (WebM/Opus, natively supported by ExoPlayer) instead of forcing
     * `?fmt=m4a`, hitting the server's WARP/Companion prefetch cache and 256 KiB progressive burst.
     */
    private fun buildServerStreamUrl(track: Track): String {
        val rawUrl = if (track.url.startsWith("http://") || track.url.startsWith("https://")) {
            track.url
        } else {
            RetrofitClient.getStreamUrl(track.id)
        }
        return rawUrl
    }

    fun playTrack(track: Track, newQueue: List<Track> = listOf(track)) {
        val appCtx = KVMusicApp.instance
        getExoPlayer(appCtx)
        activePlayJob?.cancel()
        failoverAttemptedTrackIds.remove(track.id)

        benchTrackId = track.id
        benchTapElapsedMs = SystemClock.elapsedRealtime()
        benchReadyLogged = false
        benchPlayingLogged = false
        _lastLoadLatencyMs.value = null
        _lastLoadSource.value = null

        _currentTrack.value = track
        _queue.value = newQueue
        _queueIndex.value = newQueue.indexOfFirst { it.id == track.id }.coerceAtLeast(0)

        // Save to Recently Played History
        val currentHistory = _recentlyPlayedHistory.value.toMutableList()
        currentHistory.removeAll { it.id == track.id }
        currentHistory.add(0, track)
        _recentlyPlayedHistory.value = currentHistory.take(50)

        generateWaveform(track.id)

        // 1. Offline local file playback (<30ms, zero network)
        val offlineFile = OfflineDownloadManager.getOfflineFile(track.id)
        if (offlineFile != null) {
            benchSource = "OFFLINE_FILE"
            Log.i(BENCH_TAG, "TAP track=${track.id} title=\"${track.title}\" source=$benchSource")
            startMediaItem(
                track = track,
                streamUrl = Uri.fromFile(offlineFile).toString(),
                mimeType = null,
                usedDirectInnerTube = false,
                cacheKey = null
            )
            prefetchUpcoming(newQueue, _queueIndex.value)
            return
        }

        val serverStreamUrl = buildServerStreamUrl(track)
        val isCustomHttpTrack = track.url.startsWith("http://") || track.url.startsWith("https://")
        val hasValidYtId = InnerTubeMusicClient.extractVideoId(track.id).matches(Regex("[A-Za-z0-9_-]{11}"))
        val useCustomProxyPrimary = RetrofitClient.isWarpBypassEnabled() &&
            RetrofitClient.getWarpProxyUrl().isNotBlank() &&
            hasValidYtId &&
            !isCustomHttpTrack

        if (useCustomProxyPrimary) {
            // 2. User explicitly configured a custom phone-side WARP proxy
            benchSource = "INNERTUBE_PROXY"
            Log.i(BENCH_TAG, "TAP track=${track.id} title=\"${track.title}\" source=$benchSource")
            activePlayJob = scope.launch {
                val resolved = InnerTubeMusicClient.resolveAudioStream(trackId = track.id, preferM4a = false)
                if (_currentTrack.value?.id != track.id) return@launch
                if (resolved != null) {
                    startMediaItem(track, resolved.url, resolved.mimeType, usedDirectInnerTube = true, cacheKey = null)
                } else {
                    benchSource = if (AudioCacheManager.isHeadCached(appCtx, track.id)) "SIMPLE_CACHE_HIT" else "SERVER_STREAM"
                    startMediaItem(
                        track = track,
                        streamUrl = serverStreamUrl,
                        mimeType = null,
                        usedDirectInnerTube = false,
                        cacheKey = AudioCacheManager.trackCacheKey(track.id)
                    )
                }
            }
        } else {
            // 3. Default ultra-fast path: SimpleCache-backed server stream (with auto Direct InnerTube failover)
            AudioCacheManager.prioritizeTrack(track.id)
            val headCached = AudioCacheManager.isHeadCached(appCtx, track.id)
            benchSource = if (headCached) "SIMPLE_CACHE_HIT" else "SERVER_STREAM"
            Log.i(BENCH_TAG, "TAP track=${track.id} title=\"${track.title}\" source=$benchSource")
            val cacheKey = if (!isCustomHttpTrack) AudioCacheManager.trackCacheKey(track.id) else null
            startMediaItem(
                track = track,
                streamUrl = serverStreamUrl,
                mimeType = null,
                usedDirectInnerTube = false,
                cacheKey = cacheKey
            )
        }

        prefetchUpcoming(newQueue, _queueIndex.value)
    }

    private fun prefetchUpcoming(queue: List<Track>, currentIndex: Int) {
        val nextTracks = ((currentIndex + 1)..(currentIndex + 3))
            .mapNotNull { idx -> queue.getOrNull(idx) }
        if (nextTracks.isEmpty()) return

        prefetchJob?.cancel()
        prefetchJob = scope.launch(Dispatchers.IO) {
            delay(250)
            if (!isActive) return@launch
            AudioCacheManager.preloadTracks(KVMusicApp.instance, nextTracks, maxCount = 3)
        }
    }

    private fun startMediaItem(
        track: Track,
        streamUrl: String,
        mimeType: String?,
        usedDirectInnerTube: Boolean,
        cacheKey: String?
    ) {
        val player = exoPlayer ?: getExoPlayer(KVMusicApp.instance)
        currentPlayUsedDirectInnerTube = usedDirectInnerTube

        val itemBuilder = MediaItem.Builder()
            .setUri(Uri.parse(streamUrl))
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(track.title)
                    .setArtist(track.artist)
                    .setAlbumTitle(track.album.ifBlank { track.artist })
                    .setArtworkUri(Uri.parse(track.coverUrl))
                    .setIsPlayable(true)
                    .build()
            )
        if (!mimeType.isNullOrBlank()) {
            itemBuilder.setMimeType(mimeType)
        }
        if (!cacheKey.isNullOrBlank()) {
            itemBuilder.setCustomCacheKey(cacheKey)
        }
        val mediaItem = itemBuilder.build()

        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        _isPlaying.value = true

        val deltaSet = (SystemClock.elapsedRealtime() - benchTapElapsedMs).coerceAtLeast(0L)
        Log.d(BENCH_TAG, "MEDIA_SET track=${track.id} source=$benchSource deltaMs=$deltaSet")

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

        // Load artwork bitmap for lockscreen/notification UI without replacing the active MediaItem
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
                    withContext(Dispatchers.Main) {
                        if (_currentTrack.value?.id == track.id) {
                            _currentCoverBitmap.value = bitmap
                        }
                    }
                }
            } catch (_: Exception) {
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

    fun toggleDownload(context: Context, track: Track) {
        OfflineDownloadManager.toggleDownload(context, track)
    }

    fun downloadTracks(context: Context, tracks: List<Track>) {
        OfflineDownloadManager.downloadTracks(context, tracks)
    }

    fun isTrackDownloaded(trackId: String): Boolean {
        return OfflineDownloadManager.isDownloaded(trackId)
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
