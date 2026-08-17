package com.kvmusic.app.ui.screens.search

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.*
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.SoundCloudTrackCard
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.launch

typealias SearchTabType = String // "everything", "tracks", "people", "albums", "playlists"

data class MonogramTile(
    val label: String,
    val monogram: String,
    val query: String
)

val monogramTiles = listOf(
    MonogramTile("Hip-Hop & Rap", "HH", "Hip Hop"),
    MonogramTile("Chill & Lofi", "LF", "Lofi Chill"),
    MonogramTile("V-Pop", "VP", "V-Pop"),
    MonogramTile("Dance & EDM", "EDM", "EDM Dance"),
    MonogramTile("Rock", "RK", "Rock"),
    MonogramTile("R&B", "RB", "R&B")
)

data class RegionOption(
    val code: String,
    val label: String,
    val queryPrefix: String
)

val regionOptions = listOf(
    RegionOption("VN", "🇻🇳 Vietnam", "V-Pop Top Hits"),
    RegionOption("US", "🇺🇸 USA Global", "Billboard Top Hits"),
    RegionOption("KR", "🇰🇷 Korea K-Pop", "K-Pop Top Hits"),
    RegionOption("JP", "🇯🇵 Japan J-Pop", "J-Pop Anime Hits"),
    RegionOption("GB", "🇬🇧 UK UK-Pop", "UK Top Charts")
)

