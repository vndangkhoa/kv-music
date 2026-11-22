package com.kvmusic.app.ui.screens.player

import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.Player
import coil.compose.AsyncImage
import com.kvmusic.app.KVMusicApp
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.ArtistHit
import com.kvmusic.app.data.model.LyricLine
import com.kvmusic.app.data.model.SyncedLyricsResponse
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.data.repository.PlaylistManager
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.SaveToPlaylistBottomSheet
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.YouTubeSansFontFamily
import com.kvmusic.app.ui.theme.YtmBlue02
import com.kvmusic.app.ui.theme.YtmEntityHeaderTitle
import com.kvmusic.app.ui.theme.YtmGreen01
import com.kvmusic.app.ui.theme.YtmGrey10
import com.kvmusic.app.ui.theme.YtmGrey11
import com.kvmusic.app.ui.theme.YtmGrey13
import com.kvmusic.app.ui.theme.YtmPureBlack
import com.kvmusic.app.ui.theme.YtmRedAccent
import com.kvmusic.app.ui.theme.YtmWhite
import com.kvmusic.app.ui.theme.YtmWhite10
import com.kvmusic.app.ui.theme.YtmWhite20
import com.kvmusic.app.ui.theme.YtmWhite67
import com.kvmusic.app.ui.theme.YtmWhite70
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.PI
import kotlin.math.sin

private enum class WatchSheetTab(val label: String) {
    UP_NEXT("UP NEXT"),
    LYRICS("LYRICS"),
    RELATED("RELATED")
}

/**
 * Holds Watch Page local UI state & sleep timer coroutine across sheet collapse/expand cycles
 * without modifying [PlayerManager].
 */
private object WatchPageStateHolder {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var timerJob: Job? = null

    private val _isVideoMode = MutableStateFlow(false)
    val isVideoMode: StateFlow<Boolean> = _isVideoMode

    private val _dislikedTrackIds = MutableStateFlow<Set<String>>(emptySet())
    val dislikedTrackIds: StateFlow<Set<String>> = _dislikedTrackIds

    private val _sleepTimerRemainingSec = MutableStateFlow<Int?>(null)
    val sleepTimerRemainingSec: StateFlow<Int?> = _sleepTimerRemainingSec

    private val _sleepTimerEndOfTrackId = MutableStateFlow<String?>(null)
    val sleepTimerEndOfTrackId: StateFlow<String?> = _sleepTimerEndOfTrackId

    private val _repeatOneMode = MutableStateFlow(false)
    val repeatOneMode: StateFlow<Boolean> = _repeatOneMode

    val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    init {
        scope.launch {
            var prevTrackId: String? = PlayerManager.currentTrack.value?.id
            PlayerManager.currentTrack.collect { track ->
                val targetId = _sleepTimerEndOfTrackId.value
                val newId = track?.id
                if (targetId != null && prevTrackId == targetId && newId != targetId) {
                    _sleepTimerEndOfTrackId.value = null
                    if (PlayerManager.isPlaying.value) {
                        PlayerManager.togglePlayPause()
                    }
                    Toast.makeText(
                        KVMusicApp.instance,
                        "Sleep timer paused playback",
                        Toast.LENGTH_SHORT
                    ).show()
                }
                prevTrackId = newId
            }
        }
    }

    fun setVideoMode(video: Boolean) {
        _isVideoMode.value = video
    }

    fun setRepeatOne(enabled: Boolean) {
        _repeatOneMode.value = enabled
    }

    fun toggleDislike(trackId: String) {
        val current = _dislikedTrackIds.value.toMutableSet()
        if (current.contains(trackId)) {
            current.remove(trackId)
        } else {
            current.add(trackId)
            if (PlayerManager.isTrackLiked(trackId)) {
                PlayerManager.toggleLike(trackId)
            }
        }
        _dislikedTrackIds.value = current
    }

    fun clearDislike(trackId: String) {
        if (_dislikedTrackIds.value.contains(trackId)) {
            _dislikedTrackIds.value = _dislikedTrackIds.value - trackId
        }
    }

