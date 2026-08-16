package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.AppContainer
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.ArtistHit
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.UniversalSearchResponse
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.ServerSetupCard
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvSurface
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
        SearchField(
            query = query,
            onQueryChange = { query = it },
            focusRequester = focusRequester,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp),
        )
        when {
            query.isBlank() -> EmptyHint()
            state.suggestions.isNotEmpty() -> SuggestionsList(
                suggestions = state.suggestions,
                onSuggestionClick = { query = it },
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

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    focusRequester: FocusRequester,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier
            .fillMaxWidth()
            .focusRequester(focusRequester),
        placeholder = {
            Text(
                text = "Tìm kiếm bài hát, nghệ sĩ, playlist...",
                fontSize = 14.sp,
                color = KvMuted,
            )
        },
        leadingIcon = {
            Icon(
                imageVector = Icons.Rounded.Search,
                contentDescription = null,
                tint = KvMuted,
            )
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(
                        imageVector = Icons.Rounded.Clear,
                        contentDescription = "Xóa",
                        tint = KvMuted,
                    )
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(24.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = KvInput,
            unfocusedContainerColor = KvInput,
            focusedBorderColor = KvOrange,
            unfocusedBorderColor = KvBorder,
            cursorColor = KvOrange,
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
        ),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
    )
}

@Composable
private fun EmptyHint() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(KvSurface),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.MusicNote,
                    contentDescription = null,
                    tint = KvOrange,
                    modifier = Modifier.size(40.dp),
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Tìm kiếm nhạc của bạn",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Tìm bài hát, nghệ sĩ, album hoặc playlist",
                fontSize = 13.sp,
                color = KvMuted,
            )
        }
    }
}

@Composable
private fun SuggestionsList(suggestions: List<String>, onSuggestionClick: (String) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
    ) {
        items(suggestions, key = { it }) { suggestion ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSuggestionClick(suggestion) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Search,
                    contentDescription = null,
                    tint = KvMuted,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    text = suggestion,
                    fontSize = 14.sp,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun SearchSkeleton() {
    Column(modifier = Modifier.fillMaxSize().padding(top = 8.dp)) {
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
    ) {
        if (artists.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Nghệ sĩ",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
                )
            }
            items(artists, key = { it.id }) { artist ->
                ArtistRow(artist = artist, onClick = { onArtistClick(artist) })
            }
        }
        if (songs.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Bài hát",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
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
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
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
                }
            }
        }
        if (playlists.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Playlist",
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp),
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
                }
            }
        }
    }
}

@Composable
private fun ArtistRow(artist: ArtistHit, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ArtistAvatar(url = artist.photo, name = artist.name, size = 56.dp)
        Spacer(Modifier.width(12.dp))
        Text(
            text = artist.name,
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Spacer(Modifier.width(8.dp))
        Icon(
            imageVector = Icons.Rounded.ChevronRight,
            contentDescription = null,
            tint = KvMuted,
            modifier = Modifier.size(20.dp),
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
                cornerRadius = 12.dp,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = title,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = subtitle,
            fontSize = 11.sp,
            color = KvMuted,
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
                tint = KvFaint,
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Không tìm thấy kết quả",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Thử tìm kiếm với từ khóa khác",
                fontSize = 13.sp,
                color = KvMuted,
                textAlign = TextAlign.Center,
            )
        }
    }
}

