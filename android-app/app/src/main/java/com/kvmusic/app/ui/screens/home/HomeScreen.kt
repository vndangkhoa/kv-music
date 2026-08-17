package com.kvmusic.app.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.*
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.SoundCloudTrackCard
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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

@Composable
fun HomeScreen(
    musicRepo: MusicRepository,
    onNavigateSettings: () -> Unit,
    onArtistClick: (name: String, avatarUrl: String, subtitle: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var feedTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var trendingCharts by remember { mutableStateOf<List<Track>>(emptyList()) }
    var topArtists by remember { mutableStateOf<List<ArtistHit>>(emptyList()) }
    var followedArtistIds by remember { mutableStateOf<Set<String>>(setOf("artist-hngle", "artist-dangrangto", "artist-grey-d")) }
    var currentRegionIndex by remember { mutableIntStateOf(0) }
    val regions = listOf("vn", "us", "kr", "cn")

    var heroIndex by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }

    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(trendingCharts.size) {
        if (trendingCharts.isEmpty()) return@LaunchedEffect
        while (true) {
            delay(5000)
            heroIndex = (heroIndex + 1) % trendingCharts.take(5).size
        }
    }

    fun loadArtistsForRegion(region: String) {
        coroutineScope.launch {
            val res = musicRepo.getArtists(region)
            if (res.isSuccess) {
                topArtists = res.getOrDefault(emptyList())
            }
        }
    }

    fun loadInitialData() {
        coroutineScope.launch {
            isLoading = true

            val feedRes = musicRepo.getFeed()
            if (feedRes.isSuccess) {
                feedTracks = feedRes.getOrDefault(emptyList())
            }

            val chartsRes = musicRepo.getCharts("VN", "trending")
            if (chartsRes.isSuccess) {
                trendingCharts = chartsRes.getOrDefault(emptyList())
            }

            val artistsRes = musicRepo.getArtists("vn")
            if (artistsRes.isSuccess) {
                topArtists = artistsRes.getOrDefault(emptyList())
            }

            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadInitialData()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightBlack)
    ) {
        if (isLoading) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator(color = SoundCloudNeonOrange)
                Spacer(modifier = Modifier.height(16.dp))
                Text("Loading SoundCloud Discovery...", color = TextLightGray)
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 120.dp)
            ) {
                // 1. Web App Top Header Bar (SOUNDCLOUD PRO KV MUSIC PLATFORM)
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = SoundCloudNeonOrange,
                                modifier = Modifier.size(34.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.GraphicEq,
                                        contentDescription = "SoundCloud",
                                        tint = Color.White,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "SOUNDCLOUD",
                                        style = MaterialTheme.typography.titleLarge.copy(
                                            fontWeight = FontWeight.Black,
                                            fontSize = 17.sp,
                                            letterSpacing = 0.5.sp
                                        ),
                                        color = TextElectricWhite
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Surface(
                                        color = SoundCloudNeonOrange,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "PRO",
                                            color = Color.White,
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = "KV MUSIC PLATFORM",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextLightGray
                                )
                            }
                        }

                        IconButton(onClick = onNavigateSettings) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "Settings",
                                tint = TextElectricWhite
                            )
                        }
                    }
                }

                // 2. SoundCloud Spotlight Hero Carousel
                if (trendingCharts.isNotEmpty()) {
                    val heroSlides = trendingCharts.take(5)
                    val currentSlide = heroSlides.getOrElse(heroIndex) { heroSlides.first() }

                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(210.dp)
                                .padding(horizontal = 16.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, GlassCardBorder, RoundedCornerShape(12.dp))
                                .clickable {
                                    PlayerManager.playTrack(currentSlide, trendingCharts)
                                }
                        ) {
                            AsyncImage(
                                model = currentSlide.coverUrl,
                                contentDescription = currentSlide.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            colors = listOf(
                                                Color.Black.copy(alpha = 0.3f),
                                                MidnightBlack.copy(alpha = 0.95f)
                                            )
                                        )
                                    )
                            )

                            Column(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(18.dp)
                            ) {
                                Surface(
                                    color = SoundCloudNeonOrange,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "SOUNDCLOUD SPOTLIGHT",
                                        color = Color.White,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = currentSlide.title,
                                    style = MaterialTheme.typography.headlineMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 19.sp
                                    ),
                                    color = TextElectricWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "Made for you • ${currentSlide.artist}",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
                                    color = TextLightGray,
                                    maxLines = 1
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = { PlayerManager.playTrack(currentSlide, trendingCharts) },
                                    colors = ButtonDefaults.buttonColors(containerColor = SoundCloudNeonOrange),
                                    shape = RoundedCornerShape(20.dp),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = "Listen Now",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "LISTEN NOW",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                (0..4).forEach { i ->
                                    Box(
                                        modifier = Modifier
                                            .padding(horizontal = 3.dp)
                                            .size(if (i == (heroIndex % 5)) 14.dp else 5.dp, 5.dp)
                                            .clip(CircleShape)
                                            .background(if (i == (heroIndex % 5)) SoundCloudNeonOrange else Color.White.copy(alpha = 0.5f))
                                    )
                                }
                            }
                        }
                    }
                }

                // 3. BROWSE GENRES Section
                item {
                    Spacer(modifier = Modifier.height(20.dp))
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
                                        coroutineScope.launch {
                                            val res = musicRepo.search(tile.query)
                                            if (res.isSuccess) {
                                                val tracks = res.getOrDefault(emptyList())
                                                val firstTrack = tracks.firstOrNull()
                                                if (firstTrack != null) {
                                                    PlayerManager.playTrack(firstTrack, tracks)
                                                }
                                            }
                                        }
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

                // 4. Trending on SoundCloud Section
                if (trendingCharts.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.LocalFireDepartment,
                                    contentDescription = "Trending",
                                    tint = SoundCloudNeonOrange,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Trending on SoundCloud",
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontWeight = FontWeight.Black,
                                        fontSize = 17.sp
                                    ),
                                    color = TextElectricWhite
                                )
                            }

                            Text(
                                text = "View Charts",
                                color = SoundCloudNeonOrange,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    items(trendingCharts.take(10)) { track ->
                        SoundCloudTrackCard(
                            track = track,
                            queue = trendingCharts
                        )
                    }
                }

                // 5. REAL WHO TO FOLLOW Section (Directly from /api/artists?region=vn backend API!)
                item {
                    Spacer(modifier = Modifier.height(28.dp))
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .border(1.dp, GlassCardBorder, RoundedCornerShape(12.dp)),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.PersonAdd,
                                        contentDescription = "Who to Follow",
                                        tint = SoundCloudNeonOrange,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "WHO TO FOLLOW",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp,
                                            letterSpacing = 1.sp
                                        ),
                                        color = TextElectricWhite
                                    )
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable {
                                        currentRegionIndex = (currentRegionIndex + 1) % regions.size
                                        loadArtistsForRegion(regions[currentRegionIndex])
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = "Refresh",
                                        tint = TextLightGray,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Refresh",
                                        fontSize = 11.sp,
                                        color = TextLightGray
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            topArtists.take(5).forEach { artist ->
                                val isFollowing = followedArtistIds.contains(artist.id)

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            onArtistClick(artist.name, artist.displayPhoto, artist.displayFollowers)
                                        }
                                        .padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        AsyncImage(
                                            model = artist.displayPhoto,
                                            contentDescription = artist.name,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(42.dp)
                                                .clip(CircleShape)
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(
                                                text = artist.name,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = artist.displayFollowers,
                                                fontSize = 10.sp,
                                                color = TextLightGray
                                            )
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            followedArtistIds = if (isFollowing) {
                                                followedArtistIds - artist.id
                                            } else {
                                                followedArtistIds + artist.id
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isFollowing) Color(0xFF333333) else SoundCloudNeonOrange
                                        ),
                                        shape = RoundedCornerShape(16.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                        modifier = Modifier.height(28.dp)
                                    ) {
                                        Text(
                                            text = if (isFollowing) "Following" else "Follow",
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

                // 6. TOP 50 WEEKLY CHARTS Section
                if (trendingCharts.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .border(1.dp, GlassCardBorder, RoundedCornerShape(12.dp)),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.LocalFireDepartment,
                                            contentDescription = "Charts",
                                            tint = SoundCloudNeonOrange,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "TOP 50 WEEKLY CHARTS",
                                            style = MaterialTheme.typography.titleMedium.copy(
                                                fontWeight = FontWeight.Black,
                                                fontSize = 13.sp,
                                                letterSpacing = 1.sp
                                            ),
                                            color = TextElectricWhite
                                        )
                                    }
                                    Text(
                                        text = "View Charts",
                                        color = SoundCloudNeonOrange,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                trendingCharts.take(4).forEachIndexed { idx, track ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { PlayerManager.playTrack(track, trendingCharts) }
                                            .padding(vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "#${idx + 1}",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp,
                                            color = SoundCloudNeonOrange,
                                            modifier = Modifier.width(28.dp)
                                        )
                                        AsyncImage(
                                            model = track.coverUrl,
                                            contentDescription = track.title,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(RoundedCornerShape(6.dp))
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = track.title,
                                                style = MaterialTheme.typography.bodyMedium.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                ),
                                                color = TextElectricWhite,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = track.artist,
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
                }
            }
        }
    }
}
