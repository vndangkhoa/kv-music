package com.kvmusic.app.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Group
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.ArtistChartEntry
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange

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
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.Group,
                    contentDescription = null,
                    tint = KvOrange,
                    modifier = Modifier.size(15.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = "Bảng Xếp Hạng Nghệ Sĩ Realtime",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    color = KvOrange,
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = "TOP NGHỆ SĨ NỔI BẬT",
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Nghệ sĩ có lượt nghe và theo dõi hàng đầu theo từng quốc gia",
                fontSize = 11.sp,
                color = KvMuted,
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            REGION_TABS.forEach { tab ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(50))
                        .background(if (tab.id == region) KvOrange else KvInput)
                        .clickable { region = tab.id }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = tab.label,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (tab.id == region) Color.White else KvMuted,
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        when {
            loading -> ArtistsSkeleton()
            artists.isEmpty() -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(text = "Không có nghệ sĩ", fontSize = 14.sp, color = KvMuted)
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 160.dp),
            ) {
                itemsIndexed(artists) { index, artist ->
                    ArtistChartRow(
                        entry = artist,
                        rank = index + 1,
                        onClick = { nav.navigate(Routes.artist(artist.id, artist.name)) },
                    )
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
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = rank.toString(),
            modifier = Modifier.width(28.dp),
            textAlign = TextAlign.Center,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = if (rank <= 3) KvOrange else KvFaint,
        )
        ArtistAvatar(url = entry.photo, name = entry.name, size = 56.dp)
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = entry.name,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = formatFollowers(entry.followers),
                fontSize = 12.sp,
                color = KvMuted,
            )
        }
        Spacer(Modifier.width(8.dp))
        Icon(
            imageVector = Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = KvFaint,
            modifier = Modifier.size(20.dp),
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
        items(8) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SkeletonBox(width = 28.dp, height = 16.dp, shape = RoundedCornerShape(6.dp))
                Spacer(Modifier.width(12.dp))
                SkeletonBox(width = 56.dp, height = 56.dp, shape = CircleShape)
                Spacer(Modifier.width(12.dp))
                Column {
                    SkeletonBox(width = 140.dp, height = 14.dp, shape = RoundedCornerShape(7.dp))
                    Spacer(Modifier.height(8.dp))
                    SkeletonBox(width = 90.dp, height = 11.dp, shape = RoundedCornerShape(5.dp))
                }
            }
        }
    }
}

