package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.ArtistChartEntry
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.KvPlayButton
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.Chip
import com.kvmusic.app.ui.theme.Eyebrow
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeArt
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.ui.theme.glassStrong

private data class RegionTab(val id: String, val label: String)

private val REGION_TABS = listOf(
    RegionTab(id = "vn", label = "VIỆT NAM"),
    RegionTab(id = "us", label = "ÂU MỸ"),
    RegionTab(id = "kr", label = "HÀN QUỐC"),
    RegionTab(id = "cn", label = "TRUNG QUỐC"),
)

@Composable
fun ArtistsScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current
    val host by container.serverConfigStore.host.collectAsStateWithLifecycle(
        initialValue = container.serverConfigStore.currentHost()
    )

    var region by remember { mutableStateOf(REGION_TABS.first().id) }
    var artists by remember { mutableStateOf<List<ArtistChartEntry>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(host, region) {
        if (host.isBlank()) {
            loading = false
            artists = emptyList()
            return@LaunchedEffect
        }
        loading = true
        artists = container.musicRepository.artists(region)
        loading = false
    }

    if (host.isBlank()) {
        ServerSetupCard()
        return
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 14.dp)
        ) {
            Text(
                text = "Bảng Xếp Hạng Nghệ Sĩ Realtime",
                style = Eyebrow,
                fontFamily = FontFamily.Monospace,
                color = KvOrange,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "TOP NGHỆ SĨ NỔI BẬT",
                style = LargeTitle,
                color = Fg,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Nghệ sĩ có lượt nghe và theo dõi hàng đầu theo từng quốc gia",
                fontSize = 12.sp,
                color = Muted,
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            REGION_TABS.forEach { tab ->
                val selected = tab.id == region
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp)
                        .then(if (selected) Modifier.glassStrong else Modifier.glass(KvShapePill))
                        .clickable { region = tab.id },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = tab.label,
                        style = Chip,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (selected) Fg else Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        when {
            loading -> ArtistsSkeleton()
            artists.isEmpty() -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(text = "Không có nghệ sĩ", fontSize = 14.sp, color = Muted)
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 160.dp),
            ) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .glass(KvShapeCard),
                    ) {
                        artists.forEachIndexed { index, artist ->
                            ArtistChartRow(
                                entry = artist,
                                rank = index + 1,
                                onClick = { nav.navigate(Routes.artist(artist.id, artist.name)) },
                            )
                            if (index < artists.lastIndex) {
                                Box(Modifier.fillMaxWidth().height(0.5.dp).background(Hair))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ArtistChartRow(
    entry: ArtistChartEntry,
    rank: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ArtistRankBadge(rank = rank)
        Spacer(Modifier.width(12.dp))
        Box(
            modifier = Modifier
                .size(48.dp)
                .glass(CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            ArtistAvatar(url = entry.photo, name = entry.name, size = 44.dp)
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = entry.name,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = Fg,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = formatFollowers(entry.followers),
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                color = Muted,
            )
        }
        Spacer(Modifier.width(8.dp))
        KvPlayButton(
            onClick = onClick,
            size = 40.dp,
            shadowRadius = 8.dp,
            iconSize = 16.dp,
        )
    }
}

@Composable
private fun ArtistRankBadge(rank: Int) {
    val top3 = rank <= 3
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(KvShapeArt)
            .background(if (top3) KvOrange else Color.Transparent)
            .then(
                if (top3) Modifier else Modifier.border(1.dp, GlassBorder, KvShapeArt)
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = rank.toString(),
            fontFamily = FontFamily.Monospace,
            fontSize = 13.sp,
            fontWeight = if (top3) FontWeight.Bold else FontWeight.Normal,
            color = if (top3) Color.White else Muted,
        )
    }
}

private fun formatFollowers(raw: String): String {
    var text = raw.trim()
    text = text.removeSuffix("subscribers").removeSuffix("Subscribers").trim()
    return text.ifBlank { raw }
}

@Composable
private fun ArtistsSkeleton() {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .glass(KvShapeCard),
            ) {
                repeat(8) { index ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SkeletonBox(width = 36.dp, height = 36.dp, shape = KvShapeArt)
                        Spacer(Modifier.width(12.dp))
                        SkeletonBox(width = 48.dp, height = 48.dp, shape = CircleShape)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            SkeletonBox(width = 140.dp, height = 14.dp, shape = RoundedCornerShape(7.dp))
                            Spacer(Modifier.height(6.dp))
                            SkeletonBox(width = 90.dp, height = 11.dp, shape = RoundedCornerShape(5.dp))
                        }
                    }
                    if (index < 7) {
                        Box(Modifier.fillMaxWidth().height(0.5.dp).background(Hair))
                    }
                }
            }
        }
    }
}
