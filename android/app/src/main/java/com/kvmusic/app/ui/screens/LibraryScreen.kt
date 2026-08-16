package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.local.FollowedArtistEntity
import com.kvmusic.app.data.local.PlaylistEntity
import com.kvmusic.app.data.local.SavedAlbumEntity
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvRow
import kotlinx.coroutines.delay

private enum class LibraryFilter(val label: String) {
    ALL("All"),
    PLAYLISTS("Playlists"),
    ARTISTS("Artists"),
    ALBUMS("Albums"),
    LIKED("Liked"),
}

@Composable
fun LibraryScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current
    val player = container.playerController

    val playlists by container.libraryRepository.playlists
        .collectAsStateWithLifecycle(initialValue = emptyList())
    val likedTracks by container.libraryRepository.likedTracks
        .collectAsStateWithLifecycle(initialValue = emptyList())
    val followedArtists by container.libraryRepository.followedArtists
        .collectAsStateWithLifecycle(initialValue = emptyList())
    val savedAlbums by container.libraryRepository.savedAlbums
        .collectAsStateWithLifecycle(initialValue = emptyList())
    val playerState by player.state.collectAsStateWithLifecycle()

    var filterName by rememberSaveable { mutableStateOf(LibraryFilter.ALL.name) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        delay(500)
        loading = false
    }

    val filter = LibraryFilter.valueOf(filterName)
    val currentTrackId = playerState.currentTrack?.id

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.navigationBars),
        contentPadding = PaddingValues(bottom = 160.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Column {
                Text(
                    text = "Thư viện",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp),
                )
                FilterChips(selected = filter, onSelect = { filterName = it.name })
            }
        }

        if (loading) {
            item { LibrarySectionSkeleton() }
            item { LibrarySectionSkeleton() }
            item { LibrarySectionSkeleton() }
        } else when (filter) {
            LibraryFilter.ALL -> {
                item {
                    SectionHeader(title = "Playlist", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (playlists.isEmpty()) {
                    item { EmptyState("Chưa có playlist — hãy tạo playlist đầu tiên!") }
                } else {
                    item {
                        PlaylistGridSection(
                            playlists = playlists,
                            showCreate = false,
                            onCreate = {},
                            onPlaylistClick = { nav.navigate(Routes.playlist(it.id.toString())) },
                        )
                    }
                }

                item {
                    SectionHeader(title = "Nghệ sĩ", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (followedArtists.isEmpty()) {
                    item { EmptyState("Chưa theo dõi nghệ sĩ nào") }
                } else {
                    item {
                        ArtistRowSection(artists = followedArtists) {
                            nav.navigate(Routes.artist(it.id, it.name))
                        }
                    }
                }

                item {
                    SectionHeader(title = "Album", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (savedAlbums.isEmpty()) {
                    item { EmptyState("Chưa lưu album nào") }
                } else {
                    item {
                        AlbumGridSection(albums = savedAlbums) {
                            nav.navigate(Routes.album(it.id))
                        }
                    }
                }

                item {
                    SectionHeader(title = "Đã thích", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (likedTracks.isEmpty()) {
                    item { EmptyState("Chưa có bài hát yêu thích — nhấn trái tim để lưu vào đây") }
                } else {
                    item {
                        LikedTrackList(
                            liked = likedTracks,
                            currentTrackId = currentTrackId,
                            onPlay = { _, index -> player.playQueue(likedTracks, index) },
                        )
                    }
                }
            }

            LibraryFilter.PLAYLISTS -> {
                item {
                    SectionHeader(title = "Playlist", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (playlists.isEmpty()) {
                    item { EmptyState("Chưa có playlist — hãy tạo playlist đầu tiên!") }
                }
                item {
                    PlaylistGridSection(
                        playlists = playlists,
                        showCreate = true,
                        onCreate = { AppUi.createPlaylistOpen = true },
                        onPlaylistClick = { nav.navigate(Routes.playlist(it.id.toString())) },
                    )
                }
            }

            LibraryFilter.ARTISTS -> {
                item {
                    SectionHeader(title = "Nghệ sĩ", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (followedArtists.isEmpty()) {
                    item { EmptyState("Chưa theo dõi nghệ sĩ nào") }
                } else {
                    item {
                        ArtistRows(artists = followedArtists) {
                            nav.navigate(Routes.artist(it.id, it.name))
                        }
                    }
                }
            }

            LibraryFilter.ALBUMS -> {
                item {
                    SectionHeader(title = "Album", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (savedAlbums.isEmpty()) {
                    item { EmptyState("Chưa lưu album nào") }
                } else {
                    item {
                        AlbumGridSection(albums = savedAlbums) {
                            nav.navigate(Routes.album(it.id))
                        }
                    }
                }
            }

            LibraryFilter.LIKED -> {
                item {
                    SectionHeader(title = "Đã thích", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (likedTracks.isEmpty()) {
                    item { EmptyState("Chưa có bài hát yêu thích — nhấn trái tim để lưu vào đây") }
                } else {
                    item {
                        LikedTrackList(
                            liked = likedTracks,
                            currentTrackId = currentTrackId,
                            onPlay = { _, index -> player.playQueue(likedTracks, index) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterChips(selected: LibraryFilter, onSelect: (LibraryFilter) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(LibraryFilter.entries) { filter ->
            val isSelected = filter == selected
            Text(
                text = filter.label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) Color.White else KvMuted,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (isSelected) KvOrange else KvInput)
                    .clickable { onSelect(filter) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            )
        }
    }
}

@Composable
private fun PlaylistGridSection(
    playlists: List<PlaylistEntity>,
    showCreate: Boolean,
    onCreate: () -> Unit,
    onPlaylistClick: (PlaylistEntity) -> Unit,
) {
    val cells = buildList<@Composable () -> Unit> {
        if (showCreate) {
            add { CreatePlaylistCard(onClick = onCreate) }
        }
        playlists.forEach { playlist ->
            add {
                PlaylistCard(
                    playlist = playlist,
                    onClick = { onPlaylistClick(playlist) },
                )
            }
        }
    }
    TwoColumnGrid(cells)
}

@Composable
private fun PlaylistCard(playlist: PlaylistEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(KvRow)
            .clickable(onClick = onClick)
            .padding(10.dp),
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth().aspectRatio(1f)) {
            CoverImage(
                url = null,
                title = playlist.title,
                size = maxWidth,
                cornerRadius = 12.dp,
                initials = true,
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = playlist.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun CreatePlaylistCard(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .dashedBorder(color = KvBorder, cornerRadius = 12.dp)
            .clickable(onClick = onClick)
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(KvRow, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(KvOrange.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = "Tạo playlist",
                    tint = KvOrange,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = "Tạo playlist",
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = KvMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun AlbumGridSection(albums: List<SavedAlbumEntity>, onAlbumClick: (SavedAlbumEntity) -> Unit) {
    val cells = buildList<@Composable () -> Unit> {
        albums.forEach { album ->
            add {
                AlbumCard(
                    album = album,
                    onClick = { onAlbumClick(album) },
                )
            }
        }
    }
    TwoColumnGrid(cells)
}

@Composable
private fun AlbumCard(album: SavedAlbumEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(KvRow)
            .clickable(onClick = onClick)
            .padding(10.dp),
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth().aspectRatio(1f)) {
            CoverImage(
                url = album.coverUrl,
                title = album.title,
                size = maxWidth,
                cornerRadius = 12.dp,
                initials = true,
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = album.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = album.artist,
            fontSize = 11.sp,
            color = KvMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}


@Composable
private fun TwoColumnGrid(columns: List<@Composable () -> Unit>) {
    Column(modifier = Modifier.fillMaxWidth()) {
        columns.chunked(2).forEach { row ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                row.forEach { cell ->
                    Box(modifier = Modifier.weight(1f)) { cell() }
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ArtistRowSection(
    artists: List<FollowedArtistEntity>,
    onArtistClick: (FollowedArtistEntity) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(artists) { artist ->
            Column(
                modifier = Modifier
                    .width(84.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onArtistClick(artist) },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                ArtistAvatar(url = artist.photo, name = artist.name, size = 72.dp)
                Spacer(Modifier.height(6.dp))
                Text(
                    text = artist.name,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ArtistRows(
    artists: List<FollowedArtistEntity>,
    onArtistClick: (FollowedArtistEntity) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        artists.forEach { artist ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onArtistClick(artist) }
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ArtistAvatar(url = artist.photo, name = artist.name, size = 48.dp)
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
                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = KvFaint,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun LikedTrackList(
    liked: List<Track>,
    currentTrackId: String?,
    onPlay: (Track, Int) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        liked.forEachIndexed { index, track ->
            TrackRow(
                track = track,
                index = index + 1,
                isCurrent = track.id == currentTrackId,
                trailing = {
                    Icon(
                        imageVector = Icons.Filled.Favorite,
                        contentDescription = "Đã thích",
                        tint = KvOrange,
                        modifier = Modifier.size(18.dp),
                    )
                },
                onClick = { onPlay(track, index) },
            )
        }
    }
}

@Composable
private fun EmptyState(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(KvRow)
            .padding(vertical = 28.dp, horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            fontSize = 13.sp,
            color = KvMuted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun LibrarySectionSkeleton() {
    Column(modifier = Modifier.fillMaxWidth()) {
        SkeletonBox(
            width = 140.dp,
            height = 18.dp,
            shape = RoundedCornerShape(9.dp),
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(Modifier.height(14.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            repeat(2) {
                Box(modifier = Modifier.weight(1f)) {
                    SkeletonBox(width = 150.dp, height = 150.dp, shape = RoundedCornerShape(12.dp))
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        TrackRowSkeleton()
        TrackRowSkeleton()
    }
}

private fun Modifier.dashedBorder(
    color: Color,
    width: Dp = 1.dp,
    cornerRadius: Dp = 12.dp,
): Modifier = drawBehind {
    val strokeWidth = width.toPx()
    val style = Stroke(
        width = strokeWidth,
        pathEffect = PathEffect.dashPathEffect(
            intervals = floatArrayOf(strokeWidth * 4f, strokeWidth * 4f),
        ),
    )
    drawRoundRect(
        color = color,
        cornerRadius = CornerRadius(cornerRadius.toPx()),
        style = style,
    )
}