@Composable
fun SearchScreen(
    musicRepo: MusicRepository,
    onArtistClick: (name: String, avatarUrl: String, subtitle: String) -> Unit = { _, _, _ -> },
    onAlbumClick: (id: String, title: String, coverUrl: String, subtitle: String) -> Unit = { _, _, _, _ -> },
    onPlaylistClick: (id: String, title: String, coverUrl: String, subtitle: String) -> Unit = { _, _, _, _ -> },
    modifier: Modifier = Modifier
) {
    var query by remember { mutableStateOf("") }
    var activeTab by remember { mutableStateOf<SearchTabType>("everything") }
    var selectedRegion by remember { mutableStateOf(regionOptions.first()) }

    var songs by remember { mutableStateOf<List<Track>>(emptyList()) }
    var albums by remember { mutableStateOf<List<AlbumHit>>(emptyList()) }
    var playlists by remember { mutableStateOf<List<PlaylistHit>>(emptyList()) }
    var artists by remember { mutableStateOf<List<ArtistHit>>(emptyList()) }

    // Pre-search Explore Featured items (Refreshed by YouTube Music API per region)
    var preSearchSongs by remember { mutableStateOf<List<Track>>(emptyList()) }
    var preSearchAlbums by remember { mutableStateOf<List<AlbumHit>>(emptyList()) }
    var preSearchPlaylists by remember { mutableStateOf<List<PlaylistHit>>(emptyList()) }

    var recentSearches by remember { mutableStateOf(listOf("Lofi Chill", "V-Pop 2026", "HNGLE", "EDM Dance")) }
    var isLoading by remember { mutableStateOf(false) }
    var isExploreLoading by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val coroutineScope = rememberCoroutineScope()

    fun loadExploreContentForRegion(region: RegionOption) {
        coroutineScope.launch {
            isExploreLoading = true

            // Fetch live region charts from YouTube Music browse API
            val chartsRes = musicRepo.getCharts(region.code, "trending")
            if (chartsRes.isSuccess) {
                preSearchSongs = chartsRes.getOrDefault(emptyList())
            }

            // Fetch live region albums and playlists from YouTube Music search API
            val exploreRes = musicRepo.universalSearch(region.queryPrefix)
            if (exploreRes.isSuccess) {
                val data = exploreRes.getOrNull()
                if (data != null) {
                    preSearchAlbums = data.albums
                    preSearchPlaylists = data.playlists
                }
            }

            isExploreLoading = false
        }
    }

    LaunchedEffect(selectedRegion) {
        loadExploreContentForRegion(selectedRegion)
    }

    fun performSearch(q: String) {
        if (q.isBlank()) return
        focusManager.clearFocus()
        coroutineScope.launch {
            isLoading = true
            val res = musicRepo.universalSearch(q)
            if (res.isSuccess) {
                val data = res.getOrNull()
                if (data != null) {
                    songs = data.songs
                    albums = data.albums
                    playlists = data.playlists
                    artists = data.artists
                }
            } else {
                val trackRes = musicRepo.search(q)
                if (trackRes.isSuccess) {
                    songs = trackRes.getOrDefault(emptyList())
                }
            }
            if (!recentSearches.contains(q)) {
                recentSearches = (listOf(q) + recentSearches).take(8)
            }
            isLoading = false
        }
    }

    fun handleAlbumTap(album: AlbumHit) {
        onAlbumClick(album.id, album.title, album.coverUrl, album.artist)
        coroutineScope.launch {
            val res = musicRepo.search(album.title)
            if (res.isSuccess) {
                val list = res.getOrDefault(emptyList())
                val track = list.firstOrNull()
                if (track != null) {
                    PlayerManager.playTrack(track, list)
                }
            }
        }
    }

    fun handlePlaylistTap(playlist: PlaylistHit) {
        onPlaylistClick(playlist.id, playlist.title, playlist.coverUrl, "Playlist")
        coroutineScope.launch {
            val res = musicRepo.search(playlist.title)
            if (res.isSuccess) {
                val list = res.getOrDefault(emptyList())
                val track = list.firstOrNull()
                if (track != null) {
                    PlayerManager.playTrack(track, list)
                }
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightBlack)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Search Input Header Bar
            Surface(
                color = GlassCardDark,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, GlassCardBorder)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = if (query.isNotEmpty()) "Search results for \"$query\"" else "Search SoundCloud",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp
                        ),
                        color = TextElectricWhite
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = query,
                        onValueChange = {
                            query = it
                            if (it.length >= 2) {
                                performSearch(it)
                            } else if (it.isEmpty()) {
                                songs = emptyList()
                                albums = emptyList()
                                playlists = emptyList()
                                artists = emptyList()
                            }
                        },
                        placeholder = {
                            Text("Search tracks, artists, podcasts...", color = TextLightGray, fontSize = 13.sp)
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = "Search",
                                tint = SoundCloudNeonOrange
                            )
                        },
                        trailingIcon = {
                            if (query.isNotEmpty()) {
                                IconButton(onClick = {
                                    query = ""
                                    songs = emptyList()
                                    albums = emptyList()
                                    playlists = emptyList()
                                    artists = emptyList()
                                }) {
                                    Icon(
                                        imageVector = Icons.Default.Clear,
                                        contentDescription = "Clear",
                                        tint = TextLightGray
                                    )
                                }
                            }
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { performSearch(query) }),
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = SoundCloudNeonOrange,
                            unfocusedBorderColor = GlassCardBorder,
                            focusedContainerColor = MidnightBlack,
                            unfocusedContainerColor = MidnightBlack,
                            focusedTextColor = TextElectricWhite,
                            unfocusedTextColor = TextElectricWhite
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (query.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val tabs = listOf(
                                "everything" to "Everything",
                                "tracks" to "Tracks",
                                "people" to "People",
                                "albums" to "Albums",
                                "playlists" to "Playlists"
                            )
                            items(tabs) { (key, label) ->
                                Surface(
                                    onClick = { activeTab = key },
                                    shape = RoundedCornerShape(16.dp),
                                    color = if (activeTab == key) SoundCloudNeonOrange else Color(0xFF222222),
                                    modifier = Modifier.height(30.dp)
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.padding(horizontal = 14.dp)
                                    ) {
                                        Text(
                                            text = label,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = SoundCloudNeonOrange)
                }
            } else if (query.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 120.dp)
                ) {
                    // 1. People Section
                    if ((activeTab == "everything" || activeTab == "people") && artists.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.People,
                                    contentDescription = "People",
                                    tint = SoundCloudNeonOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "PEOPLE",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        letterSpacing = 1.sp
                                    ),
                                    color = TextElectricWhite
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))

                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(artists) { artist ->
                                    Card(
                                        modifier = Modifier
                                            .width(110.dp)
                                            .border(1.dp, GlassCardBorder, RoundedCornerShape(10.dp))
                                            .clickable { onArtistClick(artist.name, artist.displayPhoto, "Creator") },
                                        shape = RoundedCornerShape(10.dp),
                                        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(10.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            AsyncImage(
                                                model = artist.displayPhoto,
                                                contentDescription = artist.name,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .size(64.dp)
                                                    .clip(CircleShape)
                                                    .border(2.dp, SoundCloudNeonOrange, CircleShape)
                                            )
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text(
                                                text = artist.name,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "Creator",
                                                fontSize = 10.sp,
                                                color = TextLightGray
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 2. Tracks Stream Section
                    if ((activeTab == "everything" || activeTab == "tracks") && songs.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MusicNote,
                                    contentDescription = "Tracks",
                                    tint = SoundCloudNeonOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "TRACKS",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        letterSpacing = 1.sp
                                    ),
                                    color = TextElectricWhite
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        items(songs) { track ->
                            SoundCloudTrackCard(
                                track = track,
                                queue = songs
                            )
                        }
                    }

                    // 3. Albums Section
                    if ((activeTab == "everything" || activeTab == "albums") && albums.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Album,
                                    contentDescription = "Albums",
                                    tint = SoundCloudNeonOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "ALBUMS",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        letterSpacing = 1.sp
                                    ),
                                    color = TextElectricWhite
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))

                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(albums) { album ->
                                    Card(
                                        modifier = Modifier
                                            .width(135.dp)
                                            .border(1.dp, GlassCardBorder, RoundedCornerShape(10.dp))
                                            .clickable { handleAlbumTap(album) },
                                        shape = RoundedCornerShape(10.dp),
                                        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp)) {
                                            Box(contentAlignment = Alignment.Center) {
                                                AsyncImage(
                                                    model = album.coverUrl,
                                                    contentDescription = album.title,
                                                    contentScale = ContentScale.Crop,
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .height(115.dp)
                                                        .clip(RoundedCornerShape(8.dp))
                                                )
                                                Box(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .height(115.dp)
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(Color.Black.copy(alpha = 0.25f)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Surface(
                                                        shape = CircleShape,
                                                        color = SoundCloudNeonOrange,
                                                        modifier = Modifier.size(36.dp)
                                                    ) {
                                                        Box(contentAlignment = Alignment.Center) {
                                                            Icon(
                                                                imageVector = Icons.Default.PlayArrow,
                                                                contentDescription = "Play",
                                                                tint = Color.White,
                                                                modifier = Modifier.size(20.dp)
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text(
                                                text = album.title,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = album.artist,
                                                fontSize = 10.sp,
                                                color = TextLightGray,
                                                maxLines = 1
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 4. Playlists Section
                    if ((activeTab == "everything" || activeTab == "playlists") && playlists.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.List,
                                    contentDescription = "Playlists",
                                    tint = SoundCloudNeonOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "PLAYLISTS",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        letterSpacing = 1.sp
                                    ),
                                    color = TextElectricWhite
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))

                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(playlists) { playlist ->
                                    Card(
                                        modifier = Modifier
                                            .width(135.dp)
                                            .border(1.dp, GlassCardBorder, RoundedCornerShape(10.dp))
                                            .clickable { handlePlaylistTap(playlist) },
                                        shape = RoundedCornerShape(10.dp),
                                        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp)) {
                                            Box(contentAlignment = Alignment.Center) {
                                                AsyncImage(
                                                    model = playlist.coverUrl,
                                                    contentDescription = playlist.title,
                                                    contentScale = ContentScale.Crop,
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .height(115.dp)
                                                        .clip(RoundedCornerShape(8.dp))
                                                )
                                                Box(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .height(115.dp)
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(Color.Black.copy(alpha = 0.25f)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Surface(
                                                        shape = CircleShape,
                                                        color = SoundCloudNeonOrange,
                                                        modifier = Modifier.size(36.dp)
                                                    ) {
                                                        Box(contentAlignment = Alignment.Center) {
                                                            Icon(
                                                                imageVector = Icons.Default.PlayArrow,
                                                                contentDescription = "Play",
                                                                tint = Color.White,
                                                                modifier = Modifier.size(20.dp)
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text(
                                                text = playlist.title,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "Playlist",
                                                fontSize = 10.sp,
                                                color = SoundCloudNeonOrange
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Pre-Search Explore View (Refreshed by Region Selector directly linked to YouTube Music API!)
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 120.dp)
                ) {
                    // Region Selector Bar
                    item {
                        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Public,
                                        contentDescription = "Region",
                                        tint = SoundCloudNeonOrange,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "EXPLORE REGION",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Black,
                                            fontSize = 12.sp,
                                            letterSpacing = 1.sp
                                        ),
                                        color = TextElectricWhite
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable {
                                        loadExploreContentForRegion(selectedRegion)
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = "Refresh",
                                        tint = SoundCloudNeonOrange,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Live Refresh",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = SoundCloudNeonOrange
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(regionOptions) { region ->
                                    Surface(
                                        onClick = { selectedRegion = region },
                                        shape = RoundedCornerShape(16.dp),
                                        color = if (selectedRegion.code == region.code) SoundCloudNeonOrange else Color(0xFF222222),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, GlassCardBorder),
                                        modifier = Modifier.height(32.dp)
                                    ) {
                                        Box(
                                            contentAlignment = Alignment.Center,
                                            modifier = Modifier.padding(horizontal = 12.dp)
                                        ) {
                                            Text(
                                                text = region.label,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 1. Recent Searches
                    if (recentSearches.isNotEmpty()) {
                        item {
                            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(bottom = 10.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.History,
                                        contentDescription = "Recent Searches",
                                        tint = TextLightGray,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "RECENT SEARCHES",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Black,
                                            fontSize = 11.sp,
                                            letterSpacing = 1.sp
                                        ),
                                        color = TextLightGray
                                    )
                                }

                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(recentSearches) { q ->
                                        Surface(
                                            onClick = {
                                                query = q
                                                performSearch(q)
                                            },
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color(0xFF1B1B1B),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, GlassCardBorder),
                                            modifier = Modifier.height(30.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.padding(horizontal = 12.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Search,
                                                    contentDescription = null,
                                                    tint = TextLightGray,
                                                    modifier = Modifier.size(12.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = q,
                                                    fontSize = 11.sp,
                                                    color = TextElectricWhite
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 2. Browse Genres Monogram Grid
                    item {
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Explore,
                                contentDescription = "Browse",
                                tint = SoundCloudNeonOrange,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "BROWSE GENRES",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    letterSpacing = 1.sp
                                ),
                                color = TextElectricWhite
                            )
                        }

                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(monogramTiles) { tile ->
                                Card(
                                    modifier = Modifier
                                        .width(120.dp)
                                        .height(72.dp)
                                        .border(1.dp, GlassCardBorder, RoundedCornerShape(8.dp))
                                        .clickable {
                                            query = tile.query
                                            performSearch(tile.query)
                                        },
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(10.dp),
                                        verticalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Surface(
                                            color = GlassSurfaceDark,
                                            shape = RoundedCornerShape(4.dp),
                                            modifier = Modifier.border(1.dp, GlassCardBorder, RoundedCornerShape(4.dp))
                                        ) {
                                            Text(
                                                text = tile.monogram,
                                                color = SoundCloudNeonOrange,
                                                fontWeight = FontWeight.Black,
                                                fontSize = 11.sp,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                        Text(
                                            text = tile.label,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp
                                            ),
                                            color = TextElectricWhite,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 3. Top Featured Albums (Refreshed from YT Music Browse API)
                    item {
                        Spacer(modifier = Modifier.height(20.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Album,
                                contentDescription = "Albums",
                                tint = SoundCloudNeonOrange,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Top Featured Albums (${selectedRegion.label})",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp
                                ),
                                color = TextElectricWhite
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))

                        if (isExploreLoading) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = SoundCloudNeonOrange, modifier = Modifier.size(28.dp))
                            }
                        } else if (preSearchAlbums.isNotEmpty()) {
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(preSearchAlbums) { album ->
                                    Card(
                                        modifier = Modifier
                                            .width(135.dp)
                                            .border(1.dp, GlassCardBorder, RoundedCornerShape(10.dp))
                                            .clickable { handleAlbumTap(album) },
                                        shape = RoundedCornerShape(10.dp),
                                        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp)) {
                                            AsyncImage(
                                                model = album.coverUrl,
                                                contentDescription = album.title,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(115.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                            )
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text(
                                                text = album.title,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = album.artist,
                                                fontSize = 10.sp,
                                                color = TextLightGray,
                                                maxLines = 1
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 4. Popular SoundCloud Playlists (Refreshed from YT Music Browse API)
                    item {
                        Spacer(modifier = Modifier.height(20.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.List,
                                contentDescription = "Playlists",
                                tint = SoundCloudNeonOrange,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Popular SoundCloud Playlists (${selectedRegion.label})",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp
                                ),
                                color = TextElectricWhite
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))

                        if (isExploreLoading) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = SoundCloudNeonOrange, modifier = Modifier.size(28.dp))
                            }
                        } else if (preSearchPlaylists.isNotEmpty()) {
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                items(preSearchPlaylists) { playlist ->
                                    Card(
                                        modifier = Modifier
                                            .width(135.dp)
                                            .border(1.dp, GlassCardBorder, RoundedCornerShape(10.dp))
                                            .clickable { handlePlaylistTap(playlist) },
                                        shape = RoundedCornerShape(10.dp),
                                        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp)) {
                                            AsyncImage(
                                                model = playlist.coverUrl,
                                                contentDescription = playlist.title,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(115.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                            )
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text(
                                                text = playlist.title,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "Playlist",
                                                fontSize = 10.sp,
                                                color = SoundCloudNeonOrange
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 5. Pre-Search Featured Top Tracks Stream (Live YouTube Music Charts)
                    if (preSearchSongs.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocalFireDepartment,
                                    contentDescription = "Trending",
                                    tint = SoundCloudNeonOrange,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "LIVE TRENDING CHARTS (${selectedRegion.code})",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        letterSpacing = 1.sp
                                    ),
                                    color = TextElectricWhite
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        items(preSearchSongs) { track ->
                            SoundCloudTrackCard(
                                track = track,
                                queue = preSearchSongs
                            )
                        }
                    }
                }
            }
        }
    }
}