    fun startMinutesSleepTimer(context: Context, minutes: Int) {
        timerJob?.cancel()
        _sleepTimerEndOfTrackId.value = null
        val totalSeconds = minutes * 60
        _sleepTimerRemainingSec.value = totalSeconds
        timerJob = scope.launch {
            var remaining = totalSeconds
            while (remaining > 0 && isActive) {
                delay(1000L)
                remaining -= 1
                _sleepTimerRemainingSec.value = remaining
            }
            if (isActive && remaining <= 0) {
                _sleepTimerRemainingSec.value = null
                if (PlayerManager.isPlaying.value) {
                    PlayerManager.togglePlayPause()
                }
                Toast.makeText(
                    context.applicationContext,
                    "Sleep timer paused playback",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    fun startEndOfTrackSleepTimer(trackId: String) {
        timerJob?.cancel()
        _sleepTimerRemainingSec.value = null
        _sleepTimerEndOfTrackId.value = trackId
    }

    fun cancelSleepTimer() {
        timerJob?.cancel()
        _sleepTimerRemainingSec.value = null
        _sleepTimerEndOfTrackId.value = null
    }
}

@Composable
fun FullPlayerScreen(
    onCollapse: () -> Unit,
    modifier: Modifier = Modifier,
    musicRepo: MusicRepository? = null
) {
    val resolvedRepo = musicRepo ?: remember {
        try {
            KVMusicApp.instance.musicRepository
        } catch (_: Exception) {
            MusicRepository()
        }
    }
    FullPlayerScreen(
        musicRepo = resolvedRepo,
        onMinimize = onCollapse,
        modifier = modifier
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullPlayerScreen(
    musicRepo: MusicRepository,
    onMinimize: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val haptic = LocalHapticFeedback.current
    val coroutineScope = rememberCoroutineScope()

    val track by PlayerManager.currentTrack.collectAsState()
    val isPlaying by PlayerManager.isPlaying.collectAsState()
    val positionMs by PlayerManager.currentPosition.collectAsState()
    val durationMs by PlayerManager.duration.collectAsState()
    val waveformBars by PlayerManager.waveformBars.collectAsState()
    val isShuffle by PlayerManager.isShuffle.collectAsState()
    val isRepeat by PlayerManager.isRepeat.collectAsState()
    val queue by PlayerManager.queue.collectAsState()
    val queueIndex by PlayerManager.queueIndex.collectAsState()
    val likedTrackIds by PlayerManager.likedTrackIds.collectAsState()
    val downloadedIds by PlayerManager.downloadedTrackIds.collectAsState()
    val downloadProgress by PlayerManager.downloadProgress.collectAsState()

    val isVideoMode by WatchPageStateHolder.isVideoMode.collectAsState()
    val dislikedIds by WatchPageStateHolder.dislikedTrackIds.collectAsState()
    val userPlaylists by PlaylistManager.playlists.collectAsState()
    val sleepTimerSec by WatchPageStateHolder.sleepTimerRemainingSec.collectAsState()
    val sleepTimerEndTrackId by WatchPageStateHolder.sleepTimerEndOfTrackId.collectAsState()
    val repeatOneMode by WatchPageStateHolder.repeatOneMode.collectAsState()

    val currentTrack = track ?: return

    val isLiked = likedTrackIds.contains(currentTrack.id)
    val isDisliked = dislikedIds.contains(currentTrack.id)
    val isDownloaded = downloadedIds.contains(currentTrack.id)
    val currentDownloadProgress = downloadProgress[currentTrack.id]
    val isSaved = isLiked || userPlaylists.any { pl -> pl.tracks.any { it.id == currentTrack.id } }

    // Real ExoPlayer playbackState listener for buffering spinner & REPEAT_MODE_ONE sync
    var isBuffering by remember { mutableStateOf(false) }
    DisposableEffect(context) {
        val player = try {
            PlayerManager.getExoPlayer(context)
        } catch (_: Exception) {
            null
        }
        isBuffering = player?.playbackState == Player.STATE_BUFFERING
        if (player?.repeatMode == Player.REPEAT_MODE_ONE && !repeatOneMode) {
            WatchPageStateHolder.setRepeatOne(true)
        }
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                isBuffering = playbackState == Player.STATE_BUFFERING
            }
        }
        player?.addListener(listener)
        onDispose {
            player?.removeListener(listener)
        }
    }

    LaunchedEffect(isRepeat) {
        if (!isRepeat && repeatOneMode) {
            WatchPageStateHolder.setRepeatOne(false)
            try {
                PlayerManager.getExoPlayer(context).repeatMode = Player.REPEAT_MODE_OFF
            } catch (_: Exception) {
            }
        }
    }

    // Bottom sheet & menu states
    var isBottomSheetOpen by remember { mutableStateOf(false) }
    var activeSheetTab by remember { mutableStateOf(WatchSheetTab.UP_NEXT) }
    var showOverflowSheet by remember { mutableStateOf(false) }
    var showSaveSheet by remember { mutableStateOf(false) }
    var showSleepTimerDialog by remember { mutableStateOf(false) }
    var showCastSheet by remember { mutableStateOf(false) }
    var isStartingRadio by remember { mutableStateOf(false) }

    // Video mode overlay state
    var showVideoOverlay by remember { mutableStateOf(true) }
    LaunchedEffect(isVideoMode, showVideoOverlay, isPlaying, currentTrack.id) {
        if (isVideoMode && showVideoOverlay && isPlaying) {
            delay(3000L)
            showVideoOverlay = false
        }
    }

    // Lyrics & Related data for current track
    var lyrics by remember { mutableStateOf<List<LyricLine>>(emptyList()) }
    var isLyricsLoading by remember { mutableStateOf(false) }
    var relatedTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var relatedArtists by remember { mutableStateOf<List<ArtistHit>>(emptyList()) }
    var isRelatedLoading by remember { mutableStateOf(false) }
    var queueContextLabel by remember { mutableStateOf("Now Playing Queue") }

    LaunchedEffect(currentTrack.id) {
        isLyricsLoading = true
        isRelatedLoading = true
        lyrics = emptyList()
        relatedTracks = emptyList()
        relatedArtists = emptyList()
        queueContextLabel = if (currentTrack.album.isNotBlank()) {
            currentTrack.album
        } else {
            "${currentTrack.artist} Mix"
        }

        coroutineScope {
            launch {
                val loadedLyrics = fetchLyricsWithFallback(musicRepo, currentTrack)
                lyrics = loadedLyrics
                isLyricsLoading = false
            }
            launch {
                val (tracks, artists) = fetchRelatedWithFallback(musicRepo, currentTrack)
                relatedTracks = tracks
                relatedArtists = artists
                isRelatedLoading = false
            }
        }
    }

    // Vertical swipe-down to collapse gesture state
    var swipeOffsetY by remember { mutableFloatStateOf(0f) }
    val animatedOffsetY by animateFloatAsState(
        targetValue = swipeOffsetY,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "playerSwipeOffset"
    )
    val collapseThresholdPx = with(density) { 110.dp.toPx() }

    DisposableEffect(Unit) {
        onDispose { swipeOffsetY = 0f }
    }

    BackHandler(
        enabled = showSleepTimerDialog ||
            showSaveSheet ||
            showOverflowSheet ||
            showCastSheet ||
            isBottomSheetOpen
    ) {
        when {
            showSleepTimerDialog -> showSleepTimerDialog = false
            showSaveSheet -> showSaveSheet = false
            showOverflowSheet -> showOverflowSheet = false
            showCastSheet -> showCastSheet = false
            isBottomSheetOpen -> isBottomSheetOpen = false
        }
    }

    val effectiveDurationMs = if (durationMs > 0L) durationMs else currentTrack.duration.toLong() * 1000L
    val progressFraction = if (effectiveDurationMs > 0L) {
        (positionMs.toFloat() / effectiveDurationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }

    fun startRadioForTrack(target: Track) {
        if (isStartingRadio) return
        isStartingRadio = true
        coroutineScope.launch {
            try {
                val (recs, _) = fetchRelatedWithFallback(musicRepo, target)
                val radioQueue = listOf(target) + recs.filter { it.id != target.id }
                if (radioQueue.size > 1) {
                    queueContextLabel = "${target.title} Radio"
                    PlayerManager.playTrack(radioQueue[1], radioQueue)
                    Toast.makeText(
                        context,
                        "Started ${target.title} radio (${radioQueue.size} tracks)",
                        Toast.LENGTH_SHORT
                    ).show()
                } else {
                    Toast.makeText(context, "Couldn't find radio tracks right now", Toast.LENGTH_SHORT).show()
                }
            } finally {
                isStartingRadio = false
            }
        }
    }

    fun shareTrack(target: Track) {
        val shareUrl = "https://sp.khoavo.myds.me/track/${target.id}"
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            putExtra(
                Intent.EXTRA_TEXT,
                "Listen to '${target.title}' by ${target.artist} on KV Music:\n$shareUrl"
            )
            type = "text/plain"
        }
        context.startActivity(Intent.createChooser(sendIntent, "Share Track"))
    }

    fun cycleRepeatMode() {
        val player = try {
            PlayerManager.getExoPlayer(context)
        } catch (_: Exception) {
            null
        }
        when {
            !isRepeat -> {
                WatchPageStateHolder.setRepeatOne(false)
                player?.repeatMode = Player.REPEAT_MODE_OFF
                PlayerManager.toggleRepeat()
            }
            isRepeat && !repeatOneMode -> {
                WatchPageStateHolder.setRepeatOne(true)
                player?.repeatMode = Player.REPEAT_MODE_ONE
            }
            else -> {
                WatchPageStateHolder.setRepeatOne(false)
                player?.repeatMode = Player.REPEAT_MODE_OFF
                PlayerManager.toggleRepeat()
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(YtmPureBlack)
            .graphicsLayer {
                translationY = animatedOffsetY
            }
            .pointerInput(currentTrack.id) {
                detectVerticalDragGestures(
                    onDragEnd = {
                        if (swipeOffsetY > collapseThresholdPx) {
                            onMinimize()
                        } else {
                            swipeOffsetY = 0f
                        }
                    },
                    onDragCancel = {
                        swipeOffsetY = 0f
                    },
                    onVerticalDrag = { change, dragAmount ->
                        val next = (swipeOffsetY + dragAmount).coerceAtLeast(0f)
                        if (next > 0f || dragAmount > 0f) {
                            change.consume()
                        }
                        swipeOffsetY = next
                    }
                )
            }
    ) {
        // 1. Ambient Blurred / Darkened Album Art Backdrop
        AsyncImage(
            model = currentTrack.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        Modifier.blur(radius = 72.dp, edgeTreatment = BlurredEdgeTreatment.Unbounded)
                    } else {
                        Modifier
                    }
                ),
            alpha = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) 0.52f else 0.28f
        )

        // Vertical Scrim Gradient (#4D000000 -> #CC000000 -> YtmGrey13 -> YtmPureBlack)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0.0f to Color(0x4D000000),
                        0.42f to Color(0xCC000000),
                        0.76f to YtmGrey13,
                        1.0f to YtmPureBlack
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars)
        ) {
            // 2. Top Bar (player_top_controls, paddingHorizontal = 12.dp)
            PlayerTopBar(
                isVideoMode = isVideoMode,
                onCollapse = onMinimize,
                onSelectMode = { video ->
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    WatchPageStateHolder.setVideoMode(video)
                    if (video) showVideoOverlay = true
                },
                onCastClick = { showCastSheet = true },
                onOverflowClick = { showOverflowSheet = true }
            )

            // 3. Main Player Viewport (watch_fragment_container)
            BoxWithConstraints(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                val viewportMaxW = maxWidth
                val viewportMaxH = maxHeight

                AnimatedContent(
                    targetState = isVideoMode,
                    transitionSpec = {
                        fadeIn(tween(220)) togetherWith fadeOut(tween(180))
                    },
                    label = "songVideoViewport"
                ) { video ->
                    if (!video) {
                        // Song mode: 1:1 square artwork, paddingHorizontal = 32.dp, 12.dp corner radius
                        val artSize = minOf(viewportMaxW - 64.dp, viewportMaxH - 16.dp).coerceAtLeast(120.dp)
                        Surface(
                            modifier = Modifier
                                .padding(horizontal = 32.dp, vertical = 8.dp)
                                .size(artSize),
                            shape = RoundedCornerShape(12.dp),
                            color = YtmGrey13,
                            shadowElevation = 18.dp,
                            tonalElevation = 0.dp
                        ) {
                            AsyncImage(
                                model = currentTrack.coverUrl,
                                contentDescription = currentTrack.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    } else {
                        // Video mode: 16:9 video-style visualizer canvas with animated equalizer & overlay controls
                        val availableW = (viewportMaxW - 32.dp).coerceAtLeast(160.dp)
                        val availableH = (viewportMaxH - 16.dp).coerceAtLeast(90.dp)
                        val videoW = minOf(availableW, availableH * (16f / 9f))
                        val videoH = videoW * (9f / 16f)

                        VideoViewportCanvas(
                            track = currentTrack,
                            isPlaying = isPlaying,
                            isBuffering = isBuffering,
                            waveformBars = waveformBars,
                            progressFraction = progressFraction,
                            showOverlay = showVideoOverlay,
                            onToggleOverlay = { showVideoOverlay = !showVideoOverlay },
                            onTogglePlayPause = { PlayerManager.togglePlayPause() },
                            onPrevious = { PlayerManager.playPrevious() },
                            onNext = { PlayerManager.playNext() },
                            modifier = Modifier
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                                .width(videoW)
                                .height(videoH)
                        )
                    }
                }
            }

            // 4. Song Metadata Row (current_song_view, paddingHorizontal = 28.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 28.dp),
                horizontalAlignment = Alignment.Start
            ) {
                Text(
                    text = currentTrack.title,
                    style = YtmEntityHeaderTitle,
                    color = YtmWhite,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = currentTrack.artist,
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.Normal,
                    fontSize = 16.sp,
                    lineHeight = 20.sp,
                    color = YtmWhite67,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 5. Horizontal Scrollable Action Pill Bar (video_action_bar.eml-js, height = 48.dp)
            PlayerActionPillBar(
                track = currentTrack,
                isLiked = isLiked,
                isDisliked = isDisliked,
                isDownloaded = isDownloaded,
                downloadProgress = currentDownloadProgress,
                isSaved = isSaved,
                isStartingRadio = isStartingRadio,
                onToggleLike = {
                    WatchPageStateHolder.clearDislike(currentTrack.id)
                    PlayerManager.toggleLike(currentTrack.id)
                },
                onToggleDislike = {
                    WatchPageStateHolder.toggleDislike(currentTrack.id)
                },
                onLyricsClick = {
                    activeSheetTab = WatchSheetTab.LYRICS
                    isBottomSheetOpen = true
                },
                onSaveClick = { showSaveSheet = true },
                onShareClick = { shareTrack(currentTrack) },
                onDownloadClick = { PlayerManager.toggleDownload(context, currentTrack) },
                onRadioClick = { startRadioForTrack(currentTrack) }
            )

            Spacer(modifier = Modifier.height(14.dp))

            // 6. Linear Seek Bar (MusicPlaybackControlsTimeBar, paddingHorizontal = 28.dp)
            YtmLinearSeekBar(
                positionMs = positionMs,
                durationMs = effectiveDurationMs,
                onSeekTo = { targetMs -> PlayerManager.seekTo(targetMs) }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 7. Playback Controls Row (controls_container, paddingHorizontal = 20.dp)
            PlayerControlsRow(
                isPlaying = isPlaying,
                isBuffering = isBuffering,
                isShuffle = isShuffle,
                isRepeat = isRepeat,
                isRepeatOne = repeatOneMode,
                onShuffleClick = { PlayerManager.toggleShuffle() },
                onPreviousClick = { PlayerManager.playPrevious() },
                onPlayPauseClick = { PlayerManager.togglePlayPause() },
                onNextClick = { PlayerManager.playNext() },
                onRepeatClick = { cycleRepeatMode() }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 8. Bottom Sheet Tab Bar (player_bottom_sheet)
            DockedPlayerBottomSheetBar(
                selectedTab = activeSheetTab,
                isSheetOpen = isBottomSheetOpen,
                onOpenTab = { tab ->
                    activeSheetTab = tab
                    isBottomSheetOpen = true
                },
                onSwipeUp = {
                    isBottomSheetOpen = true
                }
            )
        }

        // Expanded Bottom Sheet: UP NEXT | LYRICS | RELATED
        if (isBottomSheetOpen) {
            ModalBottomSheet(
                onDismissRequest = { isBottomSheetOpen = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = YtmGrey11,
                contentColor = YtmWhite,
                tonalElevation = 0.dp,
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
                dragHandle = {
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 8.dp)
                            .width(40.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(YtmWhite.copy(alpha = 0.3f))
                    )
                }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.88f)
                ) {
                    // Compact docked mini-player header inside expanded sheet (tap to collapse sheet)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { isBottomSheetOpen = false }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AsyncImage(
                            model = currentTrack.coverUrl,
                            contentDescription = currentTrack.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(YtmGrey13)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = currentTrack.title,
                                fontFamily = FontFamily.SansSerif,
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.sp,
                                color = YtmWhite,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = currentTrack.artist,
                                fontFamily = FontFamily.SansSerif,
                                fontWeight = FontWeight.Normal,
                                fontSize = 13.sp,
                                color = YtmWhite67,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        IconButton(onClick = { PlayerManager.togglePlayPause() }) {
                            Icon(
                                imageVector = if (isPlaying) YtmIcons.Pause24 else YtmIcons.Play24,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = YtmWhite,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    // 3 Equal-Width Sheet Tabs
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        WatchSheetTab.entries.forEach { tab ->
                            val isSelected = activeSheetTab == tab
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .clickable { activeSheetTab = tab },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = tab.label,
                                    fontFamily = YouTubeSansFontFamily,
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 14.sp,
                                    color = if (isSelected) YtmWhite else YtmWhite67,
                                    maxLines = 1
                                )
                                if (isSelected) {
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.BottomCenter)
                                            .fillMaxWidth(0.7f)
                                            .height(2.dp)
                                            .background(YtmWhite)
                                    )
                                }
                            }
                        }
                    }

                    // Hairline divider (player_tab_divider)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(YtmWhite10)
                    )

                    when (activeSheetTab) {
                        WatchSheetTab.UP_NEXT -> {
                            UpNextTabContent(
                                currentTrack = currentTrack,
                                queue = queue,
                                queueIndex = queueIndex,
                                contextLabel = queueContextLabel,
                                onPlayQueueIndex = { idx, list ->
                                    if (idx in list.indices) {
                                        PlayerManager.playTrack(list[idx], list)
                                    }
                                },
                                onSaveClick = { showSaveSheet = true }
                            )
                        }

                        WatchSheetTab.LYRICS -> {
                            LyricsTabContent(
                                lyrics = lyrics,
                                isLoading = isLyricsLoading,
                                currentPositionMs = positionMs,
                                onSeekToMs = { seekMs -> PlayerManager.seekTo(seekMs) },
                                onShareLyrics = {
                                    val preview = lyrics.take(4).joinToString("\n") { it.text }
                                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            "\"$preview\"\n— ${currentTrack.title} by ${currentTrack.artist}"
                                        )
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Share Lyrics"))
                                }
                            )
                        }

                        WatchSheetTab.RELATED -> {
                            RelatedTabContent(
                                relatedTracks = relatedTracks,
                                relatedArtists = relatedArtists,
                                isLoading = isRelatedLoading,
                                onTrackClick = { clicked ->
                                    val playList = if (relatedTracks.isNotEmpty()) relatedTracks else listOf(clicked)
                                    PlayerManager.playTrack(clicked, playList)
                                },
                                onArtistClick = { artist ->
                                    coroutineScope.launch {
                                        val res = musicRepo.search(artist.name)
                                        val tracks = res.getOrDefault(emptyList())
                                        val first = tracks.firstOrNull()
                                        if (first != null) {
                                            queueContextLabel = "${artist.name} Mix"
                                            PlayerManager.playTrack(first, tracks)
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }

        // Overflow Menu Bottom Sheet (YtmGrey11)
        if (showOverflowSheet) {
            ModalBottomSheet(
                onDismissRequest = { showOverflowSheet = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = YtmGrey11,
                contentColor = YtmWhite,
                tonalElevation = 0.dp,
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)
            ) {
                TrackOverflowMenuContent(
                    track = currentTrack,
                    isDownloaded = isDownloaded,
                    isSaved = isSaved,
                    sleepTimerRemainingSec = sleepTimerSec,
                    isEndOfTrackSleep = sleepTimerEndTrackId != null,
                    onStartRadio = {
                        showOverflowSheet = false
                        startRadioForTrack(currentTrack)
                    },
                    onSaveToPlaylist = {
                        showOverflowSheet = false
                        showSaveSheet = true
                    },
                    onToggleDownload = {
                        showOverflowSheet = false
                        PlayerManager.toggleDownload(context, currentTrack)
                    },
                    onSleepTimer = {
                        showOverflowSheet = false
                        showSleepTimerDialog = true
                    },
                    onViewLyrics = {
                        showOverflowSheet = false
                        activeSheetTab = WatchSheetTab.LYRICS
                        isBottomSheetOpen = true
                    },
                    onShare = {
                        showOverflowSheet = false
                        shareTrack(currentTrack)
                    },
                    onDismiss = { showOverflowSheet = false }
                )
            }
        }

        // Save to Playlist Bottom Sheet
        if (showSaveSheet) {
            SaveToPlaylistBottomSheet(
                track = currentTrack,
                onDismiss = { showSaveSheet = false }
            )
        }

        // Sleep Timer Dialog
        if (showSleepTimerDialog) {
            SleepTimerDialog(
                currentRemainingSec = sleepTimerSec,
                isEndOfTrackActive = sleepTimerEndTrackId != null,
                onSelectMinutes = { mins ->
                    WatchPageStateHolder.startMinutesSleepTimer(context, mins)
                    showSleepTimerDialog = false
                    Toast.makeText(context, "Sleep timer set for $mins min", Toast.LENGTH_SHORT).show()
                },
                onSelectEndOfTrack = {
                    WatchPageStateHolder.startEndOfTrackSleepTimer(currentTrack.id)
                    showSleepTimerDialog = false
                    Toast.makeText(context, "Playback will pause after this track", Toast.LENGTH_SHORT).show()
                },
                onTurnOff = {
                    WatchPageStateHolder.cancelSleepTimer()
                    showSleepTimerDialog = false
                    Toast.makeText(context, "Sleep timer turned off", Toast.LENGTH_SHORT).show()
                },
                onDismiss = { showSleepTimerDialog = false }
            )
        }

        // Cast / Device Picker Sheet
        if (showCastSheet) {
            ModalBottomSheet(
                onDismissRequest = { showCastSheet = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = YtmGrey11,
                contentColor = YtmWhite,
                tonalElevation = 0.dp,
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "Connect to a device",
                        fontFamily = YouTubeSansFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = YtmWhite
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(YtmWhite10)
                            .clickable { showCastSheet = false }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = YtmIcons.Headset24,
                            contentDescription = null,
                            tint = YtmWhite,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "This phone",
                                fontWeight = FontWeight.Medium,
                                fontSize = 15.sp,
                                color = YtmWhite
                            )
                            Text(
                                text = "Active playback device",
                                fontSize = 12.sp,
                                color = YtmBlue02
                            )
                        }
                        Icon(
                            imageVector = YtmIcons.Check24,
                            contentDescription = "Selected",
                            tint = YtmBlue02,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Bluetooth speakers and Chromecast devices connected in Android system audio will play automatically.",
                        fontSize = 12.sp,
                        color = YtmWhite67
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun PlayerTopBar(
    isVideoMode: Boolean,
    onCollapse: () -> Unit,
    onSelectMode: (Boolean) -> Unit,
    onCastClick: () -> Unit,
    onOverflowClick: () -> Unit
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
    ) {
        val showBalancingSpacer = maxWidth >= 392.dp
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onCollapse,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = YtmIcons.ChevronDown24,
                    contentDescription = "Minimize",
                    tint = YtmWhite,
                    modifier = Modifier.size(24.dp)
                )
            }

            if (showBalancingSpacer) {
                Spacer(modifier = Modifier.size(48.dp))
            }

            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.Center
            ) {
                AudioVideoSwitcherPill(
                    isVideoMode = isVideoMode,
                    onSelectMode = onSelectMode
                )
            }

            IconButton(
                onClick = onCastClick,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = YtmIcons.Cast24,
                    contentDescription = "Cast",
                    tint = YtmWhite,
                    modifier = Modifier.size(24.dp)
                )
            }

            IconButton(
                onClick = onOverflowClick,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = YtmIcons.OverflowVertical24,
                    contentDescription = "Menu",
                    tint = YtmWhite,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
private fun AudioVideoSwitcherPill(
    isVideoMode: Boolean,
    onSelectMode: (Boolean) -> Unit
) {
    val segmentWidth = 82.dp
    val totalWidth = segmentWidth * 2
    val pillHeight = 36.dp
    val indicatorOffset by animateDpAsState(
        targetValue = if (isVideoMode) segmentWidth else 0.dp,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "avSwitcherOffset"
    )

    Box(
        modifier = Modifier
            .width(totalWidth)
            .height(pillHeight)
            .clip(RoundedCornerShape(100.dp))
            .background(Color(0xFF1A1A1A))
            .border(1.dp, YtmWhite10, RoundedCornerShape(100.dp))
    ) {
        // Active sliding inner pill (#FF282828)
        Box(
            modifier = Modifier
                .offset(x = indicatorOffset)
                .width(segmentWidth)
                .fillMaxHeight()
                .clip(RoundedCornerShape(100.dp))
                .background(Color(0xFF282828))
        )

        Row(
            modifier = Modifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier
                    .width(segmentWidth)
                    .fillMaxHeight()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onSelectMode(false) },
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = YtmIcons.Headset24,
                    contentDescription = null,
                    tint = if (!isVideoMode) YtmWhite else YtmWhite70,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = "Song",
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    color = if (!isVideoMode) YtmWhite else YtmWhite70,
                    maxLines = 1
                )
            }

            Row(
                modifier = Modifier
                    .width(segmentWidth)
                    .fillMaxHeight()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { onSelectMode(true) },
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = YtmIcons.Video24,
                    contentDescription = null,
                    tint = if (isVideoMode) YtmWhite else YtmWhite70,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = "Video",
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    color = if (isVideoMode) YtmWhite else YtmWhite70,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun VideoViewportCanvas(
    track: Track,
    isPlaying: Boolean,
    isBuffering: Boolean,
    waveformBars: List<Float>,
    progressFraction: Float,
    showOverlay: Boolean,
    onToggleOverlay: () -> Unit,
    onTogglePlayPause: () -> Unit,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "videoEq")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2f * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "videoEqPhase"
    )
    val playScale by animateFloatAsState(
        targetValue = if (isPlaying) 1.04f else 1.0f,
        animationSpec = tween(durationMillis = 700),
        label = "videoZoom"
    )

    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onToggleOverlay
            ),
        shape = RoundedCornerShape(12.dp),
        color = YtmPureBlack,
        shadowElevation = 18.dp,
        tonalElevation = 0.dp
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = track.coverUrl,
                contentDescription = track.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = playScale
                        scaleY = playScale
                    }
            )

            // Dark video-canvas scrim
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color(0x66000000),
                                Color(0x8C000000),
                                Color(0xCC000000)
                            )
                        )
                    )
            )

            // Animated equalizer / waveform visualizer bars
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(84.dp)
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 18.dp, vertical = 14.dp)
            ) {
                val count = 28
                val gap = 4.dp.toPx()
                val totalGap = gap * (count - 1)
                val barW = ((size.width - totalGap) / count).coerceAtLeast(2.dp.toPx())
                val radius = CornerRadius(barW / 2f, barW / 2f)

                for (i in 0 until count) {
                    val base = if (waveformBars.isNotEmpty()) {
                        waveformBars[(i * waveformBars.size) / count]
                    } else {
                        0.45f
                    }
                    val modulation = if (isPlaying) {
                        val wave = sin(phase + i * 0.48f).toFloat()
                        (0.45f + 0.55f * ((wave + 1f) / 2f)) * base
                    } else {
                        0.18f + 0.15f * base
                    }
                    val barH = (size.height * modulation.coerceIn(0.12f, 1.0f))
                    val x = i * (barW + gap)
                    val y = size.height - barH
                    val normPos = i.toFloat() / count.toFloat()
                    val color = if (normPos <= progressFraction) {
                        YtmWhite.copy(alpha = 0.92f)
                    } else {
                        YtmWhite.copy(alpha = 0.32f)
                    }
                    drawRoundRect(
                        color = color,
                        topLeft = Offset(x, y),
                        size = Size(barW, barH),
                        cornerRadius = radius
                    )
                }
            }

            // Top-left VIDEO • HD badge
            Surface(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(10.dp),
                shape = RoundedCornerShape(6.dp),
                color = Color(0x99000000),
                border = BorderStroke(1.dp, YtmWhite20)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(YtmRedAccent)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "VIDEO • HD",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp,
                        color = YtmWhite
                    )
                }
            }

            // Centered tap-to-toggle overlay playback controls
            AnimatedVisibility(
                visible = showOverlay,
                enter = fadeIn(tween(150)),
                exit = fadeOut(tween(200)),
                modifier = Modifier.fillMaxSize()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0x55000000)),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(24.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onPrevious,
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(
                                imageVector = YtmIcons.SkipPrevious36,
                                contentDescription = "Previous track",
                                tint = YtmWhite,
                                modifier = Modifier.size(32.dp)
                            )
                        }

                        Surface(
                            onClick = onTogglePlayPause,
                            shape = CircleShape,
                            color = Color(0x99000000),
                            border = BorderStroke(1.dp, YtmWhite20),
                            modifier = Modifier.size(56.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (isBuffering && !isPlaying) {
                                    CircularProgressIndicator(
                                        color = YtmWhite,
                                        strokeWidth = 2.5.dp,
                                        modifier = Modifier.size(26.dp)
                                    )
                                } else {
                                    Icon(
                                        imageVector = if (isPlaying) YtmIcons.Pause36 else YtmIcons.Play36,
                                        contentDescription = if (isPlaying) "Pause" else "Play",
                                        tint = YtmWhite,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                        }

                        IconButton(
                            onClick = onNext,
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(
                                imageVector = YtmIcons.SkipNext36,
                                contentDescription = "Next track",
                                tint = YtmWhite,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }
                }
            }

            // Bottom subtle video timeline bar
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(2.dp)
                    .background(YtmWhite20)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progressFraction.coerceIn(0f, 1f))
                        .background(YtmRedAccent)
                )
            }
        }
    }
}

