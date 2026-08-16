package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.AppContainer
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.ArtistHit
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.UniversalSearchResponse
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.ArtBorder
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Glass
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.GlassStrong
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.TagBg
import com.kvmusic.app.ui.theme.T1End
import com.kvmusic.app.ui.theme.T1Start
import com.kvmusic.app.ui.theme.T2End
import com.kvmusic.app.ui.theme.T2Start
import com.kvmusic.app.ui.theme.glass
import kotlinx.coroutines.delay

private class SearchState(private val container: AppContainer) {

    var suggestions by mutableStateOf<List<String>>(emptyList())
    var results by mutableStateOf<UniversalSearchResponse?>(null)
    var loading by mutableStateOf(false)

    fun onTyping() {
        suggestions = emptyList()
        results = null
    }

    suspend fun search(query: String) {
        val q = query.trim()
        if (q.isEmpty()) {
            suggestions = emptyList()
            results = null
            loading = false
            return
        }
        loading = true
        try {
            val sugg = container.musicRepository.suggestions(q)
            if (sugg.isEmpty()) {
                suggestions = emptyList()
                results = container.musicRepository.universalSearch(q)
            } else {
                suggestions = sugg
            }
        } catch (_: Exception) {
        } finally {
            loading = false
        }
    }
}

private val BrowseChips = listOf("Moods", "Genres", "Top 100", "Charts", "Indie", "Focus")
private val BrowseTiles = listOf("Nhạc Việt", "US Hits", "Lo-fi", "Chill", "Workout", "Focus")

