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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.TrackListItem
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.*
import org.json.JSONArray
import org.json.JSONObject

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
    var tracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showInlineSearch by remember { mutableStateOf(false) }
    var filterQuery by remember { mutableStateOf("") }
    var showOverflowMenu by remember { mutableStateOf(false) }

    val likedIds by PlayerManager.likedTrackIds.collectAsState()
    val downloadedIds by PlayerManager.downloadedTrackIds.collectAsState()

    LaunchedEffect(id, title, type) {
        isLoading = true
        val query = title.ifEmpty { id }
        val res = musicRepo.search(query)
        val found = if (res.isSuccess) res.getOrDefault(emptyList()) else emptyList()
        tracks = if (found.isNotEmpty()) {
            found
        } else {
            musicRepo.universalSearch(query).getOrNull()?.songs ?: emptyList()
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

    val isArtist = type.equals("artist", ignoreCase = true)
    val typeLabel = when {
        isArtist -> "Artist"
        type.equals("album", ignoreCase = true) -> "Album"
        else -> "Playlist"
    }
    val headerSubtitle = remember(typeLabel, subtitle, tracks.size) {
        if (subtitle.isNotBlank() && isArtist) {
            "$typeLabel • $subtitle • ${tracks.size} songs"
        } else {
            "$typeLabel • ${tracks.size} songs"
        }
    }
    val hasDownloadedLead = tracks.firstOrNull()?.let { downloadedIds.contains(it.id) } ?: false

    fun shareEntity() {
        val shareUrl = "https://sp.khoavo.myds.me/track/${id}"
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, "Check out '$title' on KV Music:\n$shareUrl")
            setType("text/plain")
        }
        context.startActivity(Intent.createChooser(sendIntent, "Share $typeLabel"))
    }

    fun saveToLibraryPlaylist() {
        try {
            val prefs = context.getSharedPreferences("kv_music_playlists", Context.MODE_PRIVATE)
            val existing = prefs.getString("saved_playlists_json", null)
            val arr = if (existing != null) JSONArray(existing) else JSONArray()
            val tArr = JSONArray()
            tracks.forEach { tr ->
                tArr.put(
                    JSONObject().apply {
                        put("id", tr.id)
                        put("title", tr.title)
                        put("artist", tr.artist)
                        put("album", tr.album)
                        put("duration", tr.duration)
                        put("cover_url", tr.coverUrl)
                        put("url", tr.url)
                    }
                )
            }
            val newObj = JSONObject().apply {
                put("id", id.ifBlank { title })
                put("name", title)
                put("cover_url", coverUrl)
                put("tracks", tArr)
            }
            val nextArr = JSONArray().apply {
                put(newObj)
                for (i in 0 until arr.length()) {
                    val item = arr.getJSONObject(i)
                    if (item.optString("name") != title) put(item)
                }
            }
            prefs.edit().putString("saved_playlists_json", nextArr.toString()).apply()
            Toast.makeText(context, "Saved '$title' to Library", Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            Toast.makeText(context, "Could not save playlist", Toast.LENGTH_SHORT).show()
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
                                            DropdownMenuItem(
                                                text = { Text("Save to Library", color = YtmWhite) },
                                                onClick = {
                                                    showOverflowMenu = false
                                                    saveToLibraryPlaylist()
                                                }
                                            )
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
                                            Text("Search in $title", fontSize = 14.sp, color = YtmWhite67)
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
                            AsyncImage(
                                model = coverUrl,
                                contentDescription = title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(200.dp)
                                    .clip(if (isArtist) CircleShape else RoundedCornerShape(8.dp))
                                    .background(YtmGrey10)
                            )

                            Spacer(modifier = Modifier.height(18.dp))

                            // Centered 24.sp YtmEntityHeaderTitle
                            Text(
                                text = title,
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
                                    icon = if (hasDownloadedLead) YtmIcons.Downloaded24 else YtmIcons.Download24,
                                    contentDescription = "Download",
                                    onClick = {
                                        tracks.firstOrNull()?.let { lead ->
                                            PlayerManager.toggleDownload(context, lead)
                                        }
                                    }
                                )

                                YtmDetailCircleButton(
                                    icon = YtmIcons.PlaylistAdd24,
                                    contentDescription = "Add to playlist",
                                    onClick = { saveToLibraryPlaylist() }
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
                                text = if (filterQuery.isNotBlank()) "No matching tracks" else "No tracks found",
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
                            onLikeClick = { PlayerManager.toggleLike(track.id) }
                        )
                    }
                }
            }
        }
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
