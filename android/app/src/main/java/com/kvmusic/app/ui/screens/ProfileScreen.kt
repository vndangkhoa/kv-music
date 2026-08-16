package com.kvmusic.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.local.FollowedArtistEntity
import com.kvmusic.app.data.local.PlaylistEntity
import com.kvmusic.app.data.local.SavedAlbumEntity
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.model.User
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.PlaylistArtStack
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.AccentSoft
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Glass
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.GlassStrong
import com.kvmusic.app.ui.theme.GlyphBg
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.HeroTitle
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvOrange2
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.glass
import kotlinx.coroutines.launch
import org.json.JSONObject

private val LogoutRed = Color(0xFFCF6679)

private enum class ProfileTab { OVERVIEW, LIKES, PLAYLISTS, ARTISTS, ALBUMS, HISTORY }

@Composable
fun ProfileScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val scope = rememberCoroutineScope()
    val nav = LocalNav.current

    val auth by container.authRepository.state.collectAsStateWithLifecycle()
    val playerState by container.playerController.state.collectAsStateWithLifecycle()
    val likedTracks by container.libraryRepository.likedTracks.collectAsStateWithLifecycle(initialValue = emptyList())
    val playlists by container.libraryRepository.playlists.collectAsStateWithLifecycle(initialValue = emptyList())
    val followedArtists by container.libraryRepository.followedArtists.collectAsStateWithLifecycle(initialValue = emptyList())
    val savedAlbums by container.libraryRepository.savedAlbums.collectAsStateWithLifecycle(initialValue = emptyList())
    val history by container.libraryRepository.history.collectAsStateWithLifecycle(initialValue = emptyList())
    val playlistCounts by container.libraryRepository.playlistCounts()
        .collectAsStateWithLifecycle(initialValue = emptyMap())

    var tab by remember { mutableStateOf(ProfileTab.OVERVIEW) }

    val user = auth.user
    if (!auth.isLoggedIn || user == null) {
        LoginPrompt()
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.navigationBars),
        contentPadding = PaddingValues(top = 18.dp, bottom = 160.dp),
    ) {
        item {
            ProfileHeader(
                user = user,
                onSettings = { AppUi.settingsOpen = true },
            )
        }
        item {
            StatsRow(
                likes = likedTracks.size,
                playlists = playlists.size,
                artists = followedArtists.size,
                albums = savedAlbums.size,
            )
        }
        item {
            TabBar(
                active = tab,
                likes = likedTracks.size,
                playlists = playlists.size,
                artists = followedArtists.size,
                albums = savedAlbums.size,
                history = history.size,
                onSelect = { tab = it },
            )
        }

        when (tab) {
            ProfileTab.OVERVIEW -> {
                item {
                    OverviewShortcuts(
                        onCollection = { nav.navigate(Routes.COLLECTION) },
                        onPlaylists = { tab = ProfileTab.PLAYLISTS },
                        onArtists = { tab = ProfileTab.ARTISTS },
                        onAlbums = { tab = ProfileTab.ALBUMS },
                    )
                }
            }
            ProfileTab.LIKES -> {
                if (likedTracks.isEmpty()) {
                    item { TabEmpty("Danh sách bài hát yêu thích trống") }
                } else {
                    glassTrackItems(
                        tracks = likedTracks,
                        currentTrackId = playerState.currentTrack?.id,
                        onClick = { index -> container.playerController.playQueue(likedTracks, index) },
                        trailing = { track ->
                            IconButton(onClick = {
                                scope.launch {
                                    container.libraryRepository.toggleLiked(track)
                                    Toaster.show("Đã bỏ thích")
                                }
                            }) {
                                Icon(
                                    imageVector = Icons.Rounded.Favorite,
                                    contentDescription = "Bỏ thích",
                                    tint = KvOrange,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        },
                    )
                }
            }
            ProfileTab.PLAYLISTS -> {
                if (playlists.isEmpty()) {
                    item { TabEmpty("Chưa có playlist nào") }
                } else {
                    itemsIndexed(playlists.chunked(2)) { _, pair ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            pair.forEach { playlist ->
                                PlaylistGridCard(
                                    playlist = playlist,
                                    count = playlistCounts[playlist.id] ?: 0,
                                    modifier = Modifier.weight(1f),
                                    onClick = { nav.navigate(Routes.playlist(playlist.id.toString())) },
                                )
                            }
                            if (pair.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            ProfileTab.ARTISTS -> {
                if (followedArtists.isEmpty()) {
                    item { TabEmpty("Chưa theo dõi nghệ sĩ nào") }
                } else {
                    itemsIndexed(followedArtists.chunked(3)) { _, pair ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            pair.forEach { artist ->
                                ArtistGridCard(
                                    artist = artist,
                                    modifier = Modifier.weight(1f),
                                    onClick = { nav.navigate(Routes.artist(artist.id, artist.name)) },
                                )
                            }
                            repeat(3 - pair.size) { Spacer(Modifier.weight(1f)) }
                        }
                    }
                }
            }
            ProfileTab.ALBUMS -> {
                if (savedAlbums.isEmpty()) {
                    item { TabEmpty("Chưa lưu album nào") }
                } else {
                    itemsIndexed(savedAlbums.chunked(2)) { _, pair ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            pair.forEach { album ->
                                AlbumGridCard(
                                    album = album,
                                    modifier = Modifier.weight(1f),
                                    onClick = { nav.navigate(Routes.album(album.id)) },
                                )
                            }
                            if (pair.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            ProfileTab.HISTORY -> {
                item {
                    HistoryHeader(
                        count = history.size,
                        onClear = {
                            scope.launch {
                                container.libraryRepository.clearHistory()
                                Toaster.show("Đã xóa lịch sử")
                            }
                        },
                    )
                }
                if (history.isEmpty()) {
                    item { TabEmpty("Chưa có lịch sử nghe") }
                } else {
                    glassTrackItems(
                        tracks = history,
                        currentTrackId = playerState.currentTrack?.id,
                        onClick = { index -> container.playerController.playQueue(history, index) },
                        keyById = false,
                    )
                }
            }
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 24.dp),
                contentAlignment = Alignment.Center,
            ) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            container.authRepository.logout()
                            Toaster.show("Đã đăng xuất")
                        }
                    },
                    shape = RoundedCornerShape(24.dp),
                    border = BorderStroke(1.dp, LogoutRed),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = LogoutRed),
                ) {
                    Text("Đăng xuất", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun LoginPrompt() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier
                .padding(horizontal = 32.dp)
                .fillMaxWidth()
                .glass(KvShapeCard)
                .padding(horizontal = 24.dp, vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(AccentSoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Person,
                    contentDescription = null,
                    tint = KvOrange,
                    modifier = Modifier.size(36.dp),
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Đăng nhập để đồng bộ",
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = Fg,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Đồng bộ thư viện nhạc của bạn trên mọi thiết bị",
                fontSize = 13.sp,
                color = Muted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = { AppUi.loginOpen = true },
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(containerColor = KvOrange),
                modifier = Modifier.height(44.dp),
            ) {
                Text("Đăng nhập / Đăng ký", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ProfileHeader(user: User, onSettings: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ProfileAvatar(user)
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.name,
                style = HeroTitle,
                color = Fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(3.dp))
            Text(
                text = user.email,
                fontSize = 13.sp,
                color = Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Box(
            modifier = Modifier
                .size(38.dp)
                .glass(CircleShape)
                .clickable(onClick = onSettings),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.Settings,
                contentDescription = "Cài Đặt",
                tint = Muted,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun ProfileAvatar(user: User) {
    val (from, to) = remember(user.avatar_color) { parseAvatarGradient(user.avatar_color) }
    Box(
        modifier = Modifier
            .size(80.dp)
            .glass(CircleShape)
            .padding(4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(from, to)))
                .border(1.dp, GlassBorder, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = nameInitials(user.name),
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Fg,
            )
        }
    }
}

@Composable
private fun StatsRow(likes: Int, playlists: Int, artists: Int, albums: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .padding(horizontal = 16.dp)
            .padding(top = 14.dp),
    ) {
        StatCell(value = likes, label = "Đã thích", modifier = Modifier.weight(1f))
        VerticalDivider()
        StatCell(value = playlists, label = "Playlist", modifier = Modifier.weight(1f))
        VerticalDivider()
        StatCell(value = artists, label = "Nghệ sĩ", modifier = Modifier.weight(1f))
        VerticalDivider()
        StatCell(value = albums, label = "Album", modifier = Modifier.weight(1f))
    }
}

@Composable
private fun StatCell(value: Int, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = value.toString(),
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Fg,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(Modifier.height(4.dp))
        Text(text = label, fontSize = 11.sp, color = Muted)
    }
}

@Composable
private fun VerticalDivider() {
    Box(
        modifier = Modifier
            .fillMaxHeight()
            .width(1.dp)
            .background(Hair),
    )
}

@Composable
private fun TabBar(
    active: ProfileTab,
    likes: Int,
    playlists: Int,
    artists: Int,
    albums: Int,
    history: Int,
    onSelect: (ProfileTab) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        listOf(
            ProfileTab.OVERVIEW to "Tổng quan",
            ProfileTab.LIKES to "Đã thích ($likes)",
            ProfileTab.PLAYLISTS to "Playlist ($playlists)",
            ProfileTab.ARTISTS to "Nghệ sĩ ($artists)",
            ProfileTab.ALBUMS to "Album ($albums)",
            ProfileTab.HISTORY to "Lịch sử ($history)",
        ).forEach { (tab, label) ->
            val selected = tab == active
            Text(
                text = label,
                fontSize = 14.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                color = if (selected) Fg else Fg2,
                modifier = Modifier
                    .clip(KvShapePill)
                    .then(
                        if (selected) {
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
                    .clickable { onSelect(tab) }
                    .padding(horizontal = 16.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
private fun OverviewShortcuts(
    onCollection: () -> Unit,
    onPlaylists: () -> Unit,
    onArtists: () -> Unit,
    onAlbums: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .glass(KvShapeCard)
            .padding(vertical = 4.dp),
    ) {
        ShortcutRow(icon = Icons.Rounded.Favorite, label = "Bài hát đã thích", onClick = onCollection)
        HorizontalDivider(color = Hair, thickness = 0.5.dp)
        ShortcutRow(icon = Icons.Rounded.QueueMusic, label = "Playlist", onClick = onPlaylists)
        HorizontalDivider(color = Hair, thickness = 0.5.dp)
        ShortcutRow(icon = Icons.Rounded.Person, label = "Nghệ sĩ", onClick = onArtists)
        HorizontalDivider(color = Hair, thickness = 0.5.dp)
        ShortcutRow(icon = Icons.Rounded.MusicNote, label = "Album", onClick = onAlbums)
    }
}

@Composable
private fun ShortcutRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
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
            Icon(icon, contentDescription = null, tint = KvOrange, modifier = Modifier.size(19.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(
            text = label,
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Icons.Rounded.ChevronRight,
            contentDescription = null,
            tint = Faint,
            modifier = Modifier.size(16.dp),
        )
    }
}

private fun LazyListScope.glassTrackItems(
    tracks: List<Track>,
    currentTrackId: String?,
    onClick: (Int) -> Unit,
    keyById: Boolean = true,
    trailing: @Composable (Track) -> Unit = {},
) {
    itemsIndexed(
        items = tracks,
        key = if (keyById) { _, track -> track.id } else null,
    ) { index, track ->
        GlassTrackRow(
            isFirst = index == 0,
            isLast = index == tracks.lastIndex,
            showDivider = index > 0,
        ) {
            TrackRow(
                track = track,
                isCurrent = currentTrackId == track.id,
                trailing = { trailing(track) },
                onClick = { onClick(index) },
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

@Composable
private fun PlaylistGridCard(
    playlist: PlaylistEntity,
    count: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(Color.White.copy(alpha = 0.05f), shape)
            .border(0.5.dp, GlassBorder, shape)
            .clickable(onClick = onClick)
            .padding(8.dp),
    ) {
        PlaylistArtStack()
        Spacer(Modifier.height(8.dp))
        Text(
            text = playlist.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = "$count bài",
            fontSize = 11.sp,
            color = Muted,
            fontFamily = FontFamily.Monospace,
        )
    }
}

@Composable
private fun ArtistGridCard(artist: FollowedArtistEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(Color.White.copy(alpha = 0.05f), shape)
            .border(0.5.dp, GlassBorder, shape)
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ArtistAvatar(url = artist.photo, name = artist.name, size = 72.dp)
        Spacer(Modifier.height(8.dp))
        Text(
            text = artist.name,
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
private fun AlbumGridCard(album: SavedAlbumEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(Color.White.copy(alpha = 0.05f), shape)
            .border(0.5.dp, GlassBorder, shape)
            .clickable(onClick = onClick)
            .padding(8.dp),
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            CoverImage(
                url = album.coverUrl,
                title = album.title,
                size = maxWidth,
                cornerRadius = 12.dp,
                initials = true,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = album.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
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
private fun HistoryHeader(count: Int, onClear: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Lịch sử nghe",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Fg,
            modifier = Modifier.weight(1f),
        )
        if (count > 0) {
            Text(
                text = "Xóa lịch sử",
                fontSize = 12.sp,
                color = LogoutRed,
                modifier = Modifier.clickable(onClick = onClear),
            )
        }
    }
}

@Composable
private fun TabEmpty(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .glass(KvShapeCard)
            .padding(horizontal = 16.dp, vertical = 28.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = message, fontSize = 13.sp, color = Muted)
    }
}

private fun parseAvatarGradient(raw: String): Pair<Color, Color> {
    val fallback = KvOrange to KvOrange2
    if (raw.isBlank()) return fallback
    return try {
        val json = JSONObject(raw)
        val from = json.optString("from", "").toColorOrNull() ?: KvOrange
        val to = json.optString("to", "").toColorOrNull() ?: KvOrange2
        from to to
    } catch (_: Exception) {
        fallback
    }
}

private fun String.toColorOrNull(): Color? =
    try {
        Color(android.graphics.Color.parseColor(this))
    } catch (_: Exception) {
        null
    }

private fun nameInitials(name: String): String {
    val words = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    val initials = words.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
    return initials.ifEmpty { "♪" }
}
