package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.AppContainer
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.local.ServerConfigStore
import com.kvmusic.app.data.model.ArtistChartEntry
import com.kvmusic.app.data.model.StaticPlaylist
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.TrackCard
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvOrange2
import com.kvmusic.app.ui.theme.KvSkeleton
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private class HomeState(private val container: AppContainer) {

    var browse by mutableStateOf<Map<String, List<StaticPlaylist>>>(emptyMap())
    var charts by mutableStateOf<List<Track>>(emptyList())
    var artists by mutableStateOf<List<ArtistChartEntry>>(emptyList())
    var newReleases by mutableStateOf<List<Track>>(emptyList())
    var loading by mutableStateOf(true)
    var refreshing by mutableStateOf(false)

    private val store: ServerConfigStore get() = container.serverConfigStore
    private val music: MusicRepository get() = container.musicRepository

    suspend fun loadAll() {
        try {
            val country = runCatching { store.country.first() }.getOrDefault("VN")
            coroutineScope {
                val browseDeferred = async { music.browse(country) }
                val chartsDeferred = async { music.charts("trending") }
                val artistsDeferred = async { music.artists("vn") }
                val releasesDeferred = async { music.newReleases("vn") }
                browse = browseDeferred.await()
                charts = chartsDeferred.await().take(15)
                artists = artistsDeferred.await()
                newReleases = releasesDeferred.await()
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val state = remember(container) { HomeState(container) }
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

    val categories = state.browse.entries.take(3)

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
            item(key = "hero") {
                if (state.loading) {
                    HeroSkeleton()
                } else {
                    HeroBanner(onClick = { nav.navigate(Routes.CHARTS) })
                }
            }
            item(key = "trending") {
                TrendingSection(
                    loading = state.loading,
                    tracks = state.charts,
                    onPlay = { track, index -> player.playTrack(track, state.charts, index) },
                    onMore = { nav.navigate(Routes.CHARTS) },
                )
            }
            if (state.loading) {
                items(count = 2, key = { "browse-skel-$it" }) {
                    BrowseCategorySkeleton()
                }
            } else {
                items(categories, key = { "browse-${it.key}" }) { (category, playlists) ->
                    BrowseCategorySection(
                        category = category,
                        playlists = playlists,
                        loading = state.loading,
                        onMore = { nav.navigate(Routes.section(category)) },
                        onCoverClick = { p ->
                            if (p.type == "Album" || p.id.startsWith("MPRE")) {
                                nav.navigate(Routes.album(p.id))
                            } else {
                                nav.navigate(Routes.playlist(p.id))
                            }
                        },
                        onArtistClick = { p -> nav.navigate(Routes.artist(p.id, p.title)) },
                    )
                }
            }
            item(key = "artists") {
                ArtistsSection(
                    loading = state.loading,
                    artists = state.artists,
                    onMore = { nav.navigate(Routes.ARTISTS) },
                    onArtistClick = { a -> nav.navigate(Routes.artist(a.id, a.name)) },
                )
            }
            item(key = "releases") {
                NewReleasesSection(
                    loading = state.loading,
                    tracks = state.newReleases,
                    onPlay = { track, index -> player.playTrack(track, state.newReleases, index) },
                )
            }
        }
    }
}

@Composable
private fun TrendingSection(
    loading: Boolean,
    tracks: List<Track>,
    onPlay: (Track, Int) -> Unit,
    onMore: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            title = "Trending on SoundCloud",
            onMore = onMore,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        when {
            loading -> CardRowSkeleton()
            tracks.isEmpty() -> SectionEmpty("Không có nhạc xu hướng")
            else -> LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                itemsIndexed(tracks) { index, track ->
                    TrackCard(track = track, onPlay = { onPlay(track, index) })
                }
            }
        }
    }
}

