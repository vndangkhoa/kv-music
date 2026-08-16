package com.kvmusic.app.ui.player

import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PauseCircleFilled
import androidx.compose.material.icons.rounded.PlayCircleFilled
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.Peaks
import com.kvmusic.app.ui.components.Waveform
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.glassCard

@Composable
fun MobileMiniBar() {
    val context = LocalContext.current
    val player = (context.applicationContext as KvMusicApp).container.playerController
    val state by player.state.collectAsStateWithLifecycle()
    val progress by player.progress.collectAsStateWithLifecycle()
    val track = state.currentTrack

    if (track == null || AppUi.fullPlayerOpen) return

    val density = LocalDensity.current
    val swipeThresholdPx = with(density) { 50.dp.toPx() }

    Box(modifier = Modifier.fillMaxSize().zIndex(10f)) {
        var accumulated = 0f
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 12.dp, end = 12.dp, bottom = 74.dp)
                .glassCard(rounded = 16.dp)
                .clickable { AppUi.fullPlayerOpen = true }
                .pointerInput(track.id) {
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
                }
                .padding(start = 10.dp, end = 6.dp, top = 8.dp, bottom = 8.dp),
        ) {
            CoverImage(url = track.cover_url, title = track.title, size = 44.dp, cornerRadius = 8.dp)
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = track.title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = track.artist,
                    fontSize = 11.sp,
                    color = KvMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (state.durationMs > 0) {
                    Spacer(Modifier.height(2.dp))
                    Waveform(
                        peaks = remember(track.id) { Peaks.pseudo(track.id) },
                        progress = (progress.toFloat() / state.durationMs.toFloat()).coerceIn(0f, 1f),
                        onSeek = {},
                        active = false,
                        modifier = Modifier.width(60.dp).height(20.dp),
                        barCount = 30,
                    )
                }
            }
            Box(modifier = Modifier.size(36.dp).clickable { player.togglePlayPause() }, contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = if (state.isPlaying) Icons.Rounded.PauseCircleFilled else Icons.Rounded.PlayCircleFilled,
                    contentDescription = if (state.isPlaying) "Tạm dừng" else "Phát",
                    tint = KvOrange,
                    modifier = Modifier.size(36.dp),
                )
            }
            Box(modifier = Modifier.size(36.dp).clickable { player.next() }, contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Rounded.SkipNext,
                    contentDescription = "Bài tiếp",
                    tint = Color.White,
                    modifier = Modifier.size(26.dp),
                )
            }
        }
    }
}
