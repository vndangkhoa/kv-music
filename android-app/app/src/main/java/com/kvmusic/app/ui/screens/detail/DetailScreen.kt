package com.kvmusic.app.ui.screens.detail

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.data.repository.PlaylistManager
import com.kvmusic.app.player.AudioCacheManager
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.CreatePlaylistDialog
import com.kvmusic.app.ui.components.TrackListItem
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun DetailScreen(
    id: String,
    title: String,
    coverUrl: String,
    subtitle: String,
    type: String, // "album", "playlist", "artist"
    musicRepo: MusicRepository,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var tracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showInlineSearch by remember { mutableStateOf(false) }
    var filterQuery by remember { mutableStateOf("") }
    var showOverflowMenu by remember { mutableStateOf(false) }

    var showAddSongsPanel by remember(id) { mutableStateOf(false) }
    var addSongQuery by remember(id) { mutableStateOf("") }
    var addSongResults by remember(id) { mutableStateOf<List<Track>>(emptyList()) }
    var isSearchingAddSongs by remember(id) { mutableStateOf(false) }
    var showRenameDialog by remember { mutableStateOf(false) }

    val likedIds by PlayerManager.likedTrackIds.collectAsState()
    val downloadedIds by PlayerManager.downloadedTrackIds.collectAsState()
    val localPlaylists by PlaylistManager.playlists.collectAsState()
    val localPlaylist = remember(localPlaylists, id) { localPlaylists.firstOrNull { it.id == id } }
    val isLocalUserPlaylist = localPlaylist != null

    val displayTitle = localPlaylist?.name ?: title
    val displayCover = localPlaylist?.coverUrl?.takeIf { it.isNotBlank() }
        ?: localPlaylist?.tracks?.firstOrNull()?.coverUrl?.takeIf { it.isNotBlank() }
        ?: coverUrl

    LaunchedEffect(id, title, type, localPlaylist) {
        if (localPlaylist != null) {
            tracks = localPlaylist.tracks
            isLoading = false
            return@LaunchedEffect
        }
        isLoading = true
        val query = title.ifEmpty { id }
        val res = musicRepo.search(query)
        val found = if (res.isSuccess) res.getOrDefault(emptyList()) else emptyList()
        tracks = if (found.isNotEmpty()) {
            found
        } else {
            musicRepo.universalSearch(query).getOrNull()?.songs ?: emptyList()
        }
        if (tracks.isNotEmpty()) {
            AudioCacheManager.preloadTracks(context, tracks, maxCount = 3)
        }
        isLoading = false
    }

    val filteredTracks = remember(tracks, filterQuery) {
        if (filterQuery.isBlank()) tracks
        else {
            val q = filterQuery.trim()
            tracks.filter {
                it.title.contains(q, ignoreCase = true) ||
                    it.artist.contains(q, ignoreCase = true)
            }
        }
    }

    val isArtist = !isLocalUserPlaylist && type.equals("artist", ignoreCase = true)
    val typeLabel = when {
        isLocalUserPlaylist -> "Your playlist"
        isArtist -> "Artist"
        type.equals("album", ignoreCase = true) -> "Album"
        else -> "Playlist"
    }
    val headerSubtitle = remember(typeLabel, subtitle, tracks.size) {
        if (subtitle.isNotBlank() && isArtist) {
            "$typeLabel • $subtitle • ${tracks.size} songs"
        } else {
            "$typeLabel • ${tracks.size} ${if (tracks.size == 1) "song" else "songs"}"
        }
    }
    val allDownloaded = tracks.isNotEmpty() && tracks.all { downloadedIds.contains(it.id) }

    fun shareEntity() {
        val shareUrl = "https://sp.khoavo.myds.me/track/${id}"
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, "Check out '$displayTitle' on KV Music:\n$shareUrl")
            setType("text/plain")
        }
        context.startActivity(Intent.createChooser(sendIntent, "Share $typeLabel"))
    }

    fun saveToLibraryPlaylist() {
        val saved = PlaylistManager.saveExternalPlaylist(
            id = id,
            name = title,
            coverUrl = coverUrl,
            tracks = tracks
        )
        Toast.makeText(context, "Saved '${saved.name}' to Library", Toast.LENGTH_SHORT).show()
    }

    fun searchSongsToAdd() {
        val q = addSongQuery.trim()
        if (q.isEmpty() || isSearchingAddSongs) return
        coroutineScope.launch {
            isSearchingAddSongs = true
            val res = musicRepo.search(q)
            val songs = res.getOrDefault(emptyList())
            addSongResults = if (songs.isNotEmpty()) {
                songs.take(15)
            } else {
                musicRepo.universalSearch(q).getOrNull()?.songs?.take(15) ?: emptyList()
            }
            isSearchingAddSongs = false
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(YtmPureBlack)
    ) {
        if (isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .padding(horizontal = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = YtmIcons.ArrowLeft24,
                            contentDescription = "Back",
                            tint = YtmWhite,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        color = YtmWhite,
                        strokeWidth = 2.5.dp,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 28.dp)
            ) {
                // Header: ambient blurred/gradient backdrop + centered 200dp artwork + metadata + 5-button circular action row
                item {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        // Top ambient blurred artwork backdrop
                        if (coverUrl.isNotBlank()) {
                            AsyncImage(
                                model = coverUrl,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(410.dp)
                                    .alpha(0.40f)
                                    .blur(40.dp)
                            )
                        }

                        // Scrim fading cleanly into YtmPureBlack
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(420.dp)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color(0x66000000),
                                            Color(0x99000000),
                                            YtmPureBlack.copy(alpha = 0.88f),
                                            YtmPureBlack
                                        )
                                    )
                                )
                        )

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Top navigation bar
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp)
                                    .padding(horizontal = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(onClick = onBack) {
                                    Icon(
                                        imageVector = YtmIcons.ArrowLeft24,
                                        contentDescription = "Back",
                                        tint = YtmWhite,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(
                                        onClick = {
                                            showInlineSearch = !showInlineSearch
                                            if (!showInlineSearch) filterQuery = ""
                                        }
                                    ) {
                                        Icon(
                                            imageVector = YtmIcons.SearchOutline,
                                            contentDescription = "Filter tracks",
                                            tint = YtmWhite,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }

                                    Box {
                                        IconButton(onClick = { showOverflowMenu = true }) {
                                            Icon(
                                                imageVector = YtmIcons.OverflowVertical24,
                                                contentDescription = "More options",
                                                tint = YtmWhite,
                                                modifier = Modifier.size(24.dp)
                                            )
                                        }

                                        DropdownMenu(
                                            expanded = showOverflowMenu,
                                            onDismissRequest = { showOverflowMenu = false },
                                            modifier = Modifier.background(YtmGrey12)
                                        ) {
                                            DropdownMenuItem(
                                                text = { Text("Play all", color = YtmWhite) },
                                                onClick = {
                                                    showOverflowMenu = false
                                                    tracks.firstOrNull()?.let { PlayerManager.playTrack(it, tracks) }
                                                }
                                            )
                                            DropdownMenuItem(
                                                text = { Text("Shuffle play", color = YtmWhite) },
                                                onClick = {
                                                    showOverflowMenu = false
                                                    val shuffled = tracks.shuffled()
                                                    shuffled.firstOrNull()?.let { PlayerManager.playTrack(it, shuffled) }
                                                }
                                            )
                                            if (isLocalUserPlaylist && localPlaylist != null) {
                                                DropdownMenuItem(
                                                    text = { Text(if (showAddSongsPanel) "Hide add songs" else "Add songs", color = YtmWhite) },
                                                    onClick = {
                                                        showOverflowMenu = false
                                                        showAddSongsPanel = !showAddSongsPanel
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("Rename playlist", color = YtmWhite) },
                                                    onClick = {
                                                        showOverflowMenu = false
                                                        showRenameDialog = true
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("Delete playlist", color = YtmRedAccent) },
                                                    onClick = {
                                                        showOverflowMenu = false
                                                        PlaylistManager.deletePlaylist(localPlaylist.id)
                                                        Toast.makeText(context, "Deleted '${localPlaylist.name}'", Toast.LENGTH_SHORT).show()
                                                        onBack()
                                                    }
                                                )
                                            } else {
                                                DropdownMenuItem(
                                                    text = { Text("Save to Library", color = YtmWhite) },
                                                    onClick = {
                                                        showOverflowMenu = false
                                                        saveToLibraryPlaylist()
                                                    }
                                                )
                                            }
                                            DropdownMenuItem(
                                                text = { Text("Share", color = YtmWhite) },
                                                onClick = {
                                                    showOverflowMenu = false
                                                    shareEntity()
                                                }
                                            )
                                        }
                                    }
                                }
                            }

                            if (showInlineSearch) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp)
                                        .height(40.dp)
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(YtmWhite10)
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
                                        if (filterQuery.isEmpty()) {
                                            Text("Search in $displayTitle", fontSize = 14.sp, color = YtmWhite67)
                                        }
                                        BasicTextField(
                                            value = filterQuery,
                                            onValueChange = { filterQuery = it },
                                            singleLine = true,
                                            textStyle = TextStyle(fontSize = 14.sp, color = YtmWhite),
                                            cursorBrush = SolidColor(YtmWhite),
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                    }
                                    if (filterQuery.isNotEmpty()) {
                                        IconButton(
                                            onClick = { filterQuery = "" },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Icon(
                                                imageVector = YtmIcons.CloseX24,
                                                contentDescription = "Clear",
                                                tint = YtmWhite67,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Centered 200.dp x 200.dp artwork
                            Box(
                                modifier = Modifier
                                    .size(200.dp)
                                    .clip(if (isArtist) CircleShape else RoundedCornerShape(8.dp))
                                    .background(YtmGrey10),
                                contentAlignment = Alignment.Center
                            ) {
                                if (displayCover.isNotBlank()) {
                                    AsyncImage(
                                        model = displayCover,
                                        contentDescription = displayTitle,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Icon(
                                        imageVector = YtmIcons.Mix24,
                                        contentDescription = displayTitle,
                                        tint = YtmWhite67,
                                        modifier = Modifier.size(64.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(18.dp))

                            // Centered 24.sp YtmEntityHeaderTitle
                            Text(
                                text = displayTitle,
                                style = YtmEntityHeaderTitle,
                                textAlign = TextAlign.Center,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 24.dp)
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            // Centered 14.sp YtmWhite67 subtitle
                            Text(
                                text = headerSubtitle,
                                fontSize = 14.sp,
                                color = YtmWhite67,
                                textAlign = TextAlign.Center,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 24.dp)
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            // YTM centered circular action row
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                YtmDetailCircleButton(
                                    icon = if (allDownloaded) YtmIcons.Downloaded24 else YtmIcons.Download24,
                                    contentDescription = "Download all to phone",
                                    onClick = {
                                        if (tracks.isNotEmpty()) {
                                            PlayerManager.downloadTracks(context, tracks)
                                        }
                                    }
                                )

                                YtmDetailCircleButton(
                                    icon = YtmIcons.PlaylistAdd24,
                                    contentDescription = if (isLocalUserPlaylist) "Add songs" else "Add to playlist",
                                    onClick = {
                                        if (isLocalUserPlaylist) {
                                            showAddSongsPanel = !showAddSongsPanel
                                        } else {
                                            saveToLibraryPlaylist()
                                        }
                                    }
                                )

                                // Center 56.dp solid YtmWhite circle button with 28.dp YtmPureBlack Play36
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFFFFFFE))
                                        .clickable {
                                            tracks.firstOrNull()?.let { first ->
                                                PlayerManager.playTrack(first, tracks)
                                            }
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = YtmIcons.Play36,
                                        contentDescription = "Play all",
                                        tint = YtmPureBlack,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }

                                YtmDetailCircleButton(
                                    icon = YtmIcons.Shuffle24,
                                    contentDescription = "Shuffle",
                                    onClick = {
                                        val shuffled = tracks.shuffled()
                                        shuffled.firstOrNull()?.let { first ->
                                            PlayerManager.playTrack(first, shuffled)
                                        }
                                    }
                                )

                                YtmDetailCircleButton(
                                    icon = YtmIcons.Share24,
                                    contentDescription = "Share",
                                    onClick = { shareEntity() }
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))
                        }
                    }
                }

                // Inline "Add songs" panel for user-created playlists
                if (isLocalUserPlaylist && localPlaylist != null && (showAddSongsPanel || tracks.isEmpty())) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(YtmGrey11)
                                .padding(14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Add songs to playlist",
                                    style = YtmTitle03,
                                    color = YtmWhite
                                )
                                if (tracks.isNotEmpty()) {
                                    TextButton(onClick = { showAddSongsPanel = false }) {
                                        Text("Done", color = YtmWhite67, fontSize = 13.sp)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(40.dp)
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(YtmGrey13)
                                        .padding(horizontal = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = YtmIcons.SearchOutline,
                                        contentDescription = null,
                                        tint = YtmWhite67,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Box(modifier = Modifier.weight(1f)) {
                                        if (addSongQuery.isEmpty()) {
                                            Text("Search songs or artists...", fontSize = 14.sp, color = YtmWhite67)
                                        }
                                        BasicTextField(
                                            value = addSongQuery,
                                            onValueChange = { addSongQuery = it },
                                            singleLine = true,
                                            textStyle = TextStyle(fontSize = 14.sp, color = YtmWhite),
                                            cursorBrush = SolidColor(YtmWhite),
                                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                            keyboardActions = KeyboardActions(onSearch = { searchSongsToAdd() }),
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Button(
                                    onClick = { searchSongsToAdd() },
                                    enabled = addSongQuery.trim().isNotEmpty() && !isSearchingAddSongs,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = YtmWhite,
                                        contentColor = YtmPureBlack
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                    modifier = Modifier.height(40.dp)
                                ) {
                                    Text(if (isSearchingAddSongs) "..." else "Search", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                }
                            }

                            if (addSongResults.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(10.dp))
                                addSongResults.forEach { candidate ->
                                    val alreadyIn = localPlaylist.tracks.any { it.id == candidate.id }
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        AsyncImage(
                                            model = candidate.coverUrl,
                                            contentDescription = candidate.title,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(44.dp)
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(YtmGrey10)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = candidate.title,
                                                style = YtmTitle02,
                                                color = YtmWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = candidate.artist,
                                                style = YtmSubtitle01,
                                                color = YtmWhite67,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Button(
                                            onClick = {
                                                if (!alreadyIn) {
                                                    PlaylistManager.addTrack(localPlaylist.id, candidate)
                                                    Toast.makeText(context, "Added '${candidate.title}'", Toast.LENGTH_SHORT).show()
                                                }
                                            },
                                            enabled = !alreadyIn,
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (alreadyIn) YtmWhite10 else YtmWhite,
                                                contentColor = if (alreadyIn) YtmWhite67 else YtmPureBlack
                                            ),
                                            shape = RoundedCornerShape(18.dp),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                            modifier = Modifier.height(34.dp)
                                        ) {
                                            Text(if (alreadyIn) "Added" else "Add", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Tracklist rendered with TrackListItem (rankNumber = index + 1)
                if (filteredTracks.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = when {
                                    filterQuery.isNotBlank() -> "No matching tracks"
                                    isLocalUserPlaylist -> "Search above to add songs to this playlist."
                                    else -> "No tracks found"
                                },
                                style = YtmSubtitle01
                            )
                        }
                    }
                } else {
                    itemsIndexed(filteredTracks) { index, track ->
                        TrackListItem(
                            track = track,
                            rankNumber = index + 1,
                            onTrackClick = { PlayerManager.playTrack(track, filteredTracks) },
                            isLiked = likedIds.contains(track.id),
                            onLikeClick = { PlayerManager.toggleLike(track.id) },
                            onRemoveFromPlaylist = if (isLocalUserPlaylist && localPlaylist != null) {
                                {
                                    PlaylistManager.removeTrack(localPlaylist.id, track.id)
                                    Toast.makeText(context, "Removed '${track.title}'", Toast.LENGTH_SHORT).show()
                                }
                            } else {
                                null
                            }
                        )
                    }
                }
            }
        }
    }

    if (showRenameDialog && localPlaylist != null) {
        CreatePlaylistDialog(
            title = "Rename playlist",
            initialName = localPlaylist.name,
            confirmLabel = "Save",
            onDismiss = { showRenameDialog = false },
            onConfirm = { nextName ->
                PlaylistManager.renamePlaylist(localPlaylist.id, nextName)
                showRenameDialog = false
                Toast.makeText(context, "Renamed to '$nextName'", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
private fun YtmDetailCircleButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(YtmWhite10)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = YtmWhite,
            modifier = Modifier.size(20.dp)
        )
    }
}
