package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.ArtistSuggestion
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.EqIndicator
import com.kvmusic.app.ui.components.KvPlayButton
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.HeroTitle
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.OnAccent
import com.kvmusic.app.ui.theme.glass
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
                        .padding(horizontal = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        GlassBack(onClick = { nav.popBackStack() })
                        Spacer(Modifier.width(12.dp))
                        Text(
                            name,
                            style = NavTitle,
                            color = Fg,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Spacer(Modifier.height(20.dp))
                    Box(modifier = Modifier.size(128.dp), contentAlignment = Alignment.Center) {
                        Box(Modifier.fillMaxSize().glass(CircleShape))
                        ArtistAvatar(url = photo, name = name, size = 120.dp)
                    }
                    Spacer(Modifier.height(14.dp))
                    Text(
                        name,
                        style = HeroTitle,
                        color = Fg,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(14.dp))
                    FollowPill(
                        following = isFollowing,
                        onClick = {
                            scope.launch {
                                container.libraryRepository.toggleFollowArtist(artistId, name, photo ?: "")
                                Toaster.show(if (isFollowing) "Đã bỏ theo dõi $name" else "Đã theo dõi $name")
                            }
                        },
                    )
                    if (recTracks.isNotEmpty()) {
                        Spacer(Modifier.height(18.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            KvPlayButton(
                                onClick = { container.playerController.playQueue(recTracks, 0) },
                                contentDescription = "Phát",
                            )
                            Spacer(Modifier.width(10.dp))
                            ShufflePill(onClick = { container.playerController.playQueue(recTracks.shuffled(), 0) })
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }
            }

            if (recTracks.isNotEmpty()) {
                item {
                    SectionHeader(title = "Có thể bạn thích", modifier = Modifier.padding(horizontal = 16.dp))
                }
                item {
                    Column(
                        modifier = Modifier
                            .padding(horizontal = 16.dp)
                            .glass(KvShapeCard),
                    ) {
                        recTracks.forEachIndexed { index, track ->
                            CollectionTrackRow(
                                index = index,
                                track = track,
                                isCurrent = playerState.currentTrack?.id == track.id,
                                isPlaying = playerState.isPlaying,
                                onClick = { container.playerController.playQueue(recTracks, index) },
                            )
                            if (index < recTracks.lastIndex) {
                                Box(Modifier.fillMaxWidth().height(0.5.dp).background(Hair))
                            }
                        }
                    }
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
private fun CollectionTrackRow(
    index: Int,
    track: Track,
    isCurrent: Boolean,
    isPlaying: Boolean,
    onClick: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
    ) {
        Text(
            text = "${index + 1}",
            modifier = Modifier.width(22.dp),
            textAlign = TextAlign.End,
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            color = if (isCurrent) Fg else Muted,
            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
        )
        if (isCurrent) {
            Spacer(Modifier.width(6.dp))
            EqIndicator(playing = isPlaying)
        } else {
            Spacer(Modifier.width(22.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                fontSize = 15.sp,
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                color = Fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = track.artist,
                fontSize = 12.sp,
                color = Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.width(8.dp))
        Text(
            text = Formatters.duration(track.duration),
            fontSize = 13.sp,
            fontFamily = FontFamily.Monospace,
            color = Muted,
        )
    }
}

@Composable
private fun FollowPill(following: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .height(40.dp)
            .then(
                if (following) Modifier.glass(KvShapePill)
                else Modifier.background(KvOrange, KvShapePill)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp),
    ) {
        Text(
            text = if (following) "Đang theo dõi" else "Theo dõi",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (following) Fg2 else OnAccent,
        )
    }
}

@Composable
private fun GlassBack(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(36.dp)
            .glass(CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
            contentDescription = "Quay lại",
            tint = Fg2,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun ShufflePill(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .height(44.dp)
            .glass(KvShapePill)
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp),
    ) {
        Icon(
            imageVector = Icons.Rounded.Shuffle,
            contentDescription = null,
            tint = Fg2,
            modifier = Modifier.size(17.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = "Phát ngẫu nhiên",
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = Fg2,
        )
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
        SkeletonBox(width = 128.dp, height = 128.dp, shape = RoundedCornerShape(64.dp))
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
        Box(modifier = Modifier.size(88.dp), contentAlignment = Alignment.Center) {
            Box(Modifier.fillMaxSize().glass(CircleShape))
            ArtistAvatar(url = artist.photo_url, name = artist.name, size = 80.dp)
        }
        Spacer(Modifier.height(8.dp))
        Text(
            artist.name,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(2.dp))
        Text("Nghệ sĩ", fontSize = 11.sp, color = Muted)
    }
}
