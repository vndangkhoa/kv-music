package com.kvmusic.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.theme.YtmGrey11
import com.kvmusic.app.ui.theme.YtmGrey12
import com.kvmusic.app.ui.theme.YtmSubtitle01
import com.kvmusic.app.ui.theme.YtmTitle02
import com.kvmusic.app.ui.theme.YtmWhite
import com.kvmusic.app.ui.theme.YtmWhite15
import com.kvmusic.app.ui.theme.YtmWhite67
import kotlin.math.roundToInt

@Composable
fun MiniPlayer(
    track: Track?,
    isPlaying: Boolean,
    progressFraction: Float,
    onTogglePlay: () -> Unit,
    onSkipNext: () -> Unit,
    onClickExpand: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = track != null,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = modifier
    ) {
        if (track == null) return@AnimatedVisibility

        var isDragging by remember(track.id) { mutableStateOf(false) }
        var dragOffsetPx by remember(track.id) { mutableFloatStateOf(0f) }
        val animatedOffsetPx by animateFloatAsState(
            targetValue = dragOffsetPx,
            animationSpec = if (isDragging) snap() else tween(durationMillis = 180),
            label = "miniPlayerSwipeOffset"
        )
        val swipeThresholdPx = with(LocalDensity.current) { 72.dp.toPx() }

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clickable { onClickExpand() },
            color = YtmGrey11,
            tonalElevation = 0.dp,
            shadowElevation = 0.dp
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 16.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clipToBounds()
                            .pointerInput(track.id) {
                                var totalDrag = 0f
                                detectHorizontalDragGestures(
                                    onDragStart = {
                                        isDragging = true
                                        totalDrag = 0f
                                    },
                                    onHorizontalDrag = { change, dragAmount ->
                                        change.consume()
                                        totalDrag += dragAmount
                                        dragOffsetPx = (dragOffsetPx + dragAmount)
                                            .coerceIn(-swipeThresholdPx * 1.4f, swipeThresholdPx * 1.4f)
                                    },
                                    onDragEnd = {
                                        when {
                                            totalDrag <= -swipeThresholdPx -> onSkipNext()
                                            totalDrag >= swipeThresholdPx -> PlayerManager.playPrevious()
                                        }
                                        isDragging = false
                                        dragOffsetPx = 0f
                                    },
                                    onDragCancel = {
                                        isDragging = false
                                        dragOffsetPx = 0f
                                    }
                                )
                            },
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .offset { IntOffset(animatedOffsetPx.roundToInt(), 0) },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AsyncImage(
                                model = track.coverUrl,
                                contentDescription = track.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(YtmGrey12)
                            )

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 8.dp)
                            ) {
                                Text(
                                    text = track.title,
                                    style = YtmTitle02,
                                    color = YtmWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = track.artist,
                                    style = YtmSubtitle01,
                                    color = YtmWhite67,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    IconButton(
                        onClick = onSkipNext,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = YtmIcons.SkipNext24,
                            contentDescription = "Next track",
                            tint = YtmWhite,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    IconButton(
                        onClick = onTogglePlay,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = if (isPlaying) YtmIcons.Pause24 else YtmIcons.Play24,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = YtmWhite,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(1.5.dp)
                        .background(YtmWhite15)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(fraction = progressFraction.coerceIn(0f, 1f))
                            .background(YtmWhite)
                    )
                }
            }
        }
    }
}
