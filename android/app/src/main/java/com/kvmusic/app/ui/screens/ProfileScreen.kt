package com.kvmusic.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import com.kvmusic.app.data.model.User
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvOrange2
import com.kvmusic.app.ui.theme.KvRow
import com.kvmusic.app.ui.theme.glassCard
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

    var tab by remember { mutableStateOf(ProfileTab.OVERVIEW) }

    val user = auth.user
    if (!auth.isLoggedIn || user == null) {
        LoginPrompt()
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
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
                    itemsIndexed(likedTracks, key = { _, track -> track.id }) { index, track ->
                        TrackRow(
                            track = track,
                            isCurrent = playerState.currentTrack?.id == track.id,
                            trailing = {
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
                            onClick = { container.playerController.playQueue(likedTracks, index) },
                        )
                    }
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
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Lịch sử nghe",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.weight(1f),
                        )
                        if (history.isNotEmpty()) {
                            Text(
                                text = "Xóa lịch sử",
                                fontSize = 12.sp,
                                color = KvMuted,
                                modifier = Modifier.clickable {
                                    scope.launch {
                                        container.libraryRepository.clearHistory()
                                        Toaster.show("Đã xóa lịch sử")
                                    }
                                },
                            )
                        }
                    }
                }
                if (history.isEmpty()) {
                    item { TabEmpty("Chưa có lịch sử nghe") }
                } else {
                    itemsIndexed(history, key = { index, track -> "h-$index-${track.id}" }) { index, track ->
                        TrackRow(
                            track = track,
                            isCurrent = playerState.currentTrack?.id == track.id,
                            onClick = { container.playerController.playQueue(history, index) },
                        )
                    }
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
                .glassCard(rounded = 20.dp)
                .padding(horizontal = 24.dp, vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Rounded.Person,
                contentDescription = null,
                tint = KvMuted,
                modifier = Modifier.size(64.dp),
            )
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Đăng nhập để đồng bộ",
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Đồng bộ thư viện nhạc của bạn trên mọi thiết bị",
                fontSize = 13.sp,
                color = KvMuted,
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
            .padding(start = 16.dp, end = 8.dp, top = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ProfileAvatar(user)
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.name,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(3.dp))
            Text(
                text = user.email,
                fontSize = 13.sp,
                color = KvMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = onSettings) {
            Icon(
                imageVector = Icons.Rounded.Settings,
                contentDescription = "Cài Đặt",
                tint = Color.White,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

@Composable
private fun ProfileAvatar(user: User) {
    val (from, to) = remember(user.avatar_color) { parseAvatarGradient(user.avatar_color) }
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(from, to)))
            .border(3.dp, KvOrange, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = nameInitials(user.name),
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color.White,
        )
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
            color = Color.White,
        )
        Spacer(Modifier.height(4.dp))
        Text(text = label, fontSize = 11.sp, color = KvMuted)
    }
}

@Composable
private fun VerticalDivider() {
    Box(
        modifier = Modifier
            .fillMaxHeight()
            .width(1.dp)
            .background(KvBorder),
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
            val shape = RoundedCornerShape(50)
            Box(
                modifier = Modifier
                    .clip(shape)
                    .background(if (selected) KvOrange else KvRow)
                    .then(if (selected) Modifier else Modifier.border(1.dp, KvBorder, shape))
                    .clickable { onSelect(tab) }
                    .padding(horizontal = 14.dp, vertical = 7.dp),
            ) {
                Text(
                    text = label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (selected) Color.White else KvMuted,
                )
            }
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
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        ShortcutRow(icon = Icons.Rounded.Favorite, label = "Bài hát đã thích", onClick = onCollection)
        ShortcutRow(icon = Icons.Rounded.QueueMusic, label = "Playlist", onClick = onPlaylists)
        ShortcutRow(icon = Icons.Rounded.Person, label = "Nghệ sĩ", onClick = onArtists)
        ShortcutRow(icon = Icons.Rounded.MusicNote, label = "Album", onClick = onAlbums)
    }
}

@Composable
private fun ShortcutRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .glassCard(rounded = 14.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = KvOrange, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(
            text = label,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Icons.Rounded.ChevronRight,
            contentDescription = null,
            tint = KvFaint,
            modifier = Modifier.size(20.dp),
        )
    }
}

@Composable
private fun PlaylistGridCard(playlist: PlaylistEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
            contentAlignment = Alignment.Center,
        ) {
            CoverImage(url = null, title = playlist.title, size = 110.dp, cornerRadius = 12.dp, initials = true)
        }
        Spacer(Modifier.height(8.dp))
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
private fun ArtistGridCard(artist: FollowedArtistEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ArtistAvatar(url = artist.photo, name = artist.name, size = 72.dp)
        Spacer(Modifier.height(8.dp))
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

@Composable
private fun AlbumGridCard(album: SavedAlbumEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
            contentAlignment = Alignment.Center,
        ) {
            CoverImage(url = album.coverUrl, title = album.title, size = 110.dp, cornerRadius = 12.dp, initials = true)
        }
        Spacer(Modifier.height(8.dp))
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
private fun TabEmpty(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = message, fontSize = 13.sp, color = KvMuted)
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
