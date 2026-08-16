package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingUp
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
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
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvRow
import com.kvmusic.app.ui.theme.KvSurface
import com.kvmusic.app.util.Formatters

private data class ChartTab(
    val type: String,
    val title: String,
    val desc: String,
    val icon: ImageVector,
)

private val CHART_TABS = listOf(
    ChartTab(
        type = "top-hits",
        title = "SoundCloud Realtime Top 50 Charts",
        desc = "The most played and trending tracks on SoundCloud right now.",
        icon = Icons.Filled.LocalFireDepartment,
    ),
    ChartTab(
        type = "trending",
        title = "Top Trending V-Pop Charts",
        desc = "Vietnamese pop & indie hits dominating the stream.",
        icon = Icons.Filled.TrendingUp,
    ),
    ChartTab(
        type = "top-albums",
        title = "Top 100 Global Stream Charts",
        desc = "The hottest international chart toppers across all genres.",
        icon = Icons.Filled.Album,
    ),
    ChartTab(
        type = "hits-collection",
        title = "SoundCloud New & Hot Collection",
        desc = "Breakthrough creators and viral underground discoveries.",
        icon = Icons.Filled.Star,
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
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = chart.icon,
                    contentDescription = null,
                    tint = KvOrange,
                    modifier = Modifier.size(24.dp),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = "BXH",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(text = chart.title, fontSize = 13.sp, color = KvMuted)
            Spacer(Modifier.height(2.dp))
            Text(text = chart.desc, fontSize = 11.sp, color = KvFaint)
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
        Spacer(Modifier.height(8.dp))
        when {
            loading -> ChartsSkeleton()
            tracks.isEmpty() -> ChartsError(onRetry = { reloadKey++ })
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 160.dp),
            ) {
                itemsIndexed(tracks) { index, track ->
                    ChartTrackRow(
                        track = track,
                        rank = index + 1,
                        isCurrent = playerState.currentTrack?.id == track.id,
                        trailing = {
                            Text(
                                text = Formatters.duration(track.duration),
                                fontSize = 12.sp,
                                color = KvMuted,
                            )
                        },
                        onClick = { player.playQueue(tracks, index) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ChartTabPill(tab: ChartTab, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) KvOrange else KvInput)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 7.dp)
    ) {
        Text(
            text = tab.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else KvMuted,
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
    trailing: @Composable RowScope.() -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ChartRankBadge(rank = rank)
        Spacer(Modifier.width(10.dp))
        CoverImage(url = track.cover_url, title = track.title, size = 48.dp)
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = if (isCurrent) KvOrange else Color.White,
            )
            Text(
                text = track.artist,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 12.sp,
                color = KvMuted,
            )
        }
        Spacer(Modifier.width(8.dp))
        trailing()
    }
}

@Composable
private fun ChartRankBadge(rank: Int) {
    val isTop3 = rank <= 3
    val shape = RoundedCornerShape(8.dp)
    val badgeModifier = if (isTop3) {
        Modifier
            .width(32.dp)
            .height(28.dp)
            .clip(shape)
            .background(KvOrange)
    } else {
        Modifier
            .width(32.dp)
            .height(28.dp)
            .clip(shape)
            .background(KvRow)
            .border(1.dp, KvBorder, shape)
    }
    Box(modifier = badgeModifier, contentAlignment = Alignment.Center) {
        Text(
            text = "#$rank",
            fontSize = 12.sp,
            fontWeight = FontWeight.ExtraBold,
            color = if (isTop3) Color.White else KvMuted,
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
                    .clip(CircleShape)
                    .background(KvSurface),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.MusicNote,
                    contentDescription = null,
                    tint = KvMuted,
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
                color = KvMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onRetry,
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = KvOrange),
            ) {
                Text(text = "Thử lại", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

