package com.kvmusic.app.ui.screens

import android.provider.Settings
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.CollectionResponse
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.components.AlbumRecCard
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.PlaylistRecCard
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackCard
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.AccentGlow
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.HeroTitle
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.PlayButtonColors
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.util.Formatters

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlaylistScreen(playlistId: String) {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current

    var collection by remember { mutableStateOf<CollectionResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var recommendations by remember { mutableStateOf<Recommendations?>(null) }
    val playerState by container.playerController.state.collectAsState()

    LaunchedEffect(playlistId) {
        loading = true
        collection = null
        recommendations = null
        collection = container.musicRepository.collection(playlistId)
        loading = false
        recommendations = container.musicRepository.recommendations(playlistId, "playlist", 10)
    }

    val tracks = collection?.tracks.orEmpty()
    val title = collection?.title ?: ""
    val cover = collection?.cover_url?.takeIf { it.isNotBlank() }
        ?: tracks.firstOrNull()?.cover_url.orEmpty()

    when {
        loading -> CollectionSkeleton()
        collection == null -> ErrorState("Không tìm thấy playlist")
        else -> LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 160.dp),
        ) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        GlassBack(onClick = { nav.popBackStack() })
                        Spacer(Modifier.width(12.dp))
                        Text("Danh sách phát", style = NavTitle, color = Fg)
                    }
                    Spacer(Modifier.height(18.dp))
                    Row {
                        CoverImage(url = cover, title = title, size = 128.dp, cornerRadius = 20.dp)
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Playlist",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 0.08.em,
                                color = Muted,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                title,
                                style = HeroTitle,
                                color = Fg,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(6.dp))
                            val artist = tracks.firstOrNull()?.artist
                            Text(
                                text = if (artist.isNullOrBlank()) "${tracks.size} bài hát" else "by $artist · ${tracks.size} bài hát",
                                fontSize = 13.sp,
                                color = Muted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(14.dp))
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                PlayButton(
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                    onClick = { if (tracks.isNotEmpty()) container.playerController.playQueue(tracks, 0) },
                                )
                                ShufflePill(
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                    onClick = { if (tracks.isNotEmpty()) container.playerController.playQueue(tracks.shuffled(), 0) },
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                }
            }

            if (tracks.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("Không có bài hát nào", fontSize = 13.sp, color = Muted)
                    }
                }
            } else {
                itemsIndexed(
                    items = tracks,
                    key = { _, track -> track.id },
                ) { index, track ->
                    val shape = if (tracks.size == 1) {
                        RoundedCornerShape(20.dp)
                    } else {
                        when (index) {
                            0 -> RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
                            tracks.lastIndex -> RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)
                            else -> RectangleShape
                        }
                    }
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                    ) {
                        CollectionTrackRow(
                            index = index,
                            track = track,
                            isCurrent = playerState.currentTrack?.id == track.id,
                            isPlaying = playerState.isPlaying,
                            onClick = { container.playerController.playQueue(tracks, index) },
                            modifier = Modifier.background(Color.White.copy(alpha = 0.04f), shape),
                        )
                        if (index < tracks.lastIndex) {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height(0.5.dp)
                                    .background(Hair),
                            )
                        }
                    }
                }
            }

            val rec = recommendations
            if (rec != null && (rec.tracks.isNotEmpty() || rec.albums.isNotEmpty() || rec.playlists.isNotEmpty())) {
                item { Spacer(Modifier.height(20.dp)) }
                item {
                    SectionHeader(title = "Có thể bạn thích", modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (rec.tracks.isNotEmpty()) {
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(rec.tracks) { track ->
                                TrackCard(
                                    track = track,
                                    onPlay = { container.playerController.playQueue(rec.tracks, rec.tracks.indexOf(track)) },
                                )
                            }
                        }
                    }
                }
                if (rec.albums.isNotEmpty()) {
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(rec.albums) { album ->
                                AlbumRecCard(
                                    album = album,
                                    onClick = { nav.navigate(Routes.album(album.id)) },
                                )
                            }
                        }
                    }
                }
                if (rec.playlists.isNotEmpty()) {
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(rec.playlists) { playlist ->
                                PlaylistRecCard(
                                    playlist = playlist,
                                    onClick = { nav.navigate(Routes.playlist(playlist.id)) },
                                )
                            }
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
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
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
private fun PlayButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(52.dp)
            .shadow(18.dp, CircleShape, spotColor = AccentGlow, ambientColor = AccentGlow)
            .background(PlayButtonColors.bg, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Rounded.PlayArrow,
            contentDescription = "Phát",
            tint = PlayButtonColors.fg,
            modifier = Modifier.size(22.dp),
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
private fun EqIndicator(playing: Boolean, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val reducedMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    Box(modifier = modifier.size(16.dp), contentAlignment = Alignment.BottomCenter) {
        if (playing && !reducedMotion) {
            val transition = rememberInfiniteTransition(label = "eq")
            val b1 by transition.animateFloat(0.55f, 1f, infiniteRepeatable(tween(520), RepeatMode.Reverse), label = "eq1")
            val b2 by transition.animateFloat(1f, 0.6f, infiniteRepeatable(tween(430, delayMillis = 150), RepeatMode.Reverse), label = "eq2")
            val b3 by transition.animateFloat(0.7f, 1f, infiniteRepeatable(tween(480, delayMillis = 75), RepeatMode.Reverse), label = "eq3")
            EqBars(b1, b2, b3)
        } else {
            EqBars(0.7f, 1f, 0.85f)
        }
    }
}

@Composable
private fun EqBars(b1: Float, b2: Float, b3: Float) {
    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        Box(Modifier.width(3.dp).height(8.dp * b1).background(KvOrange.copy(alpha = 0.5f), RoundedCornerShape(1.5.dp)))
        Box(Modifier.width(3.dp).height(14.dp * b2).background(KvOrange, RoundedCornerShape(1.5.dp)))
        Box(Modifier.width(3.dp).height(10.dp * b3).background(KvOrange.copy(alpha = 0.7f), RoundedCornerShape(1.5.dp)))
    }
}

@Composable
private fun CollectionSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SkeletonBox(width = 128.dp, height = 128.dp, shape = RoundedCornerShape(20.dp))
        Spacer(Modifier.height(20.dp))
        SkeletonBox(width = 200.dp, height = 18.dp, shape = RoundedCornerShape(9.dp))
        Spacer(Modifier.height(8.dp))
        SkeletonBox(width = 120.dp, height = 14.dp, shape = RoundedCornerShape(7.dp))
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
