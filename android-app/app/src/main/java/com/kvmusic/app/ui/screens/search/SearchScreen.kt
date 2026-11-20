package com.kvmusic.app.ui.screens.search

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.AlbumHit
import com.kvmusic.app.data.model.ArtistHit
import com.kvmusic.app.data.model.PlaylistHit
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.AudioCacheManager
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.TrackCardSquare
import com.kvmusic.app.ui.components.TrackListItem
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class ExploreMoodTile(
    val label: String,
    val query: String,
    val stripeColor: Color
)

private val exploreMoodTiles = listOf(
    ExploreMoodTile("Energize", "Energize music", Color(0xFFFF0034)),
    ExploreMoodTile("Relax", "Relax chill music", Color(0xFF3EA6FF)),
    ExploreMoodTile("Workout", "Workout gym hits", Color(0xFF3A923F)),
    ExploreMoodTile("Commute", "Commute drive mix", Color(0xFFFFB300)),
    ExploreMoodTile("Focus", "Focus study lofi", Color(0xFFAB47BC)),
    ExploreMoodTile("V-Pop", "V-Pop Hits", Color(0xFFFF4E45)),
    ExploreMoodTile("Hip-Hop", "Hip Hop Rap", Color(0xFFFF7043)),
    ExploreMoodTile("Dance & EDM", "EDM Dance", Color(0xFF26A69A)),
    ExploreMoodTile("R&B", "R&B Soul", Color(0xFFEC407A)),
    ExploreMoodTile("Romance", "Romantic love songs", Color(0xFF5C6BC0))
)

private data class ExploreRegionOption(
    val code: String,
    val queryPrefix: String
)

private val exploreRegions = listOf(
    ExploreRegionOption("VN", "V-Pop Top Hits"),
    ExploreRegionOption("US", "Billboard Top Hits"),
    ExploreRegionOption("KR", "K-Pop Top Hits"),
    ExploreRegionOption("JP", "J-Pop Anime Hits"),
    ExploreRegionOption("GB", "UK Top Charts")
)

private val searchFilterTabs = listOf("All", "Songs", "Videos", "Albums", "Artists", "Playlists")

