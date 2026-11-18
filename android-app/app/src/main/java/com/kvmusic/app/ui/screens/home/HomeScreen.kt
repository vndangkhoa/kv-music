package com.kvmusic.app.ui.screens.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.ArtistHit
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.TrackCardSquare
import com.kvmusic.app.ui.components.TrackListItem
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

private val homeMoodChips = listOf(
    "Energize",
    "Relax",
    "Workout",
    "Commute",
    "Focus",
    "Podcasts",
    "Romance",
    "Party"
)

private val artistRegions = listOf("VN", "US", "KR", "CN")

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    musicRepo: MusicRepository,
    onNavigateSettings: () -> Unit = {},
    onArtistClick: (name: String, avatarUrl: String, subtitle: String) -> Unit = { _, _, _ -> },
    onNavigateSearch: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var feedTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var newReleaseTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var trendingCharts by remember { mutableStateOf<List<Track>>(emptyList()) }
    var topArtists by remember { mutableStateOf<List<ArtistHit>>(emptyList()) }

    var selectedMood by remember { mutableStateOf<String?>(null) }
    val moodTrackCache = remember { mutableStateMapOf<String, List<Track>>() }
    var isMoodLoading by remember { mutableStateOf(false) }

    var selectedArtistRegion by remember { mutableStateOf("VN") }
    var isArtistsLoading by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var showCastDialog by remember { mutableStateOf(false) }

    val likedIds by PlayerManager.likedTrackIds.collectAsState()
    val listState = rememberLazyListState()
    val quickPicksCarouselState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    fun loadArtistsForRegion(region: String) {
        coroutineScope.launch {
            isArtistsLoading = true
            val res = musicRepo.getArtists(region.lowercase())
            if (res.isSuccess) {
                topArtists = res.getOrDefault(emptyList())
            }
            isArtistsLoading = false
        }
    }

    fun selectMood(mood: String) {
        if (selectedMood == mood) {
            selectedMood = null
            return
        }
        selectedMood = mood
        if (moodTrackCache.containsKey(mood)) {
            return
        }
        coroutineScope.launch {
            isMoodLoading = true
            val query = if (mood == "Podcasts") "music podcast episode" else "$mood music"
            val res = musicRepo.search(query)
            if (res.isSuccess) {
                moodTrackCache[mood] = res.getOrDefault(emptyList())
            }
            isMoodLoading = false
        }
    }

    LaunchedEffect(Unit) {
        isLoading = true
        val feedDeferred = async { musicRepo.getFeed() }
        val newRelDeferred = async { musicRepo.getNewReleases("VN") }
        val chartsDeferred = async { musicRepo.getCharts("VN", "trending") }
        val artistsDeferred = async { musicRepo.getArtists("vn") }

        val feedRes = feedDeferred.await()
        val newRelRes = newRelDeferred.await()
        val chartsRes = chartsDeferred.await()
        val artistsRes = artistsDeferred.await()

        if (feedRes.isSuccess) {
            feedTracks = feedRes.getOrDefault(emptyList())
        }
        if (newRelRes.isSuccess) {
            newReleaseTracks = newRelRes.getOrDefault(emptyList())
        }
        if (chartsRes.isSuccess) {
            trendingCharts = chartsRes.getOrDefault(emptyList())
        }
        if (artistsRes.isSuccess) {
            topArtists = artistsRes.getOrDefault(emptyList())
        }
        isLoading = false
    }

    val activeMoodTracks = selectedMood?.let { moodTrackCache[it] }.orEmpty()
    val quickPicks = remember(selectedMood, activeMoodTracks, feedTracks, newReleaseTracks) {
        if (selectedMood != null && activeMoodTracks.isNotEmpty()) {
            activeMoodTracks.take(16)
        } else {
            (feedTracks + newReleaseTracks).distinctBy { it.id }.take(16)
        }
    }
    val mixedForYou = remember(selectedMood, activeMoodTracks, newReleaseTracks, feedTracks) {
        if (selectedMood != null && activeMoodTracks.isNotEmpty()) {
            activeMoodTracks.drop(4).ifEmpty { activeMoodTracks }.take(12)
        } else {
            newReleaseTracks.ifEmpty { feedTracks.asReversed() }.take(12)
        }
    }

    val ambientFadeAlpha by remember {
        derivedStateOf {
            if (listState.firstVisibleItemIndex > 0) 0f
            else (1f - (listState.firstVisibleItemScrollOffset / 420f)).coerceIn(0f, 1f)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(YtmPureBlack)
    ) {
        // Top 220.dp ambient radial/vertical gradient wash fading smoothly into YtmPureBlack
        if (ambientFadeAlpha > 0f) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color(0x40FF0034).copy(alpha = 0.25f * ambientFadeAlpha),
                                Color(0x337F0E7F).copy(alpha = 0.20f * ambientFadeAlpha),
                                Color.Transparent
                            ),
                            center = Offset(180f, 80f),
                            radius = 750f
                        )
                    )
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    YtmPureBlack.copy(alpha = 0.55f),
                                    YtmPureBlack
                                )
                            )
                        )
                )
            }
        }

        if (isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                YtmHomeToolbar(
                    onCastClick = { showCastDialog = true },
                    onSearchClick = onNavigateSearch,
                    onProfileClick = onNavigateSettings
                )
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
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 28.dp)
            ) {
                // 1. YTM Top Toolbar (48.dp height)
                item {
                    Box(modifier = Modifier.statusBarsPadding()) {
                        YtmHomeToolbar(
                            onCastClick = { showCastDialog = true },
                            onSearchClick = onNavigateSearch,
                            onProfileClick = onNavigateSettings
                        )
                    }
                }

                // 2. Horizontal Mood Filter Chip Bar (chip_bar.eml-js)
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(homeMoodChips) { mood ->
                            val isSelected = selectedMood == mood
                            YtmFilterChip(
                                label = mood,
                                isSelected = isSelected,
                                onClick = { selectMood(mood) }
                            )
                        }
                    }

                    if (isMoodLoading) {
                        LinearProgressIndicator(
                            color = YtmWhite,
                            trackColor = YtmWhite10,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .height(2.dp)
                        )
                    }
                }

                // 3. Shelf 1 — Quick picks (4-row horizontal snap carousel)
                if (quickPicks.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = selectedMood?.let { "${it.uppercase()} • RADIO" } ?: "START RADIO FROM A SONG",
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp,
                                    letterSpacing = 0.04.em,
                                    color = YtmWhite67,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Quick picks",
                                    style = YtmDisplay02,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Surface(
                                onClick = {
                                    quickPicks.firstOrNull()?.let { first ->
                                        PlayerManager.playTrack(first, quickPicks)
                                    }
                                },
                                shape = RoundedCornerShape(16.dp),
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, YtmWhite20),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.padding(horizontal = 14.dp)
                                ) {
                                    Text(
                                        text = "Play all",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = YtmWhite
                                    )
                                }
                            }
                        }

                        val columns = remember(quickPicks) { quickPicks.chunked(4) }
                        LazyRow(
                            state = quickPicksCarouselState,
                            flingBehavior = rememberSnapFlingBehavior(lazyListState = quickPicksCarouselState),
                            contentPadding = PaddingValues(end = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            items(columns) { columnTracks ->
                                Column(
                                    modifier = Modifier.width(310.dp)
                                ) {
                                    columnTracks.forEach { track ->
                                        TrackListItem(
                                            track = track,
                                            onTrackClick = { PlayerManager.playTrack(track, quickPicks) },
                                            isLiked = likedIds.contains(track.id),
                                            onLikeClick = { PlayerManager.toggleLike(track.id) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Shelf 2 — Mixed for you (horizontal LazyRow of TrackCardSquare)
                if (mixedForYou.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(22.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = selectedMood?.let { "$it mixes" } ?: "Mixed for you",
                                style = YtmDisplay02,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(mixedForYou) { track ->
                                TrackCardSquare(
                                    track = track,
                                    onClick = { PlayerManager.playTrack(track, mixedForYou) }
                                )
                            }
                        }
                    }
                }

                // 5. Shelf 3 — Recommended artists (region pills + 136.dp circular avatars)
                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        text = "Recommended artists",
                        style = YtmDisplay02,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )

                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(artistRegions) { region ->
                            YtmFilterChip(
                                label = region,
                                isSelected = selectedArtistRegion == region,
                                onClick = {
                                    if (selectedArtistRegion != region) {
                                        selectedArtistRegion = region
                                        loadArtistsForRegion(region)
                                    }
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (isArtistsLoading) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = YtmWhite,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    } else if (topArtists.isNotEmpty()) {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(topArtists) { artist ->
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier
                                        .width(136.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable {
                                            onArtistClick(
                                                artist.name,
                                                artist.displayPhoto,
                                                artist.displayFollowers
                                            )
                                        }
                                        .padding(vertical = 4.dp)
                                ) {
                                    AsyncImage(
                                        model = artist.displayPhoto,
                                        contentDescription = artist.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .size(136.dp)
                                            .clip(CircleShape)
                                            .background(YtmGrey10)
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = artist.name,
                                        fontSize = 14.sp,
                                        lineHeight = 18.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = YtmWhite,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Artist",
                                        fontSize = 12.sp,
                                        lineHeight = 16.sp,
                                        color = YtmWhite67,
                                        maxLines = 1,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    }
                }

                // 6. Shelf 4 — Top charts (ranked TrackListItem rows)
                if (trendingCharts.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Top charts",
                                style = YtmDisplay02
                            )
                            Surface(
                                onClick = {
                                    trendingCharts.firstOrNull()?.let { first ->
                                        PlayerManager.playTrack(first, trendingCharts)
                                    }
                                },
                                shape = RoundedCornerShape(16.dp),
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, YtmWhite20),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.padding(horizontal = 14.dp)
                                ) {
                                    Text(
                                        text = "Play all",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = YtmWhite
                                    )
                                }
                            }
                        }
                    }

                    val chartSlice = trendingCharts.take(15)
                    itemsIndexed(chartSlice) { index, track ->
                        TrackListItem(
                            track = track,
                            rankNumber = index + 1,
                            onTrackClick = { PlayerManager.playTrack(track, chartSlice) },
                            isLiked = likedIds.contains(track.id),
                            onLikeClick = { PlayerManager.toggleLike(track.id) }
                        )
                    }
                }
            }
        }
    }

    if (showCastDialog) {
        AlertDialog(
            onDismissRequest = { showCastDialog = false },
            containerColor = YtmGrey12,
            titleContentColor = YtmWhite,
            textContentColor = YtmWhite67,
            title = {
                Text(
                    text = "Connect to a device",
                    style = YtmTitle03
                )
            },
            text = {
                Text(
                    text = "Audio is currently playing on this device. Use Android system audio output or Bluetooth settings to route playback to speakers or headphones.",
                    style = YtmSubtitle01
                )
            },
            confirmButton = {
                TextButton(onClick = { showCastDialog = false }) {
                    Text("Close", color = YtmWhite, fontWeight = FontWeight.Medium)
                }
            }
        )
    }
}

