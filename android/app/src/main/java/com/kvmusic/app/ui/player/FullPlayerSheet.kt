package com.kvmusic.app.ui.player

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.Lyrics
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.PlaylistAdd
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.RepeatOne
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ExperimentalGraphicsApi
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.player.PlayerController
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.EqIndicator
import com.kvmusic.app.ui.components.KvPlayButton
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.components.Peaks
import com.kvmusic.app.ui.components.Waveform
import com.kvmusic.app.ui.theme.ArtBorder
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvBase
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeHero
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.OnAccent
import com.kvmusic.app.ui.theme.PlayButtonColors
import com.kvmusic.app.ui.theme.PlayerTitle
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.util.Downloader
import com.kvmusic.app.util.Formatters
import com.kvmusic.app.util.Share
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

@OptIn(ExperimentalGraphicsApi::class)
@Composable
fun FullPlayerSheet() {
    val context = LocalContext.current
    val player = (context.applicationContext as KvMusicApp).container.playerController
    val state by player.state.collectAsStateWithLifecycle()
    val track = state.currentTrack

    BackHandler(enabled = AppUi.fullPlayerOpen) { AppUi.fullPlayerOpen = false }

    AnimatedVisibility(
        visible = AppUi.fullPlayerOpen && track != null,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
    ) {
        FullPlayerSheetContent(player = player, track = track ?: return@AnimatedVisibility)
    }
}

