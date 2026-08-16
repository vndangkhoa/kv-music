package com.kvmusic.app.ui.screens

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlayArrow
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
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
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.ArtA
import com.kvmusic.app.ui.theme.ArtBorder
import com.kvmusic.app.ui.theme.ArtC
import com.kvmusic.app.ui.theme.CardTitle
import com.kvmusic.app.ui.theme.ArtC
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.KvShapeHero
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Meta
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.PlayButtonColors
import com.kvmusic.app.ui.theme.TagBg
import com.kvmusic.app.ui.theme.T1End
import com.kvmusic.app.ui.theme.T1Start
import com.kvmusic.app.ui.theme.T2End
import com.kvmusic.app.ui.theme.T2Start
import com.kvmusic.app.ui.theme.glass
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
        initial = container.serverConfigStore.currentHost(),
    )

    LaunchedEffect(host) {
        if (host.isNotBlank()) state.loadAll()
    }

    if (host.isBlank()) {
        ServerSetupCard()
        return
    }

    val categories = state.browse.entries.take(6)

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { scope.launch { state.refresh() } },
        modifier = Modifier.fillMaxSize(),
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.navigationBars),
            contentPadding = PaddingValues(top = 18.dp, bottom = 160.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            item(key = "title") {
                HomeTitleRow(onProfile = { nav.navigate(Routes.PROFILE) })
            }
            item(key = "hero") {
                if (state.loading) {
                    HeroSkeleton()
                } else {
                    HeroCard(onClick = { nav.navigate(Routes.CHARTS) })
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
                item(key = "browse-skel") { BrowseGridSkeleton() }
            } else {
                item(key = "browse") {
                    BrowseCategoriesSection(
                        categories = categories,
                        onCategoryClick = { nav.navigate(Routes.section(it)) },
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
private fun HomeTitleRow(onProfile: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Listen Now",
            style = LargeTitle,
            color = Fg,
            modifier = Modifier.weight(1f),
        )
        Box(
            modifier = Modifier
                .size(38.dp)
                .glass(CircleShape)
                .clickable(onClick = onProfile),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.Person,
                contentDescription = null,
                tint = Muted,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun HeroCard(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(128.dp)
            .clip(KvShapeHero)
            .background(Brush.linearGradient(listOf(T2Start, T2End)))
            .border(1.dp, ArtBorder, KvShapeHero)
            .clickable(onClick = onClick),
    ) {
        Text(
            text = "NỔI BẬT",
            fontFamily = FontFamily.Monospace,
            fontSize = 9.sp,
            letterSpacing = 0.09.em,
            color = Muted,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 10.dp, start = 10.dp)
                .background(TagBg, RoundedCornerShape(6.dp))
                .padding(horizontal = 7.dp, vertical = 3.dp),
        )
        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 10.dp, bottom = 10.dp)
                .glass(RoundedCornerShape(18.dp))
                .padding(start = 14.dp, top = 8.dp, end = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(modifier = Modifier.weight(1f, fill = false)) {
                Text(
                    text = "KV MUSIC",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.1.em,
                    color = Muted,
                )
                Text(
                    text = "Nghe nhạc không giới hạn",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Fg,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            PlayButton(onClick = onClick, size = 40.dp, iconSize = 16.dp)
        }
    }
}

@Composable
private fun PlayButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 52.dp,
    iconSize: Dp = 20.dp,
) {
    Box(
        modifier = modifier
            .size(size)
            .shadow(18.dp, CircleShape, spotColor = PlayButtonColors.glow)
            .background(PlayButtonColors.bg, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Rounded.PlayArrow,
            contentDescription = null,
            tint = PlayButtonColors.fg,
            modifier = Modifier.size(iconSize),
        )
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
                    HomeTrackCard(track = track, onPlay = { onPlay(track, index) })
                }
            }
        }
    }
}

@Composable
private fun BrowseCategoriesSection(
    categories: List<Map.Entry<String, List<StaticPlaylist>>>,
    onCategoryClick: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(
            title = "Danh mục",
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        if (categories.isEmpty()) {
            SectionEmpty("Không có danh mục")
            return
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            categories.chunked(2).forEachIndexed { rowIndex, row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEachIndexed { colIndex, (category, _) ->
                        BrowseTile(
                            category = category,
                            index = rowIndex * 2 + colIndex,
                            onClick = { onCategoryClick(category) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun BrowseTile(
    category: String,
    index: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(20.dp)
    val palette = if (index % 2 == 0) listOf(T1Start, T1End) else listOf(T2Start, T2End)
    Box(
        modifier = modifier
            .height(92.dp)
            .clip(shape)
            .background(Brush.linearGradient(palette))
            .border(1.dp, ArtBorder, shape)
            .clickable(onClick = onClick),
    ) {
        Text(
            text = "MIX",
            fontFamily = FontFamily.Monospace,
            fontSize = 9.sp,
            letterSpacing = 0.09.em,
            color = Muted,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 8.dp, end = 10.dp)
                .background(TagBg, RoundedCornerShape(6.dp))
                .padding(horizontal = 6.dp, vertical = 2.dp),
        )
        Text(
            text = category,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(12.dp),
        )
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
            loading -> ArtistRailSkeleton()
            artists.isEmpty() -> SectionEmpty("Không có nghệ sĩ")
            else -> LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                items(artists) { a ->
                    ArtistRailCard(
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
private fun ArtistRailCard(name: String, photo: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .width(84.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ArtistAvatar(url = photo, name = name, size = 72.dp)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = name,
            style = Meta,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
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
                    HomeTrackCard(track = track, onPlay = { onPlay(track, index) })
                }
            }
        }
    }
}

@Composable
private fun HomeTrackCard(track: Track, onPlay: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .width(112.dp)
            .clip(shape)
            .clickable(onClick = onPlay),
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(shape)
                .background(Brush.linearGradient(listOf(ArtA, ArtC)))
                .border(1.dp, ArtBorder, shape),
        ) {
            CoverImage(
                url = track.cover_url,
                title = track.title,
                size = 100.dp,
                cornerRadius = 16.dp,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = track.title,
            style = CardTitle,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = track.artist,
            fontSize = 11.sp,
            color = Muted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun HeroSkeleton() {
    val transition = rememberInfiniteTransition()
    val alpha by transition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Reverse),
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(128.dp)
            .clip(KvShapeHero)
            .background(Brush.linearGradient(listOf(T2Start, T2End)))
            .alpha(alpha),
    )
}

@Composable
private fun BrowseGridSkeleton() {
    Column(modifier = Modifier.fillMaxWidth()) {
        SkeletonBox(
            width = 140.dp,
            height = 18.dp,
            shape = RoundedCornerShape(9.dp),
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(modifier = Modifier.height(10.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            repeat(3) { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    repeat(2) { col ->
                        Box(modifier = Modifier.weight(1f)) {
                            SkeletonBox(
                                width = 150.dp,
                                height = 92.dp,
                                shape = RoundedCornerShape(20.dp),
                                art = true,
                                index = row * 2 + col,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CardRowSkeleton() {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(5) { index ->
            Column(modifier = Modifier.width(112.dp)) {
                SkeletonBox(
                    width = 100.dp,
                    height = 100.dp,
                    shape = RoundedCornerShape(16.dp),
                    art = true,
                    index = index,
                )
                Spacer(modifier = Modifier.height(8.dp))
                SkeletonBox(width = 110.dp, height = 12.dp, shape = RoundedCornerShape(4.dp))
                Spacer(modifier = Modifier.height(4.dp))
                SkeletonBox(width = 80.dp, height = 10.dp, shape = RoundedCornerShape(4.dp))
            }
        }
    }
}

@Composable
private fun ArtistRailSkeleton() {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(5) { index ->
            Column(
                modifier = Modifier.width(84.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                SkeletonBox(
                    width = 72.dp,
                    height = 72.dp,
                    shape = CircleShape,
                    art = true,
                    index = index,
                )
                Spacer(modifier = Modifier.height(6.dp))
                SkeletonBox(width = 70.dp, height = 12.dp, shape = RoundedCornerShape(4.dp))
            }
        }
    }
}

@Composable
private fun SectionEmpty(text: String) {
    Text(
        text = text,
        fontSize = 12.sp,
        color = Muted,
        modifier = Modifier.padding(horizontal = 16.dp),
    )
}
