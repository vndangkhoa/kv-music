package com.kvmusic.app.ui.player

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
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
import com.kvmusic.app.ui.components.KvPlayButton
import com.kvmusic.app.ui.components.Peaks
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeMini
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.glass
import kotlin.math.roundToInt

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
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(start = 16.dp, end = 16.dp, bottom = 90.dp)
                .fillMaxWidth()
                .height(60.dp)
                .glass(KvShapeMini)
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
                },
        ) {
            MiniWaveformStrip(
                trackId = track.id,
                progress = (progress.toFloat() / state.durationMs.toFloat()).coerceIn(0f, 1f),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .padding(start = 12.dp, end = 12.dp)
                    .height(9.dp),
            )
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(start = 10.dp, end = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CoverImage(
                    url = track.cover_url,
                    title = track.title,
                    size = 42.dp,
                    cornerRadius = 12.dp,
                )
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = track.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = track.artist,
                        fontSize = 12.sp,
                        color = Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                KvPlayButton(
                    onClick = { player.togglePlayPause() },
                    size = 44.dp,
                    shadowRadius = 8.dp,
                    iconSize = 24.dp,
                    icon = if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                    contentDescription = if (state.isPlaying) "Tạm dừng" else "Phát",
                )
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .clickable { AppUi.fullPlayerOpen = true },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.KeyboardArrowUp,
                        contentDescription = "Mở rộng",
                        tint = Color.White,
                        modifier = Modifier.size(26.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun MiniWaveformStrip(
    trackId: String,
    progress: Float,
    modifier: Modifier = Modifier,
) {
    val peaks = remember(trackId) { Peaks.pseudo(trackId) }
    Canvas(modifier = modifier) {
        val count = 40
        val playedIdx = (progress.coerceIn(0f, 1f) * count).roundToInt()
        val gap = 2.dp.toPx()
        val barWidth = (size.width - gap * (count - 1)) / count
        val minBar = size.height * 0.4f
        val maxBar = size.height * 0.85f
        repeat(count) { i ->
            val peak = peaks.getOrElse(i % peaks.size) { 0.5f }
            val barHeight = (minBar + peak * (maxBar - minBar)).coerceAtLeast(1.dp.toPx())
            drawRoundRect(
                color = if (i <= playedIdx) KvOrange else Faint.copy(alpha = 0.5f),
                topLeft = Offset(i * (barWidth + gap), (size.height - barHeight) / 2f),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(barWidth / 2f),
            )
        }
    }
}