@Composable
fun SearchScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val state = remember(container) { SearchState(container) }
    val nav = LocalNav.current
    val playerState by container.playerController.state.collectAsStateWithLifecycle()

    val host by container.serverConfigStore.host.collectAsStateWithLifecycle(
        initialValue = container.serverConfigStore.currentHost(),
    )

    var query by rememberSaveable { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    LaunchedEffect(query) {
        state.onTyping()
        delay(300)
        state.search(query)
    }

    if (host.isBlank()) {
        ServerSetupCard()
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.navigationBars),
    ) {
        Text(
            text = "Tìm kiếm",
            style = LargeTitle,
            color = Fg,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 14.dp),
        )
        SearchField(
            query = query,
            onQueryChange = { query = it },
            focusRequester = focusRequester,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(modifier = Modifier.height(12.dp))
        BrowseChipsRow(
            activeChip = query,
            onChipClick = { query = it },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(14.dp))
        Box(modifier = Modifier.weight(1f)) {
            when {
                query.isBlank() -> BrowseState(onTileClick = { query = it })
                state.suggestions.isNotEmpty() -> SuggestionsPanel(
                    suggestions = state.suggestions,
                    onSuggestionClick = { query = it },
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                state.loading || state.results == null -> SearchSkeleton()
                else -> {
                    val results = state.results
                    if (results != null) {
                        ResultsList(
                            results = results,
                            isCurrent = { t -> playerState.currentTrack?.id == t.id },
                            isPlaying = playerState.isPlaying,
                            onPlay = { track, songs, index ->
                                container.playerController.playTrack(track, songs, index)
                            },
                            onAlbumClick = { id -> nav.navigate(Routes.album(id)) },
                            onPlaylistClick = { id -> nav.navigate(Routes.playlist(id)) },
                            onArtistClick = { artist -> nav.navigate(Routes.artist(artist.id, artist.name)) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    focusRequester: FocusRequester,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(46.dp)
            .glass(RoundedCornerShape(23.dp))
            .padding(horizontal = 16.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { focusRequester.requestFocus() },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Rounded.Search,
            contentDescription = null,
            tint = Muted,
            modifier = Modifier.size(18.dp),
        )
        Spacer(modifier = Modifier.width(10.dp))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier
                .weight(1f)
                .focusRequester(focusRequester),
            singleLine = true,
            textStyle = TextStyle(color = Fg, fontSize = 16.sp),
            cursorBrush = SolidColor(KvOrange),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            decorationBox = { innerTextField ->
                Box {
                    if (query.isEmpty()) {
                        Text(
                            text = "Tìm kiếm bài hát, nghệ sĩ, playlist...",
                            fontSize = 16.sp,
                            color = Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    innerTextField()
                }
            },
        )
        if (query.isNotEmpty()) {
            Spacer(modifier = Modifier.width(6.dp))
            IconButton(
                onClick = { onQueryChange("") },
                modifier = Modifier.size(28.dp),
            ) {
                Icon(
                    imageVector = Icons.Rounded.Clear,
                    contentDescription = "Xóa",
                    tint = Muted,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun BrowseChipsRow(
    activeChip: String,
    onChipClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(BrowseChips) { chip ->
            val active = activeChip == chip
            Text(
                text = chip,
                fontSize = 14.sp,
                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                color = if (active) Fg else Fg2,
                modifier = Modifier
                    .clip(KvShapePill)
                    .then(
                        if (active) {
                            Modifier
                                .background(
                                    Brush.verticalGradient(listOf(GlassStrong, Glass)),
                                    KvShapePill,
                                )
                                .border(0.5.dp, GlassBorder, KvShapePill)
                        } else {
                            Modifier
                        },
                    )
                    .clickable { onChipClick(chip) }
                    .padding(horizontal = 16.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
private fun BrowseState(onTileClick: (String) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                title = "Duyệt",
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 2.dp),
            )
        }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                BrowseTiles.chunked(2).forEachIndexed { rowIndex, row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        row.forEachIndexed { colIndex, tile ->
                            BrowseTile(
                                label = tile,
                                index = rowIndex * 2 + colIndex,
                                onClick = { onTileClick(tile) },
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
}

@Composable
private fun BrowseTile(
    label: String,
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
            text = label,
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
private fun SuggestionsPanel(
    suggestions: List<String>,
    onSuggestionClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .glass(KvShapeCard),
        contentPadding = PaddingValues(vertical = 4.dp),
    ) {
        items(suggestions, key = { it }) { suggestion ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .clickable { onSuggestionClick(suggestion) }
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Search,
                    contentDescription = null,
                    tint = Muted,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = suggestion,
                    fontSize = 16.sp,
                    color = Fg,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun SearchSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 8.dp),
    ) {
        repeat(6) {
            TrackRowSkeleton()
        }
    }
}

@Composable
private fun ResultsList(
    results: UniversalSearchResponse,
    isCurrent: (Track) -> Boolean,
    isPlaying: Boolean,
    onPlay: (Track, List<Track>, Int) -> Unit,
    onAlbumClick: (String) -> Unit,
    onPlaylistClick: (String) -> Unit,
    onArtistClick: (ArtistHit) -> Unit,
) {
    val songs = results.songs
    val albums = results.albums
    val playlists = results.playlists
    val artists = results.artists

    if (songs.isEmpty() && albums.isEmpty() && playlists.isEmpty() && artists.isEmpty()) {
        NoResults()
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (artists.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Nghệ sĩ",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 4.dp),
                )
            }
            items(artists.chunked(2)) { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEach { artist ->
                        ArtistGridItem(
                            name = artist.name,
                            photo = artist.photo,
                            onClick = { onArtistClick(artist) },
                        )
                    }
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
        if (songs.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Bài hát",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp),
                )
            }
            itemsIndexed(songs, key = { _, t -> t.id }) { index, track ->
                TrackRow(
                    track = track,
                    index = index + 1,
                    isCurrent = isCurrent(track),
                    trailing = {
                        if (isCurrent(track)) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                                contentDescription = null,
                                tint = KvOrange,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    },
                    onClick = { onPlay(track, songs, index) },
                )
            }
        }
        if (albums.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Album",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp),
                )
            }
            items(albums.chunked(2)) { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEach { album ->
                        CoverGridItem(
                            title = album.title,
                            subtitle = album.artist,
                            url = album.cover_url,
                            onClick = { onAlbumClick(album.id) },
                        )
                    }
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
        if (playlists.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Playlist",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp),
                )
            }
            items(playlists.chunked(2)) { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEach { playlist ->
                        CoverGridItem(
                            title = playlist.title,
                            subtitle = "Playlist",
                            url = playlist.cover_url,
                            onClick = { onPlaylistClick(playlist.id) },
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
private fun RowScope.ArtistGridItem(
    name: String,
    photo: String?,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            ArtistAvatar(url = photo, name = name, size = maxWidth)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = name,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun RowScope.CoverGridItem(
    title: String,
    subtitle: String,
    url: String?,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(onClick = onClick),
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            CoverImage(
                url = url,
                title = title,
                size = maxWidth,
                cornerRadius = 16.dp,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = title,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = subtitle,
            fontSize = 11.sp,
            color = Muted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun NoResults() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Rounded.SearchOff,
                contentDescription = null,
                tint = Faint,
                modifier = Modifier.size(48.dp),
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Không tìm thấy kết quả",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Fg,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Thử tìm kiếm với từ khóa khác",
                fontSize = 13.sp,
                color = Muted,
                textAlign = TextAlign.Center,
            )
        }
    }
}
