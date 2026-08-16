package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Album
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
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
import com.kvmusic.app.ui.components.PlaylistArtStack
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.AccentSoft
import com.kvmusic.app.ui.theme.ArtA
import com.kvmusic.app.ui.theme.ArtC
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Glass
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.GlassStrong
import com.kvmusic.app.ui.theme.GlyphBg
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.glass
import kotlinx.coroutines.delay

private enum class LibraryFilter(val label: String) {
    ALL("Tất cả"),
    PLAYLISTS("Playlists"),
    ARTISTS("Nghệ sĩ"),
    ALBUMS("Album"),
    LIKED("Đã thích"),
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
    val playlistCounts by container.libraryRepository.playlistCounts()
        .collectAsStateWithLifecycle(initialValue = emptyMap())
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
        contentPadding = PaddingValues(top = 18.dp, bottom = 160.dp),
    ) {
        item {
            Column {
                LibraryTitleRow(onSettings = { AppUi.settingsOpen = true })
                FilterChips(selected = filter, onSelect = { filterName = it.name })
            }
        }

        if (loading) {
            vGap(20.dp)
            item { LibrarySectionSkeleton() }
            vGap(20.dp)
            item { LibrarySectionSkeleton() }
            vGap(20.dp)
            item { LibrarySectionSkeleton() }
        } else when (filter) {
            LibraryFilter.ALL -> {
                vGap(20.dp)
                item {
                    GroupedList(
                        playlistCount = playlists.size,
                        artistCount = followedArtists.size,
                        albumCount = savedAlbums.size,
                        likedCount = likedTracks.size,
                        onPlaylists = { filterName = LibraryFilter.PLAYLISTS.name },
                        onArtists = { filterName = LibraryFilter.ARTISTS.name },
                        onAlbums = { filterName = LibraryFilter.ALBUMS.name },
                        onLiked = { filterName = LibraryFilter.LIKED.name },
                    )
                }
                vGap(20.dp)
                item {
                    SectionHeader(title = "Playlist", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (playlists.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa có playlist — hãy tạo playlist đầu tiên!") }
                } else {
                    vGap(20.dp)
                    item {
                        PlaylistGridSection(
                            playlists = playlists,
                            counts = playlistCounts,
                            showCreate = false,
                            onCreate = {},
                            onPlaylistClick = { nav.navigate(Routes.playlist(it.id.toString())) },
                        )
                    }
                }

                vGap(20.dp)
                item {
                    SectionHeader(title = "Nghệ sĩ", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (followedArtists.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa theo dõi nghệ sĩ nào") }
                } else {
                    vGap(20.dp)
                    item {
                        ArtistRowSection(artists = followedArtists) {
                            nav.navigate(Routes.artist(it.id, it.name))
                        }
                    }
                }

                vGap(20.dp)
                item {
                    SectionHeader(title = "Album", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (savedAlbums.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa lưu album nào") }
                } else {
                    vGap(20.dp)
                    item {
                        AlbumGridSection(albums = savedAlbums) {
                            nav.navigate(Routes.album(it.id))
                        }
                    }
                }

                vGap(20.dp)
                item {
                    SectionHeader(title = "Đã thích", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (likedTracks.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa có bài hát yêu thích — nhấn trái tim để lưu vào đây") }
                } else {
                    vGap(20.dp)
                    likedTrackItems(
                        liked = likedTracks,
                        currentTrackId = currentTrackId,
                        onPlay = { _, index -> player.playQueue(likedTracks, index) },
                    )
                }
            }

            LibraryFilter.PLAYLISTS -> {
                vGap(20.dp)
                item {
                    SectionHeader(title = "Playlist", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (playlists.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa có playlist — hãy tạo playlist đầu tiên!") }
                }
                vGap(20.dp)
                item {
                    PlaylistGridSection(
                        playlists = playlists,
                        counts = playlistCounts,
                        showCreate = true,
                        onCreate = { AppUi.createPlaylistOpen = true },
                        onPlaylistClick = { nav.navigate(Routes.playlist(it.id.toString())) },
                    )
                }
            }

            LibraryFilter.ARTISTS -> {
                vGap(20.dp)
                item {
                    SectionHeader(title = "Nghệ sĩ", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (followedArtists.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa theo dõi nghệ sĩ nào") }
                } else {
                    vGap(20.dp)
                    item {
                        ArtistRows(artists = followedArtists) {
                            nav.navigate(Routes.artist(it.id, it.name))
                        }
                    }
                }
            }

            LibraryFilter.ALBUMS -> {
                vGap(20.dp)
                item {
                    SectionHeader(title = "Album", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (savedAlbums.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa lưu album nào") }
                } else {
                    vGap(20.dp)
                    item {
                        AlbumGridSection(albums = savedAlbums) {
                            nav.navigate(Routes.album(it.id))
                        }
                    }
                }
            }

            LibraryFilter.LIKED -> {
                vGap(20.dp)
                item {
                    SectionHeader(title = "Đã thích", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (likedTracks.isEmpty()) {
                    vGap(20.dp)
                    item { EmptyState("Chưa có bài hát yêu thích — nhấn trái tim để lưu vào đây") }
                } else {
                    vGap(20.dp)
                    likedTrackItems(
                        liked = likedTracks,
                        currentTrackId = currentTrackId,
                        onPlay = { _, index -> player.playQueue(likedTracks, index) },
                    )
                }
            }
        }
    }
}

@Composable
private fun LibraryTitleRow(onSettings: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Thư viện",
            style = LargeTitle,
            color = Fg,
            modifier = Modifier.weight(1f),
        )
        Box(
            modifier = Modifier
                .size(38.dp)
                .glass(CircleShape)
                .clickable(onClick = onSettings),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.Settings,
                contentDescription = "Cài đặt",
                tint = Muted,
                modifier = Modifier.size(22.dp),
            )
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
                fontSize = 14.sp,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                color = if (isSelected) Fg else Fg2,
                modifier = Modifier
                    .clip(KvShapePill)
                    .then(
                        if (isSelected) {
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
                    .clickable { onSelect(filter) }
                    .padding(horizontal = 16.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
private fun GroupedList(
    playlistCount: Int,
    artistCount: Int,
    albumCount: Int,
    likedCount: Int,
    onPlaylists: () -> Unit,
    onArtists: () -> Unit,
    onAlbums: () -> Unit,
    onLiked: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .glass(KvShapeCard)
            .padding(vertical = 4.dp),
    ) {
        GroupRow(icon = Icons.Filled.MusicNote, label = "Playlists", count = playlistCount, onClick = onPlaylists)
        HorizontalDivider(color = Hair, thickness = 0.5.dp)
        GroupRow(icon = Icons.Filled.Person, label = "Nghệ sĩ", count = artistCount, onClick = onArtists)
        HorizontalDivider(color = Hair, thickness = 0.5.dp)
        GroupRow(icon = Icons.Filled.Album, label = "Album", count = albumCount, onClick = onAlbums)
        HorizontalDivider(color = Hair, thickness = 0.5.dp)
        GroupRow(icon = Icons.Filled.Favorite, label = "Đã thích", count = likedCount, onClick = onLiked)
    }
}

@Composable
private fun GroupRow(icon: ImageVector, label: String, count: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .background(GlyphBg, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Fg2,
                modifier = Modifier.size(19.dp),
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = count.toString(),
            fontSize = 13.sp,
            color = Muted,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(modifier = Modifier.width(8.dp))
        Icon(
            imageVector = Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = Faint,
            modifier = Modifier.size(16.dp),
        )
    }
}

@Composable
private fun PlaylistGridSection(
    playlists: List<PlaylistEntity>,
    counts: Map<Long, Int>,
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
                    count = counts[playlist.id] ?: 0,
                    onClick = { onPlaylistClick(playlist) },
                )
            }
        }
    }
    TwoColumnGrid(cells)
}

@Composable
private fun PlaylistCard(
    playlist: PlaylistEntity,
    count: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
    ) {
        PlaylistArtStack()
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = playlist.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(1.dp))
        Text(
            text = "$count bài",
            fontSize = 11.sp,
            color = Muted,
            fontFamily = FontFamily.Monospace,
        )
    }
}

@Composable
private fun CreatePlaylistCard(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .dashedBorder(color = Hair, cornerRadius = 16.dp)
            .clickable(onClick = onClick)
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(
                    Brush.linearGradient(listOf(ArtA, ArtC)),
                    RoundedCornerShape(16.dp),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(AccentSoft, CircleShape),
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
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Tạo playlist",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Muted,
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
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            CoverImage(
                url = album.coverUrl,
                title = album.title,
                size = maxWidth,
                cornerRadius = 16.dp,
                initials = true,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = album.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = album.artist,
            fontSize = 11.sp,
            color = Muted,
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
                    .padding(start = 16.dp, end = 16.dp),
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
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = artist.name,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Fg,
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
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = artist.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = Fg,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = Faint,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

private fun LazyListScope.likedTrackItems(
    liked: List<Track>,
    currentTrackId: String?,
    onPlay: (Track, Int) -> Unit,
) {
    itemsIndexed(liked, key = { _, track -> track.id }) { index, track ->
        GlassTrackRow(
            isFirst = index == 0,
            isLast = index == liked.lastIndex,
            showDivider = index > 0,
        ) {
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
private fun GlassTrackRow(
    isFirst: Boolean,
    isLast: Boolean,
    showDivider: Boolean,
    content: @Composable () -> Unit,
) {
    val shape = when {
        isFirst && isLast -> RoundedCornerShape(20.dp)
        isFirst -> RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
        isLast -> RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)
        else -> RectangleShape
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(shape)
            .background(Color.White.copy(alpha = 0.04f), shape)
            .padding(top = if (isFirst) 4.dp else 0.dp, bottom = if (isLast) 4.dp else 0.dp),
    ) {
        if (showDivider) {
            HorizontalDivider(color = Hair, thickness = 0.5.dp)
        }
        content()
    }
}

private fun LazyListScope.vGap(height: Dp) {
    item { Spacer(modifier = Modifier.height(height)) }
}

@Composable
private fun EmptyState(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .glass(KvShapeCard)
            .padding(vertical = 28.dp, horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            fontSize = 13.sp,
            color = Muted,
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
        Spacer(modifier = Modifier.height(14.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            repeat(2) { index ->
                Box(modifier = Modifier.weight(1f)) {
                    SkeletonBox(
                        width = 150.dp,
                        height = 76.dp,
                        shape = RoundedCornerShape(16.dp),
                        art = true,
                        index = index,
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
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