@Composable
private fun BrowseCategorySection(
    category: String,
    playlists: List<StaticPlaylist>,
    loading: Boolean,
    onMore: () -> Unit,
    onCoverClick: (StaticPlaylist) -> Unit,
    onArtistClick: (StaticPlaylist) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            title = category,
            onMore = onMore,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        when {
            loading -> CardRowSkeleton()
            playlists.isEmpty() -> SectionEmpty("Không có danh mục")
            playlists.firstOrNull()?.type == "Artist" -> LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(playlists) { p ->
                    ArtistCard(
                        name = p.title,
                        photo = p.cover_url ?: "",
                        onClick = { onArtistClick(p) },
                    )
                }
            }
            else -> LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(playlists) { p ->
                    CoverCard(playlist = p, onClick = { onCoverClick(p) })
                }
            }
        }
    }
}

@Composable
private fun ArtistsSection(
    loading: Boolean,
    artists: List<ArtistChartEntry>,
    onMore: () -> Unit,
    onArtistClick: (ArtistChartEntry) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            title = "Nghệ sĩ nổi bật",
            onMore = onMore,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        when {
            loading -> CardRowSkeleton()
            artists.isEmpty() -> SectionEmpty("Không có nghệ sĩ")
            else -> LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(artists) { a ->
                    ArtistCard(
                        name = a.name,
                        photo = a.photo,
                        onClick = { onArtistClick(a) },
                    )
                }
            }
        }
    }
}

@Composable
private fun NewReleasesSection(
    loading: Boolean,
    tracks: List<Track>,
    onPlay: (Track, Int) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            title = "MỚI PHÁT HÀNH",
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        when {
            loading -> CardRowSkeleton()
            tracks.isEmpty() -> SectionEmpty("Không có bản phát hành mới")
            else -> LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                itemsIndexed(tracks) { index, track ->
                    TrackCard(track = track, onPlay = { onPlay(track, index) })
                }
            }
        }
    }
}

@Composable
private fun HeroBanner(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 16.dp)
            .height(150.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.linearGradient(listOf(KvOrange, KvOrange2, Color(0xFF7A2A00))))
            .clickable(onClick = onClick),
    ) {
        Icon(
            imageVector = Icons.Filled.MusicNote,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.18f),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .size(110.dp),
        )
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(horizontal = 20.dp),
        ) {
            Text(
                text = "KV Music",
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Nghe nhạc không giới hạn",
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.85f),
            )
        }
    }
}

@Composable
private fun HeroSkeleton() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 16.dp)
            .height(150.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(KvSkeleton),
    )
}

@Composable
private fun BrowseCategorySkeleton() {
    Column(modifier = Modifier.fillMaxWidth()) {
        SkeletonBox(
            width = 150.dp,
            height = 18.dp,
            shape = RoundedCornerShape(6.dp),
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(modifier = Modifier.height(10.dp))
        CardRowSkeleton()
    }
}

@Composable
private fun CardRowSkeleton() {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(5) {
            Column(modifier = Modifier.width(140.dp)) {
                SkeletonBox(width = 140.dp, height = 140.dp, shape = RoundedCornerShape(10.dp))
                Spacer(modifier = Modifier.height(8.dp))
                SkeletonBox(width = 120.dp, height = 12.dp, shape = RoundedCornerShape(4.dp))
                Spacer(modifier = Modifier.height(4.dp))
                SkeletonBox(width = 80.dp, height = 10.dp, shape = RoundedCornerShape(4.dp))
            }
        }
    }
}

@Composable
private fun SectionEmpty(text: String) {
    Text(
        text = text,
        fontSize = 12.sp,
        color = KvMuted,
        modifier = Modifier.padding(horizontal = 16.dp),
    )
}


@Composable
private fun CoverCard(playlist: StaticPlaylist, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .width(120.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
    ) {
        CoverImage(
            url = playlist.cover_url,
            title = playlist.title,
            size = 120.dp,
            cornerRadius = 12.dp,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = playlist.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = playlist.creator ?: playlist.description ?: "Playlist",
            fontSize = 10.sp,
            color = KvMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ArtistCard(name: String, photo: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .width(100.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ArtistAvatar(url = photo, name = name, size = 72.dp)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = name,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