@Composable
private fun PlayerActionPillBar(
    track: Track,
    isLiked: Boolean,
    isDisliked: Boolean,
    isDownloaded: Boolean,
    downloadProgress: Float?,
    isSaved: Boolean,
    isStartingRadio: Boolean,
    onToggleLike: () -> Unit,
    onToggleDislike: () -> Unit,
    onLyricsClick: () -> Unit,
    onSaveClick: () -> Unit,
    onShareClick: () -> Unit,
    onDownloadClick: () -> Unit,
    onRadioClick: () -> Unit
) {
    val likeLabel = remember(track.likeCount, isLiked) {
        val baseCount = track.likeCount ?: 0L
        val effective = if (baseCount > 0L) baseCount + (if (isLiked) 1L else 0L) else 0L
        if (effective > 0L) formatCompactCount(effective) else "Like"
    }

    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp),
        contentPadding = PaddingValues(horizontal = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Pill 1: Segmented Like | Dislike pill (segmented_like_dislike_button.eml-js)
        item {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = YtmWhite10,
                tonalElevation = 0.dp,
                modifier = Modifier.height(36.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxHeight()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxHeight()
                            .clickable(onClick = onToggleLike)
                            .padding(start = 14.dp, end = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isLiked) YtmIcons.ThumbUpFilled else YtmIcons.ThumbUpOutline,
                            contentDescription = "Like",
                            tint = YtmWhite,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = likeLabel,
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp,
                            color = YtmWhite,
                            maxLines = 1
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(18.dp)
                            .background(YtmWhite20)
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .clickable(onClick = onToggleDislike)
                            .padding(horizontal = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isDisliked) YtmIcons.ThumbDownFilled else YtmIcons.ThumbDownOutline,
                            contentDescription = "Dislike",
                            tint = YtmWhite,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        // Pill 2: Lyrics
        item {
            ActionPillChip(
                icon = YtmIcons.LyricsBubble24,
                label = "Lyrics",
                onClick = onLyricsClick
            )
        }

        // Pill 3: Save
        item {
            ActionPillChip(
                icon = if (isSaved) YtmIcons.Check24 else YtmIcons.PlaylistAdd24,
                label = if (isSaved) "Saved" else "Save",
                onClick = onSaveClick
            )
        }

        // Pill 4: Share
        item {
            ActionPillChip(
                icon = YtmIcons.Share24,
                label = "Share",
                onClick = onShareClick
            )
        }

        // Pill 5: Download
        item {
            if (downloadProgress != null) {
                Surface(
                    onClick = onDownloadClick,
                    shape = RoundedCornerShape(18.dp),
                    color = YtmWhite10,
                    tonalElevation = 0.dp,
                    modifier = Modifier.height(36.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxHeight()
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            color = YtmWhite,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        val pct = (downloadProgress * 100f).toInt().coerceIn(1, 99)
                        Text(
                            text = "Saving $pct%",
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp,
                            color = YtmWhite,
                            maxLines = 1
                        )
                    }
                }
            } else {
                ActionPillChip(
                    icon = if (isDownloaded) YtmIcons.Downloaded24 else YtmIcons.Download24,
                    label = if (isDownloaded) "Saved" else "Download",
                    iconTint = if (isDownloaded) YtmGreen01 else YtmWhite,
                    onClick = onDownloadClick
                )
            }
        }

        // Pill 6: Radio
        item {
            Surface(
                onClick = onRadioClick,
                enabled = !isStartingRadio,
                shape = RoundedCornerShape(18.dp),
                color = YtmWhite10,
                tonalElevation = 0.dp,
                modifier = Modifier.height(36.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxHeight()
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isStartingRadio) {
                        CircularProgressIndicator(
                            color = YtmWhite,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Icon(
                            imageVector = YtmIcons.RadioLive24,
                            contentDescription = null,
                            tint = YtmWhite,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Radio",
                        fontFamily = FontFamily.SansSerif,
                        fontWeight = FontWeight.Medium,
                        fontSize = 14.sp,
                        color = YtmWhite,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
private fun ActionPillChip(
    icon: ImageVector,
    label: String,
    iconTint: Color = YtmWhite,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        color = YtmWhite10,
        tonalElevation = 0.dp,
        modifier = Modifier.height(36.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxHeight()
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                fontFamily = FontFamily.SansSerif,
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp,
                color = YtmWhite,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun YtmLinearSeekBar(
    positionMs: Long,
    durationMs: Long,
    onSeekTo: (Long) -> Unit
) {
    var isDragging by remember { mutableStateOf(false) }
    var dragFraction by remember { mutableFloatStateOf(0f) }

    val liveFraction = if (durationMs > 0L) {
        (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val displayFraction = if (isDragging) dragFraction else liveFraction
    val displayPositionMs = if (isDragging && durationMs > 0L) {
        (dragFraction * durationMs).toLong()
    } else {
        positionMs
    }

    val thumbDiameterDp by animateDpAsState(
        targetValue = if (isDragging) 16.dp else 12.dp,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "seekThumbDiameter"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 28.dp)
    ) {
        // 24.dp touch area centered on 2.dp track (track bottom is at 13.dp, 11.dp below + 1.dp Spacer = 12.dp to timestamps)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(24.dp)
                .pointerInput(durationMs) {
                    detectTapGestures { offset ->
                        if (durationMs > 0L) {
                            val frac = (offset.x / size.width.toFloat()).coerceIn(0f, 1f)
                            onSeekTo((frac * durationMs).toLong())
                        }
                    }
                }
                .pointerInput(durationMs) {
                    detectHorizontalDragGestures(
                        onDragStart = { offset ->
                            isDragging = true
                            dragFraction = (offset.x / size.width.toFloat()).coerceIn(0f, 1f)
                        },
                        onHorizontalDrag = { change, _ ->
                            change.consume()
                            dragFraction = (change.position.x / size.width.toFloat()).coerceIn(0f, 1f)
                        },
                        onDragEnd = {
                            if (durationMs > 0L) {
                                onSeekTo((dragFraction * durationMs).toLong())
                            }
                            isDragging = false
                        },
                        onDragCancel = {
                            isDragging = false
                        }
                    )
                },
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val trackHeightPx = 2.dp.toPx()
                val centerY = size.height / 2f
                val thumbRadiusPx = (thumbDiameterDp / 2f).toPx()
                val usableWidth = (size.width - thumbRadiusPx * 2f).coerceAtLeast(1f)
                val thumbX = thumbRadiusPx + usableWidth * displayFraction.coerceIn(0f, 1f)

                // Inactive track (#999999 / YtmWhite20)
                drawLine(
                    color = Color(0xFF999999).copy(alpha = 0.45f),
                    start = Offset(0f, centerY),
                    end = Offset(size.width, centerY),
                    strokeWidth = trackHeightPx,
                    cap = StrokeCap.Round
                )

                // Active track (YtmWhite)
                drawLine(
                    color = YtmWhite,
                    start = Offset(0f, centerY),
                    end = Offset(thumbX, centerY),
                    strokeWidth = trackHeightPx,
                    cap = StrokeCap.Round
                )

                // 12.dp solid YtmWhite circular thumb
                drawCircle(
                    color = YtmWhite,
                    radius = thumbRadiusPx,
                    center = Offset(thumbX, centerY)
                )
            }
        }

        Spacer(modifier = Modifier.height(1.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = formatPlaybackTime(displayPositionMs),
                fontFamily = FontFamily.SansSerif,
                fontWeight = FontWeight.Normal,
                fontSize = 12.sp,
                color = YtmWhite67
            )
            Text(
                text = formatPlaybackTime(durationMs),
                fontFamily = FontFamily.SansSerif,
                fontWeight = FontWeight.Normal,
                fontSize = 12.sp,
                color = YtmWhite67
            )
        }
    }
}

@Composable
private fun PlayerControlsRow(
    isPlaying: Boolean,
    isBuffering: Boolean,
    isShuffle: Boolean,
    isRepeat: Boolean,
    isRepeatOne: Boolean,
    onShuffleClick: () -> Unit,
    onPreviousClick: () -> Unit,
    onPlayPauseClick: () -> Unit,
    onNextClick: () -> Unit,
    onRepeatClick: () -> Unit
) {
    val isRepeatActive = isRepeat || isRepeatOne

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Shuffle 48.dp
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .clickable(onClick = onShuffleClick),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = YtmIcons.Shuffle24,
                contentDescription = "Shuffle",
                tint = if (isShuffle) YtmWhite else YtmWhite67,
                modifier = Modifier.size(24.dp)
            )
            if (isShuffle) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 4.dp)
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(YtmWhite)
                )
            }
        }

        // Previous 48.dp
        IconButton(
            onClick = onPreviousClick,
            modifier = Modifier.size(48.dp)
        ) {
            Icon(
                imageVector = YtmIcons.SkipPrevious36,
                contentDescription = "Previous track",
                tint = YtmWhite,
                modifier = Modifier.size(36.dp)
            )
        }

        // Center 72.dp solid YtmWhite circular play/pause button
        Surface(
            onClick = onPlayPauseClick,
            shape = CircleShape,
            color = YtmWhite,
            tonalElevation = 0.dp,
            modifier = Modifier.size(72.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                if (isBuffering && !isPlaying) {
                    CircularProgressIndicator(
                        color = YtmPureBlack,
                        strokeWidth = 3.dp,
                        modifier = Modifier.size(28.dp)
                    )
                } else {
                    Icon(
                        imageVector = if (isPlaying) YtmIcons.Pause36 else YtmIcons.Play36,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = YtmPureBlack,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }
        }

        // Next 48.dp
        IconButton(
            onClick = onNextClick,
            modifier = Modifier.size(48.dp)
        ) {
            Icon(
                imageVector = YtmIcons.SkipNext36,
                contentDescription = "Next track",
                tint = YtmWhite,
                modifier = Modifier.size(36.dp)
            )
        }

        // Repeat 48.dp
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .clickable(onClick = onRepeatClick),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (isRepeatOne) YtmIcons.RepeatOne24 else YtmIcons.Repeat24,
                contentDescription = when {
                    isRepeatOne -> "Repeat one"
                    isRepeat -> "Repeat all"
                    else -> "Repeat off"
                },
                tint = if (isRepeatActive) YtmWhite else YtmWhite67,
                modifier = Modifier.size(24.dp)
            )
            if (isRepeatActive) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 4.dp)
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(YtmWhite)
                )
            }
        }
    }
}