@OptIn(ExperimentalGraphicsApi::class)
@Composable
private fun FullPlayerSheetContent(player: PlayerController, track: Track) {
    val context = LocalContext.current
    val container = (context.applicationContext as KvMusicApp).container
    val library = container.libraryRepository
    val musicRepository = container.musicRepository
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current

    val state by player.state.collectAsStateWithLifecycle()
    val progress by player.progress.collectAsStateWithLifecycle()

    var liked by remember(track.id) { mutableStateOf(false) }
    var downloadMenuOpen by remember { mutableStateOf(false) }

    val dragOffset = remember { Animatable(0f) }
    val dismissThresholdPx = with(density) { 120.dp.toPx() }

    LaunchedEffect(track.id) {
        liked = runCatching { library.isLiked(track.id) }.getOrDefault(false)
    }

    fun startDownload(fmt: String, ext: String) {
        val url = musicRepository.downloadUrl(track.id, fmt)
        if (url.isBlank()) {
            Toaster.show("Chưa kết nối máy chủ")
            return
        }
        downloadMenuOpen = false
        Toaster.show("Đang tải...")
        try {
            Downloader.download(context, url, "${track.title}.$ext")
        } catch (_: Exception) {
            Toaster.show("Tải xuống thất bại")
        }
    }

    val positionMs = progress
    val durationMs = state.durationMs
    val fraction = if (durationMs > 0) (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f

    Box(
        modifier = Modifier
            .fillMaxSize()
            .offset { IntOffset(0, dragOffset.value.roundToInt()) }
            .background(Brush.verticalGradient(listOf(KvBase, Color(0xFF050505)))),
    ) {
        CoverImage(
            url = track.cover_url,
            title = track.title,
            size = 480.dp,
            cornerRadius = 0.dp,
            modifier = Modifier.align(Alignment.TopCenter).blur(40.dp).alpha(0.6f),
        )
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.45f)))

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(vertical = 10.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .background(Color.White.copy(alpha = 0.25f), RoundedCornerShape(2.dp))
                    .pointerInput(Unit) {
                        detectVerticalDragGestures(
                            onDragStart = { scope.launch { dragOffset.stop() } },
                            onVerticalDrag = { change, dragAmount ->
                                change.consume()
                                scope.launch { dragOffset.snapTo((dragOffset.value + dragAmount).coerceAtLeast(0f)) }
                            },
                            onDragEnd = {
                                if (dragOffset.value > dismissThresholdPx) {
                                    AppUi.fullPlayerOpen = false
                                } else {
                                    scope.launch { dragOffset.animateTo(0f) }
                                }
                            },
                        )
                    },
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                GlassCircleButton(
                    icon = Icons.Rounded.KeyboardArrowDown,
                    contentDescription = "Thu gọn",
                    onClick = { AppUi.fullPlayerOpen = false },
                )
                Text(
                    text = "ĐANG PHÁT",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Muted,
                    letterSpacing = 0.14.em,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
                GlassCircleButton(
                    icon = Icons.Rounded.MoreVert,
                    contentDescription = "Hàng đợi",
                    iconSize = 20.dp,
                    onClick = { AppUi.queueOpen = true },
                )
            }

            Spacer(Modifier.height(20.dp))

            Box(
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .size(256.dp)
                    .pointerInput(track.id) {
                        var accumulated = 0f
                        val swipeThresholdPx = with(density) { 80.dp.toPx() }
                        detectHorizontalDragGestures(
                            onDragStart = { accumulated = 0f },
                            onHorizontalDrag = { _, dragAmount -> accumulated += dragAmount },
                            onDragEnd = {
                                if (accumulated < -swipeThresholdPx) {
                                    player.next()
                                } else if (accumulated > swipeThresholdPx) {
                                    player.previous()
                                }
                            },
                        )
                    },
                contentAlignment = Alignment.Center,
            ) {
                Box(modifier = Modifier.size(256.dp).border(1.dp, ArtBorder, KvShapeHero)) {
                    AnimatedContent(
                        targetState = track,
                        transitionSpec = {
                            (slideInHorizontally { it } + fadeIn()) togetherWith (slideOutHorizontally { -it } + fadeOut())
                        },
                        label = "artwork",
                    ) { t ->
                        CoverImage(url = t.cover_url, title = t.title, size = 256.dp, cornerRadius = 24.dp)
                    }
                }
            }

            Spacer(Modifier.height(18.dp))

            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = track.title,
                    style = PlayerTitle,
                    color = Fg,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    text = if (track.album.isNotBlank()) "${track.artist} — ${track.album}" else track.artist,
                    fontSize = 15.sp,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Spacer(Modifier.height(16.dp))

            BoxWithConstraints(
                modifier = Modifier.fillMaxWidth().height(56.dp),
                contentAlignment = Alignment.Center,
            ) {
                Waveform(
                    peaks = remember(track.id) { Peaks.pseudo(track.id) },
                    progress = fraction,
                    onSeek = { ratio -> player.seekTo((ratio * durationMs).toLong()) },
                    active = true,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    barCount = 60,
                )
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .width(2.dp)
                        .offset(x = ((maxWidth - 2.dp) * fraction).coerceAtLeast(0.dp))
                        .background(OnAccent.copy(alpha = 0.9f), RoundedCornerShape(1.dp)),
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(formatTime(positionMs), fontSize = 11.sp, color = Muted, fontFamily = FontFamily.Monospace)
                Text(formatTime(durationMs), fontSize = 11.sp, color = Muted, fontFamily = FontFamily.Monospace)
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconBtn(
                    icon = Icons.Rounded.Shuffle,
                    tint = if (state.shuffle) KvOrange else Muted,
                    contentDescription = "Xáo trộn",
                    iconSize = 22.dp,
                    onClick = { player.setShuffle(!state.shuffle) },
                )
                IconBtn(
                    icon = Icons.Rounded.SkipPrevious,
                    tint = Fg,
                    contentDescription = "Bài trước",
                    iconSize = 26.dp,
                    onClick = { player.previous() },
                )
                if (state.isBuffering) {
                    KvPlayButton(
                        size = 64.dp,
                        shadowRadius = 12.dp,
                        iconSize = 28.dp,
                        icon = if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = if (state.isPlaying) "Tạm dừng" else "Phát",
                        onClick = { player.togglePlayPause() },
                        content = {
                            CircularProgressIndicator(
                                modifier = Modifier.size(26.dp),
                                color = PlayButtonColors.fg,
                                strokeWidth = 2.5.dp,
                            )
                        },
                    )
                } else {
                    KvPlayButton(
                        size = 64.dp,
                        shadowRadius = 12.dp,
                        iconSize = 28.dp,
                        icon = if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = if (state.isPlaying) "Tạm dừng" else "Phát",
                        onClick = { player.togglePlayPause() },
                    )
                }
                IconBtn(
                    icon = Icons.Rounded.SkipNext,
                    tint = Fg,
                    contentDescription = "Bài tiếp",
                    iconSize = 26.dp,
                    onClick = { player.next() },
                )
                IconBtn(
                    icon = if (state.repeatMode == 2) Icons.Rounded.RepeatOne else Icons.Rounded.Repeat,
                    tint = if (state.repeatMode == 0) Muted else KvOrange,
                    contentDescription = "Lặp lại",
                    iconSize = 22.dp,
                    onClick = { player.cycleRepeat() },
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconBtn(
                    icon = if (liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                    tint = if (liked) KvOrange else Fg,
                    contentDescription = "Yêu thích",
                    onClick = {
                        scope.launch {
                            library.toggleLiked(track)
                            liked = !liked
                            Toaster.show(if (liked) "Đã thêm vào Yêu thích" else "Đã xóa khỏi Yêu thích")
                        }
                    },
                )
                IconBtn(
                    icon = Icons.Rounded.PlaylistAdd,
                    tint = Fg,
                    contentDescription = "Thêm vào playlist",
                    onClick = { AppUi.addToPlaylistTrack = track },
                )
                IconBtn(
                    icon = Icons.Rounded.Share,
                    tint = Fg,
                    contentDescription = "Chia sẻ",
                    onClick = { Share.track(context, track, musicRepository.streamUrl(track.id)) },
                )
                IconBtn(
                    icon = Icons.Rounded.Download,
                    tint = Fg,
                    contentDescription = "Tải xuống",
                    onClick = { downloadMenuOpen = true },
                )
                IconBtn(
                    icon = Icons.Rounded.Lyrics,
                    tint = Fg,
                    contentDescription = "Lời bài hát",
                    onClick = { AppUi.lyricsOpen = true },
                )
                IconBtn(
                    icon = Icons.Rounded.Videocam,
                    tint = Fg,
                    contentDescription = "Xem video",
                    onClick = {
                        if (container.apiClient.baseUrl().isNotBlank()) {
                            AppUi.videoTrack = track
                        } else {
                            Toaster.show("Chưa kết nối máy chủ")
                        }
                    },
                )
            }

            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Tiếp theo", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Fg)
                Spacer(Modifier.width(8.dp))
                Text("${state.queue.size}", fontSize = 11.sp, color = Muted, fontFamily = FontFamily.Monospace)
                Spacer(Modifier.weight(1f))
            }
            Spacer(Modifier.height(4.dp))
            if (state.queue.isEmpty()) {
                Box(Modifier.fillMaxWidth().height(44.dp), contentAlignment = Alignment.Center) {
                    Text("Hàng đợi trống", fontSize = 12.sp, color = Faint)
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 180.dp)
                        .verticalScroll(rememberScrollState()),
                ) {
                    state.queue.forEachIndexed { index, queueTrack ->
                        val isCurrent = queueTrack.id == track.id
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(42.dp)
                                .clickable { player.playQueue(state.queue, index) }
                                .padding(horizontal = 4.dp),
                        ) {
                            CoverImage(url = queueTrack.cover_url, title = queueTrack.title, size = 32.dp, cornerRadius = 8.dp)
                            Spacer(Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (isCurrent) {
                                        EqIndicator(playing = state.isPlaying)
                                        Spacer(Modifier.width(4.dp))
                                    }
                                    Text(
                                        text = queueTrack.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isCurrent) KvOrange else Fg2,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                Text(
                                    text = queueTrack.artist,
                                    fontSize = 11.sp,
                                    color = Muted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(
                                Formatters.duration(queueTrack.duration),
                                fontSize = 12.sp,
                                color = Muted,
                                fontFamily = FontFamily.Monospace,
                            )
                            Spacer(Modifier.width(4.dp))
                            Box(
                                modifier = Modifier.size(28.dp).clickable { player.removeFromQueue(index) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.Close,
                                    contentDescription = "Xóa khỏi hàng đợi",
                                    tint = Faint,
                                    modifier = Modifier.size(14.dp),
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }

    if (downloadMenuOpen) {
        KvBottomSheet(onDismissRequest = { downloadMenuOpen = false }) {
            Text(
                "Tải xuống",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Fg,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            )
            DownloadOption(icon = Icons.Rounded.MusicNote, label = "Tải nhạc (WebM)", subtitle = "Opus • tệp nhỏ", tint = KvOrange) {
                startDownload(fmt = "", ext = "webm")
            }
            Spacer(Modifier.fillMaxWidth().height(1.dp).background(Hair))
            DownloadOption(icon = Icons.Rounded.Download, label = "Tải nhạc (M4A)", subtitle = "AAC • chất lượng tốt", tint = Muted) {
                startDownload(fmt = "m4a", ext = "m4a")
            }
            Spacer(Modifier.fillMaxWidth().height(1.dp).background(Hair))
            DownloadOption(icon = Icons.Rounded.Videocam, label = "Tải video (MP4)", subtitle = "Video kèm âm thanh", tint = Color(0xFFE05050)) {
                startDownload(fmt = "video", ext = "mp4")
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun DownloadOption(icon: ImageVector, label: String, subtitle: String, tint: Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Fg)
            Text(subtitle, fontSize = 11.sp, color = Muted)
        }
    }
}

@Composable
private fun GlassCircleButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    iconSize: Dp = 18.dp,
) {
    Box(
        modifier = modifier.size(36.dp).glass(CircleShape).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = contentDescription, tint = Fg2, modifier = Modifier.size(iconSize))
    }
}

@Composable
private fun IconBtn(
    icon: ImageVector,
    tint: Color,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    iconSize: Dp = 22.dp,
) {
    Box(modifier = modifier.size(44.dp).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(icon, contentDescription = contentDescription, tint = tint, modifier = Modifier.size(iconSize))
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}
