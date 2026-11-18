package com.kvmusic.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.model.LyricLine
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.theme.YtmCaption02
import com.kvmusic.app.ui.theme.YtmGrey12
import com.kvmusic.app.ui.theme.YtmSubtitle01
import com.kvmusic.app.ui.theme.YtmTitle03
import com.kvmusic.app.ui.theme.YtmWhite
import com.kvmusic.app.ui.theme.YtmWhite08
import com.kvmusic.app.ui.theme.YtmWhite67

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LyricsSheet(
    lyrics: List<LyricLine>,
    currentPositionMs: Long,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val currentPositionSeconds = currentPositionMs / 1000.0

    val activeIndex = lyrics.indexOfLast { it.time <= currentPositionSeconds }.coerceAtLeast(0)

    LaunchedEffect(activeIndex) {
        if (lyrics.isNotEmpty() && activeIndex in lyrics.indices) {
            listState.animateScrollToItem((activeIndex - 2).coerceAtLeast(0))
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = YtmGrey12,
        contentColor = YtmWhite,
        shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 6.dp)
                    .size(width = 40.dp, height = 4.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(YtmWhite.copy(alpha = 0.3f))
            )
        }
    ) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.Start
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 24.dp, end = 12.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Lyrics",
                    style = YtmTitle03,
                    color = YtmWhite
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = YtmIcons.CloseX24,
                        contentDescription = "Close",
                        tint = YtmWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(YtmWhite08)
            )

            if (lyrics.isEmpty()) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = "Searching for synced lyrics...",
                        style = YtmSubtitle01,
                        color = YtmWhite67
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 20.dp),
                        horizontalAlignment = Alignment.Start
                    ) {
                        itemsIndexed(lyrics) { index, line ->
                            val isActive = index == activeIndex
                            val lineColor by animateColorAsState(
                                targetValue = if (isActive) YtmWhite else YtmWhite.copy(alpha = 0.4f),
                                animationSpec = tween(durationMillis = 180),
                                label = "lyricLineColor"
                            )

                            Text(
                                text = line.text,
                                style = if (isActive) {
                                    TextStyle(
                                        fontFamily = FontFamily.SansSerif,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 24.sp,
                                        lineHeight = 32.sp
                                    )
                                } else {
                                    TextStyle(
                                        fontFamily = FontFamily.SansSerif,
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 18.sp,
                                        lineHeight = 26.sp
                                    )
                                },
                                color = lineColor,
                                textAlign = TextAlign.Start,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        PlayerManager.seekTo((line.time * 1000).toLong().coerceAtLeast(0L))
                                    }
                                    .padding(vertical = 8.dp)
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .fillMaxWidth()
                            .height(16.dp)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(YtmGrey12, Color.Transparent)
                                )
                            )
                    )

                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .height(24.dp)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, YtmGrey12)
                                )
                            )
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "Source: LRCLIB",
                    style = YtmCaption02,
                    color = YtmWhite67,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                )
            }
        }
    }
}