@Composable
private fun DockedPlayerBottomSheetBar(
    selectedTab: WatchSheetTab,
    isSheetOpen: Boolean,
    onOpenTab: (WatchSheetTab) -> Unit,
    onSwipeUp: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .pointerInput(Unit) {
                var accumDrag = 0f
                detectVerticalDragGestures(
                    onDragStart = { accumDrag = 0f },
                    onVerticalDrag = { change, dragAmount ->
                        accumDrag += dragAmount
                        if (dragAmount < 0f) {
                            change.consume()
                        }
                        if (accumDrag < -36f) {
                            accumDrag = 0f
                            onSwipeUp()
                        }
                    }
                )
            },
        color = YtmGrey11,
        tonalElevation = 0.dp,
        shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.navigationBars),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Centered 40.dp x 4.dp drag handle
            Box(
                modifier = Modifier
                    .padding(top = 8.dp, bottom = 4.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(YtmWhite.copy(alpha = 0.3f))
                    .clickable(onClick = onSwipeUp)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                WatchSheetTab.entries.forEach { tab ->
                    val isActive = isSheetOpen && selectedTab == tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clickable { onOpenTab(tab) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = tab.label,
                            fontFamily = YouTubeSansFontFamily,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp,
                            color = if (isActive) YtmWhite else YtmWhite67,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UpNextTabContent(
    currentTrack: Track,
    queue: List<Track>,
    queueIndex: Int,
    contextLabel: String,
    onPlayQueueIndex: (Int, List<Track>) -> Unit,
    onSaveClick: () -> Unit
) {
    val displayQueue = if (queue.isNotEmpty()) queue else listOf(currentTrack)
    val safeActiveIndex = if (queue.isNotEmpty()) queueIndex.coerceIn(0, displayQueue.lastIndex) else 0

    Column(modifier = Modifier.fillMaxSize()) {
        // Queue Header (queue_page_header.xml)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Playing from",
                    fontSize = 12.sp,
                    color = YtmWhite67
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = contextLabel,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = YtmWhite,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Surface(
                onClick = onSaveClick,
                shape = RoundedCornerShape(16.dp),
                color = YtmWhite10,
                tonalElevation = 0.dp,
                modifier = Modifier.height(32.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = YtmIcons.PlaylistAdd24,
                        contentDescription = null,
                        tint = YtmWhite,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Save",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = YtmWhite
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(1.dp)
                .background(YtmWhite10)
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp)
        ) {
            itemsIndexed(
                items = displayQueue,
                key = { index, item -> "${index}_${item.id}" }
            ) { index, item ->
                val isCurrent = index == safeActiveIndex && item.id == currentTrack.id
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isCurrent) YtmWhite10 else Color.Transparent)
                        .clickable { onPlayQueueIndex(index, displayQueue) }
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(YtmGrey13),
                        contentAlignment = Alignment.Center
                    ) {
                        AsyncImage(
                            model = item.coverUrl,
                            contentDescription = item.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        if (isCurrent) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color(0x88000000)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = YtmIcons.WaveformMusic18,
                                    contentDescription = "Playing",
                                    tint = YtmWhite,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = item.title,
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp,
                            color = YtmWhite,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        val durLabel = if (item.duration > 0) {
                            " • ${formatPlaybackTime(item.duration.toLong() * 1000L)}"
                        } else {
                            ""
                        }
                        Text(
                            text = "${item.artist}$durLabel",
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Normal,
                            fontSize = 13.sp,
                            color = YtmWhite67,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Icon(
                        imageVector = YtmIcons.DragBars24,
                        contentDescription = "Drag to move",
                        tint = if (isCurrent) YtmWhite else YtmWhite67,
                        modifier = Modifier
                            .padding(start = 8.dp, end = 4.dp)
                            .size(22.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun LyricsTabContent(
    lyrics: List<LyricLine>,
    isLoading: Boolean,
    currentPositionMs: Long,
    onSeekToMs: (Long) -> Unit,
    onShareLyrics: () -> Unit
) {
    val listState = rememberLazyListState()
    val isSynced = remember(lyrics) { lyrics.any { it.time > 0.0 } }
    val currentSec = currentPositionMs / 1000.0
    val activeIndex = if (isSynced) {
        lyrics.indexOfLast { it.time <= currentSec }.coerceAtLeast(0)
    } else {
        -1
    }

    LaunchedEffect(activeIndex, isSynced) {
        if (isSynced && lyrics.isNotEmpty() && activeIndex in lyrics.indices) {
            listState.animateScrollToItem((activeIndex - 2).coerceAtLeast(0))
        }
    }

    when {
        isLoading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = YtmWhite)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Searching for lyrics...",
                        fontSize = 14.sp,
                        color = YtmWhite67
                    )
                }
            }
        }

        lyrics.isEmpty() -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = YtmIcons.LyricsBubble24,
                        contentDescription = null,
                        tint = YtmWhite67,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Lyrics aren't available for this track",
                        fontFamily = YouTubeSansFontFamily,
                        fontWeight = FontWeight.Medium,
                        fontSize = 16.sp,
                        color = YtmWhite,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Check back later or try another version of this song.",
                        fontSize = 13.sp,
                        color = YtmWhite67,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        else -> {
            Box(modifier = Modifier.fillMaxSize()) {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 72.dp)
                ) {
                    itemsIndexed(
                        items = lyrics,
                        key = { index, _ -> index }
                    ) { index, line ->
                        val isActive = isSynced && index == activeIndex
                        val targetColor = when {
                            !isSynced -> YtmWhite.copy(alpha = 0.88f)
                            isActive -> YtmWhite
                            else -> YtmWhite.copy(alpha = 0.4f)
                        }
                        val animatedColor by animateColorAsState(
                            targetValue = targetColor,
                            animationSpec = tween(durationMillis = 180),
                            label = "watchLyricColor"
                        )
                        Text(
                            text = line.text,
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                            fontSize = if (isActive) 24.sp else 18.sp,
                            lineHeight = if (isActive) 32.sp else 26.sp,
                            color = animatedColor,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable(enabled = isSynced && line.time >= 0.0) {
                                    onSeekToMs((line.time * 1000.0).toLong())
                                }
                                .padding(vertical = 10.dp)
                        )
                    }

                    item(key = "lyrics_attribution") {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Lyrics provided by LRCLIB • KV Music",
                            fontSize = 12.sp,
                            color = YtmWhite67
                        )
                    }
                }

                // Top and bottom gradient fade masks (timed_lyrics.eml-js)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .fillMaxWidth()
                        .height(16.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(YtmGrey11, Color.Transparent)
                            )
                        )
                )

                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(32.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, YtmGrey11)
                            )
                        )
                )

                // Floating Share Lyrics button (timed_lyrics.eml-js)
                Surface(
                    onClick = onShareLyrics,
                    shape = RoundedCornerShape(18.dp),
                    color = YtmGrey10,
                    tonalElevation = 0.dp,
                    border = BorderStroke(1.dp, YtmWhite10),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp)
                        .height(36.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = YtmIcons.Share24,
                            contentDescription = "Share lyrics",
                            tint = YtmWhite,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Share",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = YtmWhite
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RelatedTabContent(
    relatedTracks: List<Track>,
    relatedArtists: List<ArtistHit>,
    isLoading: Boolean,
    onTrackClick: (Track) -> Unit,
    onArtistClick: (ArtistHit) -> Unit
) {
    if (isLoading && relatedTracks.isEmpty() && relatedArtists.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = YtmWhite)
        }
        return
    }

    val uniqueTracks = remember(relatedTracks) {
        relatedTracks.distinctBy { it.id }.take(12)
    }
    val uniqueArtists = remember(relatedArtists) {
        relatedArtists.distinctBy { it.id.ifEmpty { it.name } }.take(10)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        item(key = "related_header") {
            Text(
                text = "You might also like",
                fontFamily = YouTubeSansFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = YtmWhite,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }

        if (uniqueTracks.isEmpty()) {
            item(key = "related_empty") {
                Text(
                    text = "No related tracks found for this song yet.",
                    fontSize = 14.sp,
                    color = YtmWhite67,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }
        } else {
            items(
                items = uniqueTracks,
                key = { it.id }
            ) { rec ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onTrackClick(rec) }
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = rec.coverUrl,
                        contentDescription = rec.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(YtmGrey13)
                    )
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = rec.title,
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp,
                            color = YtmWhite,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = rec.artist,
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Normal,
                            fontSize = 13.sp,
                            color = YtmWhite67,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Icon(
                        imageVector = YtmIcons.Play24,
                        contentDescription = "Play",
                        tint = YtmWhite67,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        if (uniqueArtists.isNotEmpty()) {
            item(key = "related_artists_section") {
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "Related artists",
                    fontFamily = YouTubeSansFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = YtmWhite,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )

                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(
                        items = uniqueArtists,
                        key = { it.id.ifEmpty { it.name } }
                    ) { artist ->
                        Column(
                            modifier = Modifier
                                .width(88.dp)
                                .clickable { onArtistClick(artist) },
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            AsyncImage(
                                model = artist.displayPhoto,
                                contentDescription = artist.name,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape)
                                    .background(YtmGrey13)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = artist.name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = YtmWhite,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                text = artist.displayFollowers,
                                fontSize = 11.sp,
                                color = YtmWhite67,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TrackOverflowMenuContent(
    track: Track,
    isDownloaded: Boolean,
    isSaved: Boolean,
    sleepTimerRemainingSec: Int?,
    isEndOfTrackSleep: Boolean,
    onStartRadio: () -> Unit,
    onSaveToPlaylist: () -> Unit,
    onToggleDownload: () -> Unit,
    onSleepTimer: () -> Unit,
    onViewLyrics: () -> Unit,
    onShare: () -> Unit,
    onDismiss: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 24.dp)
    ) {
        // Track header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = track.coverUrl,
                contentDescription = track.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(YtmGrey13)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = track.title,
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = YtmWhite,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = track.artist,
                    fontSize = 13.sp,
                    color = YtmWhite67,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(onClick = onShare) {
                Icon(
                    imageVector = YtmIcons.Share24,
                    contentDescription = "Share",
                    tint = YtmWhite,
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(YtmWhite10)
        )

        Spacer(modifier = Modifier.height(6.dp))

        OverflowMenuRow(
            icon = YtmIcons.RadioLive24,
            title = "Start radio",
            onClick = onStartRadio
        )
        OverflowMenuRow(
            icon = YtmIcons.PlaylistAdd24,
            title = if (isSaved) "Saved to playlist" else "Save to playlist",
            onClick = onSaveToPlaylist
        )
        OverflowMenuRow(
            icon = if (isDownloaded) YtmIcons.Downloaded24 else YtmIcons.Download24,
            title = if (isDownloaded) "Remove download" else "Download",
            onClick = onToggleDownload
        )
        OverflowMenuRow(
            icon = YtmIcons.LyricsBubble24,
            title = "Lyrics",
            onClick = onViewLyrics
        )
        val timerSubtitle = when {
            sleepTimerRemainingSec != null -> formatPlaybackTime(sleepTimerRemainingSec * 1000L)
            isEndOfTrackSleep -> "End of track"
            else -> null
        }
        OverflowMenuRow(
            icon = YtmIcons.SleepTimer24,
            title = "Sleep timer",
            trailingLabel = timerSubtitle,
            onClick = onSleepTimer
        )
        OverflowMenuRow(
            icon = YtmIcons.Share24,
            title = "Share",
            onClick = onShare
        )

        val qualityText = buildList {
            track.codec?.takeIf { it.isNotBlank() }?.let { add(it.uppercase()) }
            track.bitrate?.takeIf { it > 0 }?.let { add("${it} kbps") }
        }.joinToString(" • ").ifEmpty { "M4A • Hi-Res" }

        OverflowMenuRow(
            icon = YtmIcons.Album24,
            title = "Audio stream",
            trailingLabel = qualityText,
            onClick = onDismiss
        )
    }
}

@Composable
private fun OverflowMenuRow(
    icon: ImageVector,
    title: String,
    trailingLabel: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = YtmWhite,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(20.dp))
        Text(
            text = title,
            fontSize = 15.sp,
            fontWeight = FontWeight.Normal,
            color = YtmWhite,
            modifier = Modifier.weight(1f)
        )
        if (!trailingLabel.isNullOrBlank()) {
            Text(
                text = trailingLabel,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = YtmBlue02
            )
        }
    }
}

@Composable
private fun SleepTimerDialog(
    currentRemainingSec: Int?,
    isEndOfTrackActive: Boolean,
    onSelectMinutes: (Int) -> Unit,
    onSelectEndOfTrack: () -> Unit,
    onTurnOff: () -> Unit,
    onDismiss: () -> Unit
) {
    val options = listOf(5, 15, 30, 45, 60)
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = YtmGrey11,
        titleContentColor = YtmWhite,
        textContentColor = YtmWhite,
        title = {
            Column {
                Text(
                    text = "Sleep timer",
                    fontFamily = YouTubeSansFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                if (currentRemainingSec != null) {
                    Text(
                        text = "Time left: ${formatPlaybackTime(currentRemainingSec * 1000L)}",
                        fontSize = 13.sp,
                        color = YtmBlue02
                    )
                } else if (isEndOfTrackActive) {
                    Text(
                        text = "Stops at end of current track",
                        fontSize = 13.sp,
                        color = YtmBlue02
                    )
                }
            }
        },
        text = {
            Column {
                options.forEach { mins ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(42.dp)
                            .clickable { onSelectMinutes(mins) },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = false,
                            onClick = { onSelectMinutes(mins) },
                            colors = RadioButtonDefaults.colors(
                                selectedColor = YtmBlue02,
                                unselectedColor = YtmWhite67
                            )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "$mins minutes", fontSize = 15.sp, color = YtmWhite)
                    }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(42.dp)
                        .clickable(onClick = onSelectEndOfTrack),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = isEndOfTrackActive,
                        onClick = onSelectEndOfTrack,
                        colors = RadioButtonDefaults.colors(
                            selectedColor = YtmBlue02,
                            unselectedColor = YtmWhite67
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "End of track", fontSize = 15.sp, color = YtmWhite)
                }
            }
        },
        confirmButton = {
            if (currentRemainingSec != null || isEndOfTrackActive) {
                TextButton(onClick = onTurnOff) {
                    Text("Turn off timer", color = YtmRedAccent, fontWeight = FontWeight.Bold)
                }
            } else {
                TextButton(onClick = onDismiss) {
                    Text("Close", color = YtmWhite)
                }
            }
        },
        dismissButton = {
            if (currentRemainingSec != null || isEndOfTrackActive) {
                TextButton(onClick = onDismiss) {
                    Text("Close", color = YtmWhite67)
                }
            }
        }
    )
}

private suspend fun fetchLyricsWithFallback(
    musicRepo: MusicRepository,
    track: Track
): List<LyricLine> {
    // 1. Try app MusicRepository endpoint first
    val repoRes = musicRepo.getLyrics(track.id, track.title, track.artist)
    val repoLines = repoRes.getOrDefault(SyncedLyricsResponse()).lyrics
    if (repoLines.isNotEmpty()) return repoLines

    // 2. Query backend /api/lyrics with backend's track/artist/video_id parameters or LRCLIB directly
    return withContext(Dispatchers.IO) {
        val cleanTrack = track.title.split("|").firstOrNull()?.trim().orEmpty().ifEmpty { track.title }
        val cleanArtist = track.artist
            .removeSuffix(" Official")
            .removeSuffix(" VEVO")
            .removeSuffix(" Topic")
            .trim()
        val encodedTrack = URLEncoder.encode(cleanTrack, "UTF-8")
        val encodedArtist = URLEncoder.encode(cleanArtist, "UTF-8")
        val encodedId = URLEncoder.encode(track.id, "UTF-8")

        val candidateUrls = listOf(
            "${RetrofitClient.getBaseUrl()}/api/lyrics?track=$encodedTrack&artist=$encodedArtist&video_id=$encodedId",
            "https://lrclib.net/api/search?artist_name=$encodedArtist&track_name=$encodedTrack"
        )

        for (url in candidateUrls) {
            try {
                val request = Request.Builder()
                    .url(url)
                    .header("User-Agent", "KVMusic-Android/1.2")
                    .build()
                WatchPageStateHolder.httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use
                    val body = response.body?.string().orEmpty()
                    if (body.isBlank()) return@use
                    val parsed = parseLyricsJsonPayload(body)
                    if (parsed.isNotEmpty()) return@withContext parsed
                }
            } catch (_: Exception) {
                // Try next source
            }
        }
        emptyList()
    }
}

private fun parseLyricsJsonPayload(rawJson: String): List<LyricLine> {
    val trimmed = rawJson.trim()
    val obj = when {
        trimmed.startsWith("[") -> {
            val arr = JSONArray(trimmed)
            if (arr.length() == 0) return emptyList()
            arr.getJSONObject(0)
        }
        trimmed.startsWith("{") -> JSONObject(trimmed)
        else -> return emptyList()
    }

    val synced = obj.optString("syncedLyrics", "").takeIf { it.isNotBlank() && it != "null" }
    if (!synced.isNullOrBlank()) {
        val lrcLines = parseLrcLines(synced)
        if (lrcLines.isNotEmpty()) return lrcLines
    }

    val plain = obj.optString("plainLyrics", "").takeIf { it.isNotBlank() && it != "null" }
    if (!plain.isNullOrBlank()) {
        return plain.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .map { LyricLine(time = 0.0, text = it) }
    }
    return emptyList()
}

private val lrcLineRegex = Regex("""\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?](.*)""")

private fun parseLrcLines(lrc: String): List<LyricLine> {
    val result = mutableListOf<LyricLine>()
    lrc.lines().forEach { rawLine ->
        val match = lrcLineRegex.find(rawLine.trim()) ?: return@forEach
        val min = match.groupValues[1].toDoubleOrNull() ?: return@forEach
        val sec = match.groupValues[2].toDoubleOrNull() ?: return@forEach
        val fracRaw = match.groupValues[3]
        val fracSec = if (fracRaw.isNotEmpty()) {
            fracRaw.padEnd(3, '0').take(3).toDoubleOrNull()?.div(1000.0) ?: 0.0
        } else {
            0.0
        }
        val text = match.groupValues[4].trim()
        if (text.isNotEmpty()) {
            result.add(LyricLine(time = min * 60.0 + sec + fracSec, text = text))
        }
    }
    return result.sortedBy { it.time }
}

private suspend fun fetchRelatedWithFallback(
    musicRepo: MusicRepository,
    track: Track
): Pair<List<Track>, List<ArtistHit>> {
    return coroutineScope {
        val recTracks = musicRepo.getRecommendations(track.id)
            .getOrDefault(emptyList())
            .filter { it.id != track.id }

        val universal = musicRepo.universalSearch(track.artist).getOrNull()
        val artistSongs = universal?.songs.orEmpty().filter { it.id != track.id }
        val combinedTracks = (recTracks + artistSongs)
            .distinctBy { it.id }
            .filter { it.id != track.id }

        val finalTracks = if (combinedTracks.isNotEmpty()) {
            combinedTracks
        } else {
            musicRepo.search("${track.artist} ${track.title}")
                .getOrDefault(emptyList())
                .filter { it.id != track.id }
        }

        val artistsFromSearch = universal?.artists.orEmpty()
        val finalArtists = if (artistsFromSearch.isNotEmpty()) {
            artistsFromSearch
        } else {
            musicRepo.getArtists("vn").getOrDefault(emptyList())
        }

        finalTracks to finalArtists
    }
}

private fun formatPlaybackTime(ms: Long): String {
    val totalSeconds = (ms.coerceAtLeast(0L) / 1000L).toInt()
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format(Locale.getDefault(), "%d:%02d", minutes, seconds)
    }
}

private fun formatCompactCount(count: Long): String {
    return when {
        count >= 1_000_000L -> String.format(Locale.US, "%.1fM", count / 1_000_000.0).replace(".0M", "M")
        count >= 1_000L -> String.format(Locale.US, "%.1fK", count / 1_000.0).replace(".0K", "K")
        else -> count.toString()
    }
}
