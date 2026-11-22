package com.kvmusic.app.ui.screens.library

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.data.repository.PlaylistManager
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.CreatePlaylistDialog
import com.kvmusic.app.ui.components.TrackListItem
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.*

private val libraryFilterChips = listOf(
    "Playlists",
    "Songs",
    "Albums",
    "Artists",
    "Downloads"
)

private enum class LibrarySortMode(val label: String) {
    RECENT_ACTIVITY("Recent activity"),
    TITLE_AZ("A–Z"),
    ARTIST_AZ("Artist")
}

@Composable
fun LibraryScreen(
    authRepo: AuthRepository,
    modifier: Modifier = Modifier,
    onNavigateSearch: () -> Unit = {},
    onNavigateSettings: () -> Unit = {},
    onArtistClick: (name: String, avatarUrl: String, subtitle: String) -> Unit = { _, _, _ -> },
    onPlaylistClick: (id: String, title: String, coverUrl: String, subtitle: String) -> Unit = { _, _, _, _ -> }
) {
    val context = LocalContext.current
    val currentUser by authRepo.currentUser.collectAsState()
    val likedIds by PlayerManager.likedTrackIds.collectAsState()
    val historyTracks by PlayerManager.recentlyPlayedHistory.collectAsState()
    val persistedDownloads by PlayerManager.downloadedTracks.collectAsState()
    val downloadProgress by PlayerManager.downloadProgress.collectAsState()
    val totalDownloadBytes by PlayerManager.totalDownloadBytes.collectAsState()
    val currentTrack by PlayerManager.currentTrack.collectAsState()
    val queueTracks by PlayerManager.queue.collectAsState()

    var activeFilter by remember { mutableStateOf<String?>(null) }
    var sortMode by remember { mutableStateOf(LibrarySortMode.RECENT_ACTIVITY) }
    var showCreatePlaylistDialog by remember { mutableStateOf(false) }
    var showInlineFilter by remember { mutableStateOf(false) }
    var inlineFilterQuery by remember { mutableStateOf("") }
    var showLikedCollectionOnly by remember { mutableStateOf(false) }
    var showScopeMenu by remember { mutableStateOf(false) }

    val userPlaylists by PlaylistManager.playlists.collectAsState()

    val displayedPlaylists = remember(userPlaylists, sortMode, inlineFilterQuery) {
        val filtered = if (inlineFilterQuery.isBlank()) {
            userPlaylists
        } else {
            val q = inlineFilterQuery.trim()
            userPlaylists.filter { it.name.contains(q, ignoreCase = true) }
        }
        when (sortMode) {
            LibrarySortMode.RECENT_ACTIVITY -> filtered
            LibrarySortMode.TITLE_AZ, LibrarySortMode.ARTIST_AZ -> filtered.sortedBy { it.name.lowercase() }
        }
    }

    val allKnownTracks = remember(historyTracks, queueTracks, persistedDownloads, currentTrack, currentUser) {
        (persistedDownloads + historyTracks + queueTracks + listOfNotNull(currentTrack) + (currentUser?.liked ?: emptyList()) + (currentUser?.history ?: emptyList()))
            .distinctBy { it.id }
    }

    val likedTracks = remember(allKnownTracks, likedIds) {
        allKnownTracks.filter { likedIds.contains(it.id) }
    }

    val downloadedTracks = persistedDownloads

    fun applySortAndQuery(tracks: List<Track>): List<Track> {
        val filtered = if (inlineFilterQuery.isBlank()) {
            tracks
        } else {
            val q = inlineFilterQuery.trim()
            tracks.filter {
                it.title.contains(q, ignoreCase = true) ||
                    it.artist.contains(q, ignoreCase = true) ||
                    it.album.contains(q, ignoreCase = true)
            }
        }
        return when (sortMode) {
            LibrarySortMode.RECENT_ACTIVITY -> filtered
            LibrarySortMode.TITLE_AZ -> filtered.sortedBy { it.title.lowercase() }
            LibrarySortMode.ARTIST_AZ -> filtered.sortedBy { it.artist.lowercase() }
        }
    }

    val displayedSongs = remember(likedTracks, historyTracks, sortMode, inlineFilterQuery) {
        applySortAndQuery((likedTracks + historyTracks).distinctBy { it.id })
    }
    val displayedDownloads = remember(downloadedTracks, sortMode, inlineFilterQuery) {
        applySortAndQuery(downloadedTracks)
    }
    val displayedHistory = remember(historyTracks, sortMode, inlineFilterQuery) {
        applySortAndQuery(historyTracks)
    }

    val albumGroups = remember(allKnownTracks, inlineFilterQuery, sortMode) {
        val base = applySortAndQuery(allKnownTracks)
        base.groupBy { it.album.ifBlank { it.title } }
            .entries
            .map { (albumTitle, items) ->
                val lead = items.first()
                Triple(albumTitle, lead, items)
            }
    }

    val artistGroups = remember(allKnownTracks, inlineFilterQuery, sortMode) {
        val base = applySortAndQuery(allKnownTracks)
        base.filter { it.artist.isNotBlank() }
            .groupBy { it.artist }
            .entries
            .map { (artistName, items) -> artistName to items }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(YtmPureBlack)
    ) {
        // 1. Top Bar (library_browse_fragment)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable { showScopeMenu = true }
                        .padding(vertical = 2.dp)
                ) {
                    Text(
                        text = if (activeFilter == "Downloads") "Downloads" else "Library",
                        style = TextStyle(
                            fontFamily = YouTubeSansFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 24.sp,
                            letterSpacing = (-0.04).em,
                            color = YtmWhite
                        )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = YtmIcons.ChevronDown18,
                        contentDescription = "Switch library scope",
                        tint = YtmWhite,
                        modifier = Modifier.size(18.dp)
                    )
                }

                DropdownMenu(
                    expanded = showScopeMenu,
                    onDismissRequest = { showScopeMenu = false },
                    modifier = Modifier.background(YtmGrey12)
                ) {
                    DropdownMenuItem(
                        text = { Text("Library", color = YtmWhite) },
                        onClick = {
                            activeFilter = null
                            showLikedCollectionOnly = false
                            showScopeMenu = false
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Downloads", color = YtmWhite) },
                        onClick = {
                            activeFilter = "Downloads"
                            showLikedCollectionOnly = false
                            showScopeMenu = false
                        }
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                IconButton(
                    onClick = {
                        if (allKnownTracks.isNotEmpty()) {
                            showInlineFilter = !showInlineFilter
                            if (!showInlineFilter) inlineFilterQuery = ""
                        } else {
                            onNavigateSearch()
                        }
                    },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = YtmIcons.SearchOutline,
                        contentDescription = "Search library",
                        tint = YtmWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }

                IconButton(
                    onClick = { showCreatePlaylistDialog = true },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = YtmIcons.Add24,
                        contentDescription = "New playlist",
                        tint = YtmWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .clickable { onNavigateSettings() },
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(YtmRedAccent)
                            .border(1.dp, YtmWhite20, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        val initial = currentUser?.name?.firstOrNull()?.uppercaseChar()?.toString()
                        if (initial != null) {
                            Text(
                                text = initial,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = YtmPureWhite
                            )
                        } else {
                            Icon(
                                imageVector = YtmIcons.PersonAudio24,
                                contentDescription = "Account & Settings",
                                tint = YtmPureWhite,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }

        // Optional inline library filter search bar
        if (showInlineFilter) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .height(40.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(YtmGrey10)
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = YtmIcons.SearchOutline,
                    contentDescription = null,
                    tint = YtmWhite67,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Box(modifier = Modifier.weight(1f)) {
                    if (inlineFilterQuery.isEmpty()) {
                        Text("Filter your library...", fontSize = 14.sp, color = YtmWhite67)
                    }
                    BasicTextField(
                        value = inlineFilterQuery,
                        onValueChange = { inlineFilterQuery = it },
                        singleLine = true,
                        textStyle = TextStyle(fontSize = 14.sp, color = YtmWhite),
                        cursorBrush = SolidColor(YtmWhite),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                if (inlineFilterQuery.isNotEmpty()) {
                    IconButton(
                        onClick = { inlineFilterQuery = "" },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = YtmIcons.CloseX24,
                            contentDescription = "Clear filter",
                            tint = YtmWhite67,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // 2. Filter Chip Bar (32.dp height, 8.dp radius)
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(libraryFilterChips) { chip ->
                val isSelected = activeFilter == chip
                Surface(
                    onClick = {
                        activeFilter = if (isSelected) null else chip
                        showLikedCollectionOnly = false
                    },
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) YtmWhite else YtmWhite10,
                    border = if (isSelected) null else BorderStroke(1.dp, YtmWhite08),
                    modifier = Modifier.height(32.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    ) {
                        Text(
                            text = chip,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (isSelected) YtmPureBlack else YtmWhite
                        )
                    }
                }
            }
        }

        // 3. Secondary sort header ("Recent activity", Sort24 18.dp + 14.sp Medium YtmWhite)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable {
                    val values = LibrarySortMode.entries
                    sortMode = values[(sortMode.ordinal + 1) % values.size]
                }
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = YtmIcons.Sort24,
                contentDescription = "Sort",
                tint = YtmWhite,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = sortMode.label,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = YtmWhite
            )
            Spacer(modifier = Modifier.width(4.dp))
            Icon(
                imageVector = YtmIcons.ChevronDown18,
                contentDescription = null,
                tint = YtmWhite67,
                modifier = Modifier.size(16.dp)
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 28.dp)
        ) {
            if (showLikedCollectionOnly) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Liked Music (${likedTracks.size})",
                            style = YtmDisplay02
                        )
                        TextButton(onClick = { showLikedCollectionOnly = false }) {
                            Text("All library", color = YtmWhite67, fontSize = 13.sp)
                        }
                    }
                }

                if (likedTracks.isEmpty()) {
                    item {
                        EmptyLibraryNotice(
                            text = "Songs you like with the thumbs-up or heart icon will appear here."
                        )
                    }
                } else {
                    items(likedTracks) { track ->
                        TrackListItem(
                            track = track,
                            onTrackClick = { PlayerManager.playTrack(track, likedTracks) },
                            isLiked = true,
                            onLikeClick = { PlayerManager.toggleLike(track.id) }
                        )
                    }
                }
            } else {
                // Pinned "Liked Music" auto-playlist row (shown in Overview & Playlists)
                if (activeFilter == null || activeFilter == "Playlists") {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showLikedCollectionOnly = true }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(
                                        Brush.linearGradient(
                                            colors = listOf(Color(0xFF42152E), YtmRedAccent)
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = YtmIcons.ThumbUpFilled,
                                    contentDescription = "Liked Music",
                                    tint = YtmPureWhite,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Liked Music",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = YtmWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = YtmIcons.Pin24,
                                        contentDescription = "Pinned",
                                        tint = YtmWhite67,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (likedTracks.isEmpty()) "Auto playlist" else "Auto playlist • ${likedTracks.size} songs",
                                        fontSize = 13.sp,
                                        color = YtmWhite67,
                                        maxLines = 1
                                    )
                                }
                            }

                            if (likedTracks.isNotEmpty()) {
                                IconButton(
                                    onClick = { PlayerManager.playTrack(likedTracks.first(), likedTracks) }
                                ) {
                                    Icon(
                                        imageVector = YtmIcons.PlayCircle24,
                                        contentDescription = "Play Liked Music",
                                        tint = YtmWhite,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                        }
                    }

                    // User-created & saved playlists
                    items(displayedPlaylists) { playlist ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onPlaylistClick(
                                        playlist.id,
                                        playlist.name,
                                        playlist.coverUrl,
                                        "Your playlist"
                                    )
                                }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(YtmGrey10),
                                contentAlignment = Alignment.Center
                            ) {
                                val cover = playlist.coverUrl.ifBlank {
                                    playlist.tracks.firstOrNull()?.coverUrl.orEmpty()
                                }
                                if (cover.isNotBlank()) {
                                    AsyncImage(
                                        model = cover,
                                        contentDescription = playlist.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Icon(
                                        imageVector = YtmIcons.Mix24,
                                        contentDescription = null,
                                        tint = YtmWhite67,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = playlist.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = YtmWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                val count = playlist.tracks.size
                                Text(
                                    text = "Playlist • $count ${if (count == 1) "song" else "songs"}",
                                    fontSize = 13.sp,
                                    color = YtmWhite67,
                                    maxLines = 1
                                )
                            }

                            if (playlist.tracks.isNotEmpty()) {
                                IconButton(
                                    onClick = {
                                        PlayerManager.playTrack(playlist.tracks.first(), playlist.tracks)
                                    }
                                ) {
                                    Icon(
                                        imageVector = YtmIcons.PlayCircle24,
                                        contentDescription = "Play ${playlist.name}",
                                        tint = YtmWhite,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }

                            IconButton(
                                onClick = {
                                    PlaylistManager.deletePlaylist(playlist.id)
                                    Toast.makeText(context, "Deleted '${playlist.name}'", Toast.LENGTH_SHORT).show()
                                }
                            ) {
                                Icon(
                                    imageVector = YtmIcons.CloseX24,
                                    contentDescription = "Remove playlist",
                                    tint = YtmWhite67,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }

                    // New playlist quick row
                    if (activeFilter == null || activeFilter == "Playlists") {
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { showCreatePlaylistDialog = true }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(YtmGrey10),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = YtmIcons.Add24,
                                        contentDescription = "Create playlist",
                                        tint = YtmWhite,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Text(
                                    text = "New playlist",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = YtmWhite
                                )
                            }
                        }
                    }
                }

                // Downloads section
                if (activeFilter == null || activeFilter == "Downloads") {
                    if (activeFilter == "Downloads" || displayedDownloads.isNotEmpty() || downloadProgress.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(12.dp))
                            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                                Text(
                                    text = if (downloadProgress.isNotEmpty()) {
                                        "Downloads (${displayedDownloads.size}) • Downloading ${downloadProgress.size}..."
                                    } else {
                                        "Downloads (${displayedDownloads.size})"
                                    },
                                    style = YtmTitle03
                                )
                                if (displayedDownloads.isNotEmpty()) {
                                    val sizeMb = totalDownloadBytes / (1024f * 1024f)
                                    Text(
                                        text = String.format(java.util.Locale.getDefault(), "Saved offline & in Music/KV Music • %.1f MB", sizeMb),
                                        style = YtmSubtitle01,
                                        color = YtmWhite67
                                    )
                                }
                            }
                        }

                        if (displayedDownloads.isEmpty()) {
                            item {
                                EmptyLibraryNotice(
                                    text = "No offline tracks saved yet. Tap Download on any song or album to save it to your phone (Music/KV Music)."
                                )
                            }
                        } else {
                            items(displayedDownloads) { track ->
                                TrackListItem(
                                    track = track,
                                    onTrackClick = { PlayerManager.playTrack(track, displayedDownloads) },
                                    isLiked = likedIds.contains(track.id),
                                    onLikeClick = { PlayerManager.toggleLike(track.id) }
                                )
                            }
                        }
                    }
                }

                // Songs section
                if (activeFilter == "Songs") {
                    if (displayedSongs.isEmpty()) {
                        item {
                            EmptyLibraryNotice(
                                text = "Your played and liked songs will appear here."
                            )
                        }
                    } else {
                        items(displayedSongs) { track ->
                            TrackListItem(
                                track = track,
                                onTrackClick = { PlayerManager.playTrack(track, displayedSongs) },
                                isLiked = likedIds.contains(track.id),
                                onLikeClick = { PlayerManager.toggleLike(track.id) }
                            )
                        }
                    }
                }

                // Albums section
                if (activeFilter == "Albums") {
                    if (albumGroups.isEmpty()) {
                        item {
                            EmptyLibraryNotice(
                                text = "Albums from your listening history and likes will appear here."
                            )
                        }
                    } else {
                        items(albumGroups) { (albumTitle, lead, items) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { PlayerManager.playTrack(lead, items) }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                AsyncImage(
                                    model = lead.coverUrl,
                                    contentDescription = albumTitle,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(YtmGrey10)
                                )
                                Spacer(modifier = Modifier.width(14.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = albumTitle,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = YtmWhite,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Album • ${lead.artist}",
                                        fontSize = 13.sp,
                                        color = YtmWhite67,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }

                // Artists section
                if (activeFilter == "Artists") {
                    if (artistGroups.isEmpty()) {
                        item {
                            EmptyLibraryNotice(
                                text = "Artists you listen to will appear here."
                            )
                        }
                    } else {
                        items(artistGroups) { (artistName, items) ->
                            val lead = items.first()
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        onArtistClick(
                                            artistName,
                                            lead.coverUrl,
                                            "${items.size} songs in library"
                                        )
                                        PlayerManager.playTrack(lead, items)
                                    }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                AsyncImage(
                                    model = lead.coverUrl,
                                    contentDescription = artistName,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(YtmGrey10)
                                )
                                Spacer(modifier = Modifier.width(14.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = artistName,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = YtmWhite,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Artist • ${items.size} songs",
                                        fontSize = 13.sp,
                                        color = YtmWhite67,
                                        maxLines = 1
                                    )
                                }
                            }
                        }
                    }
                }

                // Recently played history in default Overview
                if (activeFilter == null) {
                    item {
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Recently played",
                            style = YtmTitle03,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }

                    if (displayedHistory.isEmpty()) {
                        item {
                            EmptyLibraryNotice(
                                text = "No listening history yet. Play any track from Home or Explore to build your library."
                            )
                        }
                    } else {
                        items(displayedHistory) { track ->
                            TrackListItem(
                                track = track,
                                onTrackClick = { PlayerManager.playTrack(track, displayedHistory) },
                                isLiked = likedIds.contains(track.id),
                                onLikeClick = { PlayerManager.toggleLike(track.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showCreatePlaylistDialog) {
        CreatePlaylistDialog(
            title = "New playlist",
            confirmLabel = "Create",
            onDismiss = { showCreatePlaylistDialog = false },
            onConfirm = { trimmed ->
                if (trimmed.isNotEmpty()) {
                    val created = PlaylistManager.createPlaylist(trimmed)
                    showCreatePlaylistDialog = false
                    Toast.makeText(context, "Created '${created.name}'", Toast.LENGTH_SHORT).show()
                    onPlaylistClick(created.id, created.name, created.coverUrl, "Your playlist")
                }
            }
        )
    }
}

@Composable
private fun EmptyLibraryNotice(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 20.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Text(
            text = text,
            style = YtmSubtitle01
        )
    }
}
