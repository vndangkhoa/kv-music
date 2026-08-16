package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.AppContainer
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.FeedItem
import com.kvmusic.app.data.model.FeedSection
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.TrackCard
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvCard
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvSkeleton
import com.kvmusic.app.ui.theme.KvSurface
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private class FeedState(private val container: AppContainer) {

    var sections by mutableStateOf<List<FeedSection>>(emptyList())
    var fallbackTracks by mutableStateOf<List<Track>>(emptyList())
    var loading by mutableStateOf(true)
    var refreshing by mutableStateOf(false)

    private val music: MusicRepository get() = container.musicRepository

    suspend fun loadAll() {
        try {
            val feed = music.feed()
            sections = feed
            fallbackTracks = if (feed.isEmpty()) {
                coroutineScope {
                    val vietnamese = async { music.search("nhạc việt mới") }
                    val usTop = async { music.search("us top hits") }
                    mixTracks(vietnamese.await(), usTop.await())
                }
            } else {
                emptyList()
            }
        } finally {
            loading = false
            refreshing = false
        }
    }

    suspend fun refresh() {
        refreshing = true
        loadAll()
    }

    suspend fun reload() {
        loading = true
        loadAll()
    }

    private fun mixTracks(a: List<Track>, b: List<Track>): List<Track> {
        val seen = mutableSetOf<String>()
        val out = mutableListOf<Track>()
        val size = maxOf(a.size, b.size)
        for (i in 0 until size) {
            a.getOrNull(i)?.let { if (seen.add(it.id)) out.add(it) }
            b.getOrNull(i)?.let { if (seen.add(it.id)) out.add(it) }
        }
        return out
    }
}

private fun FeedItem.toTrack(): Track = Track(
    id = videoId ?: "",
    title = title,
    artist = artist ?: "",
    album = "YouTube Music",
    duration = 0,
    cover_url = thumb ?: "",
)

private fun List<FeedItem>.toPlayableTracks(): List<Track> =
    filter { it.videoId != null }.map { it.toTrack() }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val state = remember(container) { FeedState(container) }
    val scope = rememberCoroutineScope()
    val nav = LocalNav.current
    val player = container.playerController

    val host by container.serverConfigStore.host.collectAsState(
        initial = container.serverConfigStore.currentHost()
    )

    LaunchedEffect(host) {
        if (host.isNotBlank()) state.loadAll()
    }

    if (host.isBlank()) {
        ServerSetupCard()
        return
    }

    val onFeedItemClick: (FeedItem, Int, List<FeedItem>) -> Unit = { item, _, sectionItems ->
        when {
            item.videoId != null -> {
                val queue = sectionItems.toPlayableTracks()
                if (queue.isNotEmpty()) {
                    val index = queue.indexOfFirst { it.id == item.videoId }.coerceAtLeast(0)
                    player.playTrack(item.toTrack(), queue, index)
                }
            }
            item.playlistId != null -> nav.navigate(Routes.playlist(item.playlistId))
        }
    }

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { scope.launch { state.refresh() } },
        modifier = Modifier.fillMaxSize(),
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.navigationBars),
            contentPadding = PaddingValues(bottom = 160.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            if (state.loading) {
                item(key = "feed-skel-header") {
                    SkeletonBox(
                        width = 160.dp,
                        height = 20.dp,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                }
                items(count = 3, key = { "feed-skel-$it" }) {
                    FeedRowSkeleton()
                }
            } else {
                state.sections.forEachIndexed { index, section ->
                    if (section.items.isNotEmpty()) {
                        item(key = "feed-$index") {
                            FeedSectionBlock(
                                section = section,
                                onItemClick = onFeedItemClick,
                            )
                        }
                    }
                }
                if (state.sections.isEmpty()) {
                    if (state.fallbackTracks.isNotEmpty()) {
                        item(key = "suggestions") {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                SectionHeader(
                                    title = "Gợi ý cho bạn",
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                )
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    itemsIndexed(state.fallbackTracks) { index, track ->
                                        TrackCard(
                                            track = track,
                                            onPlay = { player.playTrack(track, state.fallbackTracks, index) },
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        item(key = "empty") {
                            FeedEmpty(onRetry = { scope.launch { state.reload() } })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FeedSectionBlock(
    section: FeedSection,
    onItemClick: (FeedItem, Int, List<FeedItem>) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            title = section.title,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            itemsIndexed(section.items) { index, item ->
                TrackCard(track = item.toTrack(), onPlay = { onItemClick(item, index, section.items) })
            }
        }
    }
}



@Composable
private fun FeedRowSkeleton() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(112.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(KvSkeleton),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .padding(start = 12.dp)
                .size(88.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(KvCard),
        )
        Column(
            modifier = Modifier
                .padding(start = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SkeletonBox(width = 200.dp, height = 12.dp, shape = RoundedCornerShape(4.dp))
            SkeletonBox(width = 140.dp, height = 12.dp, shape = RoundedCornerShape(4.dp))
            SkeletonBox(width = 90.dp, height = 10.dp, shape = RoundedCornerShape(4.dp))
        }
    }
}

@Composable
private fun FeedEmpty(onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 48.dp),
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
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Không có nội dung mới",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Kiểm tra kết nối máy chủ hoặc kéo xuống để làm mới",
            fontSize = 13.sp,
            color = KvMuted,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(20.dp))
        Button(
            onClick = onRetry,
            shape = RoundedCornerShape(24.dp),
            colors = ButtonDefaults.buttonColors(containerColor = KvOrange),
        ) {
            Text(text = "Thử lại", fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
    }
}