@Composable
private fun YtmHomeToolbar(
    onCastClick: () -> Unit,
    onSearchClick: () -> Unit,
    onProfileClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left: 28.dp KV Music brand mark + 8.dp spacer + "KV Music"
        Row(verticalAlignment = Alignment.CenterVertically) {
            KvMusicBrandMark(modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "KV Music",
                style = TextStyle(
                    fontFamily = YouTubeSansFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp,
                    letterSpacing = (-0.04).em,
                    color = YtmWhite
                )
            )
        }

        // Right: Cast24, SearchOutline, 28.dp Profile Avatar
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            IconButton(
                onClick = onCastClick,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = YtmIcons.Cast24,
                    contentDescription = "Cast",
                    tint = YtmWhite,
                    modifier = Modifier.size(24.dp)
                )
            }

            IconButton(
                onClick = onSearchClick,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = YtmIcons.SearchOutline,
                    contentDescription = "Search",
                    tint = YtmWhite,
                    modifier = Modifier.size(24.dp)
                )
            }

            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onProfileClick),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFF5500))
                        .border(1.dp, YtmWhite20, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = YtmIcons.PersonAudio24,
                        contentDescription = "Settings & Profile",
                        tint = YtmPureWhite,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

/**
 * Vector rendition of KV Music's squircle emblem (matching Logo.tsx & ic_launcher.png):
 * flame-orange gradient squircle, obsidian studio disc, and 7 harmonic waveform bars.
 */
@Composable
private fun KvMusicBrandMark(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val s = size.minDimension / 512f
        val squircleOffset = Offset(16f * s, 16f * s)
        val squircleSize = Size(480f * s, 480f * s)
        val squircleRadius = CornerRadius(112f * s, 112f * s)

        drawRoundRect(
            brush = Brush.linearGradient(
                colors = listOf(
                    Color(0xFFFF7A00),
                    Color(0xFFFF5500),
                    Color(0xFFCC3700)
                ),
                start = Offset(48f * s, 24f * s),
                end = Offset(464f * s, 488f * s)
            ),
            topLeft = squircleOffset,
            size = squircleSize,
            cornerRadius = squircleRadius
        )
        drawRoundRect(
            brush = Brush.verticalGradient(
                colors = listOf(
                    Color.White.copy(alpha = 0.22f),
                    Color.White.copy(alpha = 0.02f),
                    Color.Black.copy(alpha = 0.18f)
                )
            ),
            topLeft = squircleOffset,
            size = squircleSize,
            cornerRadius = squircleRadius
        )
        drawRoundRect(
            color = Color.White.copy(alpha = 0.20f),
            topLeft = Offset(20f * s, 20f * s),
            size = Size(472f * s, 472f * s),
            cornerRadius = CornerRadius(108f * s, 108f * s),
            style = Stroke(width = 4f * s)
        )

        val center = Offset(256f * s, 256f * s)
        drawCircle(color = Color(0xFF111318), radius = 178f * s, center = center)
        drawCircle(
            color = Color(0xFFFF6A00).copy(alpha = 0.36f),
            radius = 178f * s,
            center = center,
            style = Stroke(width = 4f * s)
        )
        drawCircle(
            color = Color(0xFFFF6A00).copy(alpha = 0.22f),
            radius = 156f * s,
            center = center,
            style = Stroke(width = 2.5f * s)
        )

        val barWidth = 20f * s
        val barCorner = CornerRadius(10f * s, 10f * s)
        val bars = listOf(
            Triple(150f, 218f, 76f) to Color(0xF5FFE8D6),
            Triple(182f, 190f, 132f) to Color(0xF5FFFFFF),
            Triple(214f, 160f, 192f) to Color(0xFFFF6A00),
            Triple(246f, 144f, 224f) to Color(0xFFFFFFFF),
            Triple(278f, 170f, 172f) to Color(0xFFFF6A00),
            Triple(310f, 200f, 112f) to Color(0xF5FFFFFF),
            Triple(342f, 223f, 66f) to Color(0xF5FFE8D6)
        )
        bars.forEach { (rect, color) ->
            val (x, y, h) = rect
            drawRoundRect(
                color = color,
                topLeft = Offset(x * s, y * s),
                size = Size(barWidth, h * s),
                cornerRadius = barCorner
            )
        }
    }
}

@Composable
private fun YtmFilterChip(
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
