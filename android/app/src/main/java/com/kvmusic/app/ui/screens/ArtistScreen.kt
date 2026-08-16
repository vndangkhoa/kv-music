package com.kvmusic.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.ArtistSuggestion
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.util.Formatters
import kotlinx.coroutines.launch

@Composable
fun ArtistScreen(artistId: String, artistName: String? = null) {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()

    val name = artistName ?: artistId

    var photo by remember { mutableStateOf<String?>(null) }
    var recommendations by remember { mutableStateOf<Recommendations?>(null) }
    var loading by remember { mutableStateOf(true) }
    val followedArtists by container.libraryRepository.followedArtists.collectAsState(initial = emptyList())
    val playerState by container.playerController.state.collectAsState()

    LaunchedEffect(name) {
        loading = true
        photo = container.musicRepository.artistPhoto(name)
        recommendations = container.musicRepository.recommendations(name, "artist", 10)
        loading = false
    }

    val isFollowing = followedArtists.any { it.id == artistId }
    val recTracks = recommendations?.tracks.orEmpty()
    val recArtists = recommendations?.artists.orEmpty()

    val hostBlank = container.serverConfigStore.currentHost().isBlank()
    when {
        hostBlank -> ErrorState("Chưa kết nối máy chủ")
        loading -> ArtistSkeleton()
        else -> LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 160.dp),
        ) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    ArtistAvatar(url = photo, name = name, size = 120.dp)
                    Spacer(Modifier.height(16.dp))
                    Text(
                        name,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(12.dp))
                    if (isFollowing) {
                        Button(
                            onClick = {
                                scope.launch {
                                    container.libraryRepository.toggleFollowArtist(artistId, name, photo ?: "")
                                    Toaster.show("Đã bỏ theo dõi $name")
                                }
                            },
                            shape = CircleShape,
                            colors = ButtonDefaults.buttonColors(containerColor = KvOrange, contentColor = Color.White),
                        ) {
                            Text("Đang theo dõi", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    container.libraryRepository.toggleFollowArtist(artistId, name, photo ?: "")
                                    Toaster.show("Đã theo dõi $name")
                                }
                            },
                            shape = CircleShape,
                            border = BorderStroke(1.dp, KvBorder),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        ) {
                            Text("Theo dõi", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            if (recTracks.isNotEmpty()) {
                item {
                    SectionHeader(title = "Gợi ý", modifier = Modifier.padding(horizontal = 16.dp))
                }
                itemsIndexed(recTracks) { index, track ->
                    TrackRow(
                        track = track,
                        index = index + 1,
                        isCurrent = playerState.currentTrack?.id == track.id,
                        trailing = {
                            Text(Formatters.duration(track.duration), fontSize = 12.sp, color = KvFaint)
                        },
                        onClick = { container.playerController.playQueue(recTracks, index) },
                    )
                }
            }

            if (recArtists.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(20.dp))
                    SectionHeader(title = "Nghệ sĩ tương tự", modifier = Modifier.padding(horizontal = 16.dp))
                }
                item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp)) {
                        items(recArtists) { artist ->
                            SimilarArtistCard(
                                artist = artist,
                                onClick = { nav.navigate(Routes.artist(artist.id, artist.name)) },
                            )
                        }
                    }
                }
            }
            }
        }
}

@Composable
private fun ArtistSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SkeletonBox(width = 120.dp, height = 120.dp, shape = RoundedCornerShape(60.dp))
        Spacer(Modifier.height(16.dp))
        SkeletonBox(width = 160.dp, height = 20.dp, shape = RoundedCornerShape(10.dp))
        Spacer(Modifier.height(12.dp))
        SkeletonBox(width = 110.dp, height = 36.dp, shape = RoundedCornerShape(18.dp))
        Spacer(Modifier.height(24.dp))
        TrackRowSkeleton()
        TrackRowSkeleton()
        TrackRowSkeleton()
    }
}

@Composable
private fun ErrorState(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(message, fontSize = 14.sp, color = KvMuted)
    }
}

@Composable
private fun SimilarArtistCard(artist: ArtistSuggestion, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(110.dp)
            .padding(end = 12.dp)
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ArtistAvatar(url = artist.photo_url, name = artist.name, size = 80.dp)
        Spacer(Modifier.height(8.dp))
        Text(
            artist.name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(2.dp))
        Text("Nghệ sĩ", fontSize = 11.sp, color = KvMuted)
    }
}
