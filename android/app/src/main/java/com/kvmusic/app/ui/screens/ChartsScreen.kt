package com.kvmusic.app.ui.screens

import android.provider.Settings
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.theme.Chip
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.ui.theme.glassStrong
import com.kvmusic.app.util.Formatters

private data class ChartTab(
    val type: String,
    val title: String,
    val desc: String,
)

private val CHART_TABS = listOf(
    ChartTab(
        type = "top-hits",
        title = "SoundCloud Realtime Top 50 Charts",
        desc = "The most played and trending tracks on SoundCloud right now.",
    ),
    ChartTab(
        type = "trending",
        title = "Top Trending V-Pop Charts",
        desc = "Vietnamese pop & indie hits dominating the stream.",
    ),
    ChartTab(
        type = "top-albums",
        title = "Top 100 Global Stream Charts",
        desc = "The hottest international chart toppers across all genres.",
    ),
    ChartTab(
        type = "hits-collection",
        title = "SoundCloud New & Hot Collection",
        desc = "Breakthrough creators and viral underground discoveries.",
    ),
)

@Composable
fun ChartsScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val player = container.playerController
    val playerState by player.state.collectAsStateWithLifecycle()
    val host by container.serverConfigStore.host.collectAsStateWithLifecycle(
        initialValue = container.serverConfigStore.currentHost()
    )

    var selectedType by remember { mutableStateOf(CHART_TABS.first().type) }
    var tracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var reloadKey by remember { mutableStateOf(0) }

    LaunchedEffect(host, selectedType, reloadKey) {
        if (host.isBlank()) {
            loading = false
            tracks = emptyList()
            return@LaunchedEffect
        }
        loading = true
        tracks = emptyList()
        tracks = container.musicRepository.charts(selectedType)
        loading = false
    }

    if (host.isBlank()) {
        ServerSetupCard()
        return
    }

    val chart = CHART_TABS.firstOrNull { it.type == selectedType } ?: CHART_TABS.first()

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 14.dp)
        ) {
            Text(
                text = "BXH",
                style = LargeTitle,
                color = Fg,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = chart.title,
                fontSize = 13.sp,
                color = Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = chart.desc,
                fontSize = 11.sp,
                color = Faint,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(CHART_TABS) { tab ->
                ChartTabPill(
                    tab = tab,
                    selected = tab.type == selectedType,
                    onClick = { selectedType = tab.type },
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        when {
            loading -> ChartsSkeleton()
            tracks.isEmpty() -> ChartsError(onRetry = { reloadKey++ })
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 160.dp),
            ) {
                itemsIndexed(
                    items = tracks,
                    key = { _, track -> track.id },
                ) { index, track ->
                    val shape = if (tracks.size == 1) {
                        RoundedCornerShape(20.dp)
                    } else {
                        when (index) {
                            0 -> RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
                            tracks.lastIndex -> RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)
                            else -> RectangleShape
                        }
                    }
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                    ) {
                        ChartTrackRow(
                            track = track,
                            rank = index + 1,
                            isCurrent = playerState.currentTrack?.id == track.id,
                            isPlaying = playerState.isPlaying,
                            onClick = { player.playQueue(tracks, index) },
                            modifier = Modifier.background(Color.White.copy(alpha = 0.04f), shape),
                        )
                        if (index < tracks.lastIndex) {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height(0.5.dp)
                                    .background(Hair),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChartTabPill(tab: ChartTab, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .height(36.dp)
            .then(if (selected) Modifier.glassStrong else Modifier.glass(KvShapePill))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = tab.title,
            style = Chip,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (selected) Fg else Muted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ChartTrackRow(
    track: Track,
    rank: Int,
    isCurrent: Boolean,
    isPlaying: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = rank.toString(),
            modifier = Modifier.width(24.dp),
            textAlign = TextAlign.End,
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
            color = when {
                isCurrent -> Fg
                rank <= 3 -> KvOrange
                else -> Muted
            },
        )
        if (isCurrent) {
            Spacer(Modifier.width(6.dp))
            EqIndicator(playing = isPlaying)
        } else {
            Spacer(Modifier.width(22.dp))
        }
        Spacer(Modifier.width(12.dp))
        CoverImage(url = track.cover_url, title = track.title, size = 42.dp, cornerRadius = 12.dp)
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 15.sp,
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                color = Fg,
            )
            Text(
                text = track.artist,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 12.sp,
                color = Muted,
            )
        }
        Spacer(Modifier.width(8.dp))
        Text(
            text = Formatters.duration(track.duration),
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            color = Muted,
        )
    }
}

@Composable
private fun ChartsSkeleton() {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
    ) {
        items(6) {
            TrackRowSkeleton()
        }
    }
}

@Composable
private fun ChartsError(onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .glass(CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.MusicNote,
                    contentDescription = null,
                    tint = Muted,
                    modifier = Modifier.size(36.dp),
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Không thể tải bảng xếp hạng",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Kiểm tra kết nối máy chủ hoặc thử lại",
                fontSize = 13.sp,
                color = Muted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onRetry,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = KvOrange),
            ) {
                Text(text = "Thử lại", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun EqIndicator(playing: Boolean, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val reducedMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    Box(modifier = modifier.size(16.dp), contentAlignment = Alignment.BottomCenter) {
        if (playing && !reducedMotion) {
            val transition = rememberInfiniteTransition(label = "eq")
            val b1 by transition.animateFloat(0.55f, 1f, infiniteRepeatable(tween(520), RepeatMode.Reverse), label = "eq1")
            val b2 by transition.animateFloat(1f, 0.6f, infiniteRepeatable(tween(430, delayMillis = 150), RepeatMode.Reverse), label = "eq2")
            val b3 by transition.animateFloat(0.7f, 1f, infiniteRepeatable(tween(480, delayMillis = 75), RepeatMode.Reverse), label = "eq3")
            EqBars(b1, b2, b3)
        } else {
            EqBars(0.7f, 1f, 0.85f)
        }
    }
}

@Composable
private fun EqBars(b1: Float, b2: Float, b3: Float) {
    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        Box(Modifier.width(3.dp).height(8.dp * b1).background(KvOrange.copy(alpha = 0.5f), RoundedCornerShape(1.5.dp)))
        Box(Modifier.width(3.dp).height(14.dp * b2).background(KvOrange, RoundedCornerShape(1.5.dp)))
        Box(Modifier.width(3.dp).height(10.dp * b3).background(KvOrange.copy(alpha = 0.7f), RoundedCornerShape(1.5.dp)))
    }
}