@Composable
fun SearchScreen(
    musicRepo: MusicRepository,
    onArtistClick: (name: String, avatarUrl: String, subtitle: String) -> Unit = { _, _, _ -> },
    onAlbumClick: (id: String, title: String, coverUrl: String, subtitle: String) -> Unit = { _, _, _, _ -> },
    onPlaylistClick: (id: String, title: String, coverUrl: String, subtitle: String) -> Unit = { _, _, _, _ -> },
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val focusRequester = remember { FocusRequester() }
    val coroutineScope = rememberCoroutineScope()
    val exploreListState = rememberLazyListState()

    var isSearchActive by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var activeFilterTab by remember { mutableStateOf("All") }
    var selectedRegion by remember { mutableStateOf(exploreRegions.first()) }

    var songs by remember { mutableStateOf<List<Track>>(emptyList()) }
    var albums by remember { mutableStateOf<List<AlbumHit>>(emptyList()) }
    var playlists by remember { mutableStateOf<List<PlaylistHit>>(emptyList()) }
    var artists by remember { mutableStateOf<List<ArtistHit>>(emptyList()) }

    var preSearchSongs by remember { mutableStateOf<List<Track>>(emptyList()) }
    var preSearchAlbums by remember { mutableStateOf<List<AlbumHit>>(emptyList()) }
    var preSearchNewReleases by remember { mutableStateOf<List<Track>>(emptyList()) }

    var recentSearches by remember { mutableStateOf(listOf("Lofi Chill", "V-Pop 2026", "HNGLE", "EDM Dance")) }
    var isLoading by remember { mutableStateOf(false) }
    var isExploreLoading by remember { mutableStateOf(false) }
    var searchJob by remember { mutableStateOf<Job?>(null) }

    val likedIds by PlayerManager.likedTrackIds.collectAsState()

    fun loadExploreContentForRegion(region: ExploreRegionOption) {
        coroutineScope.launch {
            isExploreLoading = true
            val chartsRes = musicRepo.getCharts(region.code, "trending")
            if (chartsRes.isSuccess) {
                preSearchSongs = chartsRes.getOrDefault(emptyList())
            }
            val newRelRes = musicRepo.getNewReleases(region.code)
            if (newRelRes.isSuccess) {
                preSearchNewReleases = newRelRes.getOrDefault(emptyList())
            }
            val exploreRes = musicRepo.universalSearch(region.queryPrefix)
            if (exploreRes.isSuccess) {
                val data = exploreRes.getOrNull()
                if (data != null) {
                    preSearchAlbums = data.albums
                }
            }
            isExploreLoading = false
        }
    }

    LaunchedEffect(selectedRegion) {
        loadExploreContentForRegion(selectedRegion)
    }

    LaunchedEffect(songs) {
        if (songs.isNotEmpty()) {
            AudioCacheManager.preloadTracks(context, songs, maxCount = 3)
        }
    }

    LaunchedEffect(preSearchSongs) {
        if (preSearchSongs.isNotEmpty()) {
            AudioCacheManager.preloadTracks(context, preSearchSongs, maxCount = 2)
        }
    }

    LaunchedEffect(isSearchActive) {
        if (isSearchActive && query.isEmpty()) {
            runCatching { focusRequester.requestFocus() }
        }
    }

    fun performSearch(
        rawQuery: String,
        dismissKeyboard: Boolean = true,
        saveRecent: Boolean = true,
        debounceMs: Long = 0L
    ) {
        val trimmed = rawQuery.trim()
        if (trimmed.isEmpty()) {
            searchJob?.cancel()
            isLoading = false
            return
        }
        if (dismissKeyboard) {
            focusManager.clearFocus()
        }
        searchJob?.cancel()
        searchJob = coroutineScope.launch {
            if (debounceMs > 0L) {
                delay(debounceMs)
            }
            if (dismissKeyboard || (songs.isEmpty() && albums.isEmpty() && playlists.isEmpty() && artists.isEmpty())) {
                isLoading = true
            }
            try {
                val res = musicRepo.universalSearch(trimmed)
                if (res.isSuccess) {
                    val data = res.getOrNull()
                    if (data != null) {
                        songs = data.songs
                        albums = data.albums
                        playlists = data.playlists
                        artists = data.artists
                    }
                } else {
                    val trackRes = musicRepo.search(trimmed)
                    if (trackRes.isSuccess) {
                        songs = trackRes.getOrDefault(emptyList())
                    }
                }
                if (saveRecent) {
                    recentSearches = (listOf(trimmed) + recentSearches.filterNot { it.equals(trimmed, ignoreCase = true) }).take(8)
                }
            } finally {
                isLoading = false
            }
        }
    }

    val voiceLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spoken = result.data
                ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull()
                ?.trim()
            if (!spoken.isNullOrEmpty()) {
                isSearchActive = true
                query = spoken
                performSearch(spoken, dismissKeyboard = true, saveRecent = true)
            }
        }
    }

    fun startVoiceSearch() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Search songs, artists, podcasts")
        }
        try {
            voiceLauncher.launch(intent)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, "Voice search unavailable on this device", Toast.LENGTH_SHORT).show()
        }
    }

    fun exitActiveSearch() {
        searchJob?.cancel()
        focusManager.clearFocus()
        isLoading = false
        isSearchActive = false
        query = ""
        songs = emptyList()
        albums = emptyList()
        playlists = emptyList()
        artists = emptyList()
    }

    val showingSearchMode = isSearchActive || query.isNotEmpty()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(YtmPureBlack)
    ) {
        if (!showingSearchMode) {
            // EXPLORE / BROWSE STATE
            LazyColumn(
                state = exploreListState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 28.dp)
            ) {
                // 0: Explore Top Header + Rounded Search Trigger
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                    ) {
                        Text(
                            text = "Explore",
                            style = TextStyle(
                                fontFamily = YouTubeSansFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 24.sp,
                                letterSpacing = (-0.04).em,
                                color = YtmWhite
                            )
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Rounded search bar trigger (height = 44.dp, RoundedCornerShape(22.dp), YtmGrey10)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                                .clip(RoundedCornerShape(22.dp))
                                .background(YtmGrey10)
                                .border(1.dp, YtmWhite08, RoundedCornerShape(22.dp))
                                .clickable { isSearchActive = true }
                                .padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = YtmIcons.SearchOutline,
                                contentDescription = "Search",
                                tint = YtmWhite,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Search songs, artists, podcasts",
                                fontSize = 14.sp,
                                color = YtmWhite67,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { startVoiceSearch() },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = YtmIcons.Mic24,
                                    contentDescription = "Voice search",
                                    tint = YtmWhite,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }

                // 1: Top 3 YTM navigation buttons (music_navigation_button, height = 56.dp, RoundedCornerShape(6.dp), YtmGrey10)
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        YtmExploreNavButton(
                            label = "New releases",
                            icon = YtmIcons.Album24,
                            onClick = {
                                coroutineScope.launch {
                                    exploreListState.animateScrollToItem(4)
                                }
                            },
                            modifier = Modifier.weight(1f)
                        )
                        YtmExploreNavButton(
                            label = "Charts",
                            icon = YtmIcons.Spark24,
                            onClick = {
                                coroutineScope.launch {
                                    exploreListState.animateScrollToItem(
                                        if (preSearchSongs.isNotEmpty()) 6 else 5
                                    )
                                }
                            },
                            modifier = Modifier.weight(1f)
                        )
                        YtmExploreNavButton(
                            label = "Moods & genres",
                            icon = YtmIcons.Mix24,
                            onClick = {
                                coroutineScope.launch {
                                    exploreListState.animateScrollToItem(5)
                                }
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // 2: Region filter chips (VN, US, KR, JP, GB)
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(exploreRegions) { region ->
                            SearchFilterChip(
                                label = region.code,
                                isSelected = selectedRegion.code == region.code,
                                onClick = { selectedRegion = region }
                            )
                        }
                    }
                }

                // 3: Recent searches list (with CloseX24 and "Clear")
                item {
                    if (recentSearches.isNotEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Recent searches",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = YtmWhite67
                                )
                                Text(
                                    text = "Clear",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = YtmWhite,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .clickable { recentSearches = emptyList() }
                                        .padding(horizontal = 6.dp, vertical = 4.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            recentSearches.forEach { itemQuery ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(44.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .clickable {
                                            isSearchActive = true
                                            query = itemQuery
                                            performSearch(itemQuery, dismissKeyboard = true, saveRecent = true)
                                        }
                                        .padding(horizontal = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = YtmIcons.SearchOutline,
                                        contentDescription = null,
                                        tint = YtmWhite67,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(14.dp))
                                    Text(
                                        text = itemQuery,
                                        fontSize = 14.sp,
                                        color = YtmWhite,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f)
                                    )
                                    IconButton(
                                        onClick = { recentSearches = recentSearches - itemQuery },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            imageVector = YtmIcons.CloseX24,
                                            contentDescription = "Remove search",
                                            tint = YtmWhite67,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 4: "New albums & singles" horizontal LazyRow of TrackCardSquare
                item {
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "New albums & singles",
                        style = YtmDisplay02,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    )

                    if (isExploreLoading && preSearchAlbums.isEmpty() && preSearchNewReleases.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = YtmWhite,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    } else if (preSearchAlbums.isNotEmpty()) {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(preSearchAlbums) { album ->
                                TrackCardSquare(
                                    track = Track(
                                        id = album.id,
                                        title = album.title,
                                        artist = if (album.year.isNotBlank()) "Album • ${album.artist}" else album.artist,
                                        coverUrl = album.coverUrl
                                    ),
                                    onClick = {
                                        onAlbumClick(album.id, album.title, album.coverUrl, album.artist)
                                    }
                                )
                            }
                        }
                    } else if (preSearchNewReleases.isNotEmpty()) {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(preSearchNewReleases) { track ->
                                TrackCardSquare(
                                    track = track,
                                    onClick = { PlayerManager.playTrack(track, preSearchNewReleases) }
                                )
                            }
                        }
                    }
                }

                // 5: "Moods & genres" 2-column grid of 48.dp-tall YtmGrey10 cards with 6.dp colored left stripe
                item {
                    Spacer(modifier = Modifier.height(22.dp))
                    Text(
                        text = "Moods & genres",
                        style = YtmDisplay02,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    )

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        exploreMoodTiles.chunked(2).forEach { pair ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                pair.forEach { tile ->
                                    Row(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(48.dp)
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(YtmGrey10)
                                            .clickable {
                                                isSearchActive = true
                                                query = tile.label
                                                activeFilterTab = "All"
                                                performSearch(tile.query, dismissKeyboard = true, saveRecent = true)
                                            },
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .width(6.dp)
                                                .fillMaxHeight()
                                                .background(tile.stripeColor)
                                        )
                                        Text(
                                            text = tile.label,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = YtmWhite,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.padding(horizontal = 12.dp)
                                        )
                                    }
                                }
                                if (pair.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }

                // 6: "Trending in ${region}" ranked TrackListItem rows
                if (preSearchSongs.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Trending in ${selectedRegion.code}",
                            style = YtmDisplay02,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                        )
                    }

                    val trendingSlice = preSearchSongs.take(15)
                    itemsIndexed(trendingSlice) { index, track ->
                        TrackListItem(
                            track = track,
                            rankNumber = index + 1,
                            onTrackClick = { PlayerManager.playTrack(track, trendingSlice) },
                            isLiked = likedIds.contains(track.id),
                            onLikeClick = { PlayerManager.toggleLike(track.id) }
                        )
                    }
                }
            }
        } else {
            // ACTIVE SEARCH STATE (search_toolbar_view_v2)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(YtmGrey12)
                    .statusBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { exitActiveSearch() },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = YtmIcons.ArrowLeft24,
                            contentDescription = "Back",
                            tint = YtmWhite,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 4.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        if (query.isEmpty()) {
                            Text(
                                text = "Search songs, artists, podcasts",
                                fontSize = 18.sp,
                                color = YtmWhite67,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        BasicTextField(
                            value = query,
                            onValueChange = { next ->
                                query = next
                                val trimmed = next.trim()
                                if (trimmed.length >= 2) {
                                    performSearch(next, dismissKeyboard = false, saveRecent = false, debounceMs = 350L)
                                } else {
                                    searchJob?.cancel()
                                    isLoading = false
                                    if (trimmed.isEmpty()) {
                                        songs = emptyList()
                                        albums = emptyList()
                                        playlists = emptyList()
                                        artists = emptyList()
                                    }
                                }
                            },
                            singleLine = true,
                            textStyle = TextStyle(
                                fontSize = 18.sp,
                                color = YtmWhite
                            ),
                            cursorBrush = SolidColor(YtmWhite),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(
                                onSearch = { performSearch(query, dismissKeyboard = true, saveRecent = true) }
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(focusRequester)
                        )
                    }

                    if (query.isNotEmpty()) {
                        IconButton(
                            onClick = {
                                searchJob?.cancel()
                                isLoading = false
                                query = ""
                                songs = emptyList()
                                albums = emptyList()
                                playlists = emptyList()
                                artists = emptyList()
                            },
                            modifier = Modifier.size(44.dp)
                        ) {
                            Icon(
                                imageVector = YtmIcons.CloseX24,
                                contentDescription = "Clear search",
                                tint = YtmWhite,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    IconButton(
                        onClick = { startVoiceSearch() },
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            imageVector = YtmIcons.Mic24,
                            contentDescription = "Voice search",
                            tint = YtmWhite,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                HorizontalDivider(thickness = 1.dp, color = YtmWhite10)
            }

            if (query.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(searchFilterTabs) { tab ->
                        SearchFilterChip(
                            label = tab,
                            isSelected = activeFilterTab == tab,
                            onClick = { activeFilterTab = tab }
                        )
                    }
                }
            }

            if (query.isEmpty()) {
                // Active empty-query suggestions / recent search list
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    items(recentSearches) { itemQuery ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .clickable {
                                    query = itemQuery
                                    performSearch(itemQuery, dismissKeyboard = true, saveRecent = true)
                                }
                                .padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = YtmIcons.SearchOutline,
                                contentDescription = null,
                                tint = YtmWhite67,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Text(
                                text = itemQuery,
                                fontSize = 15.sp,
                                color = YtmWhite,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { recentSearches = recentSearches - itemQuery },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = YtmIcons.CloseX24,
                                    contentDescription = "Remove",
                                    tint = YtmWhite67,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            } else if (isLoading) {
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
            } else {
                val showArtists = (activeFilterTab == "All" || activeFilterTab == "Artists") && artists.isNotEmpty()
                val showSongs = (activeFilterTab == "All" || activeFilterTab == "Songs" || activeFilterTab == "Videos") && songs.isNotEmpty()
                val showAlbums = (activeFilterTab == "All" || activeFilterTab == "Albums") && albums.isNotEmpty()
                val showPlaylists = (activeFilterTab == "All" || activeFilterTab == "Playlists") && playlists.isNotEmpty()

                if (!showArtists && !showSongs && !showAlbums && !showPlaylists) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No results found for \"$query\"",
                            style = YtmSubtitle01
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 28.dp)
                    ) {
                        // Circular artist rows
                        if (showArtists) {
                            item {
                                Text(
                                    text = "Artists",
                                    style = YtmDisplay02,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                                )
                            }
                            items(if (activeFilterTab == "All") artists.take(3) else artists) { artist ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            onArtistClick(artist.name, artist.displayPhoto, artist.displayFollowers)
                                        }
                                        .padding(horizontal = 16.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    AsyncImage(
                                        model = artist.displayPhoto,
                                        contentDescription = artist.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .size(52.dp)
                                            .clip(CircleShape)
                                            .background(YtmGrey10)
                                    )
                                    Spacer(modifier = Modifier.width(14.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = artist.name,
                                            style = YtmTitle02,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "Artist • ${artist.displayFollowers}",
                                            style = YtmSubtitle01,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    Icon(
                                        imageVector = YtmIcons.ChevronRight24,
                                        contentDescription = null,
                                        tint = YtmWhite67,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }

                        // Songs / Videos using YTM TrackListItem (music_two_column_item)
                        if (showSongs) {
                            item {
                                Text(
                                    text = if (activeFilterTab == "Videos") "Videos" else "Songs",
                                    style = YtmDisplay02,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                                )
                            }
                            items(songs) { track ->
                                TrackListItem(
                                    track = track,
                                    onTrackClick = { PlayerManager.playTrack(track, songs) },
                                    isLiked = likedIds.contains(track.id),
                                    onLikeClick = { PlayerManager.toggleLike(track.id) }
                                )
                            }
                        }

                        // Albums
                        if (showAlbums) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Albums",
                                    style = YtmDisplay02,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                                )
                            }
                            if (activeFilterTab == "Albums") {
                                items(albums) { album ->
                                    ExploreMediaListRow(
                                        title = album.title,
                                        subtitle = if (album.year.isNotBlank()) "Album • ${album.artist} • ${album.year}" else "Album • ${album.artist}",
                                        coverUrl = album.coverUrl,
                                        onClick = {
                                            onAlbumClick(album.id, album.title, album.coverUrl, album.artist)
                                        }
                                    )
                                }
                            } else {
                                item {
                                    LazyRow(
                                        contentPadding = PaddingValues(horizontal = 16.dp),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        items(albums) { album ->
                                            TrackCardSquare(
                                                track = Track(
                                                    id = album.id,
                                                    title = album.title,
                                                    artist = album.artist,
                                                    coverUrl = album.coverUrl
                                                ),
                                                onClick = {
                                                    onAlbumClick(album.id, album.title, album.coverUrl, album.artist)
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Playlists
                        if (showPlaylists) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Playlists",
                                    style = YtmDisplay02,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                                )
                            }
                            if (activeFilterTab == "Playlists") {
                                items(playlists) { playlist ->
                                    ExploreMediaListRow(
                                        title = playlist.title,
                                        subtitle = if (playlist.author.isNotBlank()) "Playlist • ${playlist.author}" else "Playlist",
                                        coverUrl = playlist.coverUrl,
                                        onClick = {
                                            onPlaylistClick(
                                                playlist.id,
                                                playlist.title,
                                                playlist.coverUrl,
                                                playlist.author.ifBlank { "Playlist" }
                                            )
                                        }
                                    )
                                }
                            } else {
                                item {
                                    LazyRow(
                                        contentPadding = PaddingValues(horizontal = 16.dp),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        items(playlists) { playlist ->
                                            TrackCardSquare(
                                                track = Track(
                                                    id = playlist.id,
                                                    title = playlist.title,
                                                    artist = playlist.author.ifBlank { "Playlist" },
                                                    coverUrl = playlist.coverUrl
                                                ),
                                                onClick = {
                                                    onPlaylistClick(
                                                        playlist.id,
                                                        playlist.title,
                                                        playlist.coverUrl,
                                                        playlist.author.ifBlank { "Playlist" }
                                                    )
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExploreMediaListRow(
    title: String,
    subtitle: String,
    coverUrl: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = coverUrl,
            contentDescription = title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(YtmGrey10)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = YtmTitle02,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = YtmSubtitle01,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Icon(
            imageVector = YtmIcons.ChevronRight24,
            contentDescription = null,
            tint = YtmWhite67,
            modifier = Modifier.size(20.dp)
        )
    }
}

@Composable
private fun YtmExploreNavButton(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(6.dp),
        color = YtmGrey10,
        modifier = modifier.height(56.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = YtmWhite,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                fontSize = 12.sp,
                lineHeight = 15.sp,
                fontWeight = FontWeight.Medium,
                color = YtmWhite,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SearchFilterChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
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
                text = label,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = if (isSelected) YtmPureBlack else YtmWhite,
                maxLines = 1
            )
        }
    }
}
