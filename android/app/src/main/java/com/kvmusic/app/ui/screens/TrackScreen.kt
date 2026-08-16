package com.kvmusic.app.ui.screens

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Lyrics
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.PlaylistAdd
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.VideoStats
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.KvPlayButton
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackCard
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.AccentSoft
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.HeroTitle
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.PlayButtonColors
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.util.Formatters
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TrackScreen(trackId: String) {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()

    var track by remember { mutableStateOf<Track?>(null) }
    var stats by remember { mutableStateOf<VideoStats?>(null) }
    var loading by remember { mutableStateOf(true) }
    var recommendations by remember { mutableStateOf<Recommendations?>(null) }
    var showDownload by remember { mutableStateOf(false) }
    val likedTracks by container.libraryRepository.likedTracks.collectAsState(initial = emptyList())
    val playerState by container.playerController.state.collectAsState()

    LaunchedEffect(trackId) {
        loading = true
        track = null
        stats = null
        recommendations = null
        val loaded = container.musicRepository.trackInfo(trackId)
        track = loaded
        loading = false
        if (loaded != null) {
            stats = container.musicRepository.videoStats(trackId)
            recommendations = container.musicRepository.recommendations("${loaded.title} ${loaded.artist}", "track", 10)
        }
    }

    val current = track
    when {
        loading -> TrackSkeleton()
        current == null -> ErrorState("Không tìm thấy bài hát")
        else -> {
            val isCurrent = playerState.currentTrack?.id == current.id
            val isLiked = likedTracks.any { it.id == current.id }
            val recTracks = recommendations?.tracks.orEmpty()

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 160.dp),
            ) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            GlassBack(onClick = { nav.popBackStack() })
                            Spacer(Modifier.width(12.dp))
                            Text("Bài hát", style = NavTitle, color = Fg)
                        }
                        Spacer(Modifier.height(18.dp))
                        Row {
                            CoverImage(url = current.cover_url, title = current.title, size = 128.dp, cornerRadius = 20.dp)
                            Spacer(Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    current.title,
                                    style = HeroTitle,
                                    color = Fg,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    current.artist,
                                    fontSize = 15.sp,
                                    color = Fg2,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.clickable { nav.navigate(Routes.artist(current.artist, current.artist)) },
                                )
                            }
                        }
                    }
                }

                val s = stats
                if (s != null && (s.view_count != null || s.like_count != null || s.comment_count != null)) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
                        ) {
                            if (s.view_count != null) {
                                Text(
                                    "${Formatters.count(s.view_count)} lượt xem",
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Faint,
                                )
                            }
                            if (s.like_count != null) {
                                Text(
                                    "${Formatters.count(s.like_count)} lượt thích",
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Faint,
                                )
                            }
                            if (s.comment_count != null) {
                                Text(
                                    "${Formatters.count(s.comment_count)} bình luận",
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Faint,
                                )
                            }
                        }
                    }
                }

                item {
                    FlowRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (playerState.isBuffering) {
                            KvPlayButton(
                                modifier = Modifier.align(Alignment.CenterVertically),
                                icon = if (isCurrent && playerState.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                                contentDescription = "Phát / Tạm dừng",
                                onClick = {
                                    if (isCurrent) {
                                        container.playerController.togglePlayPause()
                                    } else {
                                        container.playerController.playTrack(current, listOf(current), 0)
                                    }
                                },
                                content = {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        color = PlayButtonColors.fg,
                                        strokeWidth = 2.5.dp,
                                    )
                                },
                            )
                        } else {
                            KvPlayButton(
                                modifier = Modifier.align(Alignment.CenterVertically),
                                icon = if (isCurrent && playerState.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                                contentDescription = "Phát / Tạm dừng",
                                onClick = {
                                    if (isCurrent) {
                                        container.playerController.togglePlayPause()
                                    } else {
                                        container.playerController.playTrack(current, listOf(current), 0)
                                    }
                                },
                            )
                        }
                        ActionPill(
                            modifier = Modifier.align(Alignment.CenterVertically),
                            icon = if (isLiked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                            contentDescription = "Yêu thích",
                            label = "Thích",
                            active = isLiked,
                            onClick = {
                                scope.launch {
                                    container.libraryRepository.toggleLiked(current)
                                    Toaster.show(if (isLiked) "Đã xóa khỏi Yêu thích" else "Đã thêm vào Yêu thích")
                                }
                            },
                        )
                        ActionPill(
                            modifier = Modifier.align(Alignment.CenterVertically),
                            icon = Icons.Rounded.PlaylistAdd,
                            label = "Thêm vào playlist",
                            onClick = { AppUi.addToPlaylistTrack = current },
                        )
                        ActionPill(
                            modifier = Modifier.align(Alignment.CenterVertically),
                            icon = Icons.Rounded.Share,
                            label = "Chia sẻ",
                            onClick = {
                                val streamUrl = container.musicRepository.streamUrl(current.id)
                                val text = "${current.title} — ${current.artist}" +
                                    if (streamUrl.isNotBlank()) "\n$streamUrl" else ""
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, text)
                                    putExtra(Intent.EXTRA_TITLE, "${current.title} — ${current.artist}")
                                }
                                try {
                                    context.startActivity(Intent.createChooser(intent, "Chia sẻ"))
                                } catch (_: Exception) {
                                    Toaster.show("Không thể chia sẻ")
                                }
                            },
                        )
                        ActionPill(
                            modifier = Modifier.align(Alignment.CenterVertically),
                            icon = Icons.Rounded.Download,
                            label = "Tải xuống",
                            onClick = { showDownload = true },
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ActionPill(icon = Icons.Rounded.Videocam, label = "Video", onClick = {
                            AppUi.videoTrack = current
                        })
                        Spacer(Modifier.width(12.dp))
                        ActionPill(icon = Icons.Rounded.Lyrics, label = "Lời bài hát", onClick = {
                            if (playerState.currentTrack?.id != current.id) {
                                container.playerController.playTrack(current, listOf(current), 0)
                            }
                            AppUi.lyricsOpen = true
                        })
                    }
                }

                if (recTracks.isNotEmpty()) {
                    item {
                        Spacer(Modifier.height(12.dp))
                        SectionHeader(title = "Có thể bạn thích", modifier = Modifier.padding(horizontal = 16.dp))
                    }
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(recTracks) { recTrack ->
                                TrackCard(
                                    track = recTrack,
                                    onPlay = { container.playerController.playQueue(recTracks, recTracks.indexOf(recTrack)) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDownload && current != null) {
        KvBottomSheet(onDismissRequest = { showDownload = false }) {
            Text(
                "Tải xuống",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Fg,
                modifier = Modifier.padding(16.dp),
            )
            SheetOption(label = "Tải nhạc (WebM)") {
                showDownload = false
                enqueueDownload(context, container, current, fmt = "", ext = "webm")
            }
            SheetOption(label = "Tải nhạc (M4A)") {
                showDownload = false
                enqueueDownload(context, container, current, fmt = "m4a", ext = "m4a")
            }
            SheetOption(label = "Tải video (MP4)") {
                showDownload = false
                enqueueDownload(context, container, current, fmt = "video", ext = "mp4")
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

private fun enqueueDownload(context: Context, container: com.kvmusic.app.AppContainer, track: Track, fmt: String, ext: String) {
    val url = container.musicRepository.downloadUrl(track.id, fmt)
    if (url.isBlank()) {
        Toaster.show("Không thể tải")
        return
    }
    val filename = "${sanitizeFileName(track.title)} - ${sanitizeFileName(track.artist)}.$ext"
    try {
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle(filename)
            .setDescription("KV Music")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        manager.enqueue(request)
        Toaster.show("Đang tải...")
    } catch (_: Exception) {
        Toaster.show("Không thể tải")
    }
}

private fun sanitizeFileName(name: String): String =
    name.replace(Regex("[^\\p{L}\\p{N}\\s._-]+"), "_").trim().ifEmpty { "track" }

@Composable
private fun GlassBack(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(36.dp)
            .glass(CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
            contentDescription = "Quay lại",
            tint = Fg2,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun ActionPill(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    active: Boolean = false,
    contentDescription: String? = null,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .height(40.dp)
            .then(
                if (active) Modifier.background(AccentSoft, KvShapePill)
                else Modifier.glass(KvShapePill)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (active) KvOrange else Fg2,
            modifier = Modifier.size(16.dp),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = if (active) KvOrange else Fg2,
        )
    }
}

@Composable
private fun SheetOption(label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Download, contentDescription = null, tint = Muted, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(label, fontSize = 14.sp, color = Fg)
    }
}

@Composable
private fun TrackSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SkeletonBox(width = 128.dp, height = 128.dp, shape = RoundedCornerShape(20.dp))
        Spacer(Modifier.height(20.dp))
        SkeletonBox(width = 220.dp, height = 18.dp, shape = RoundedCornerShape(9.dp))
        Spacer(Modifier.height(8.dp))
        SkeletonBox(width = 140.dp, height = 14.dp, shape = RoundedCornerShape(7.dp))
        Spacer(Modifier.height(24.dp))
        TrackRowSkeleton()
        TrackRowSkeleton()
        TrackRowSkeleton()
    }
}

@Composable
private fun ErrorState(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(message, fontSize = 14.sp, color = KvMuted)
    }
}
