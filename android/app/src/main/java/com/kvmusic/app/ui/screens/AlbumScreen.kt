package com.kvmusic.app.ui.screens

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
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
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.CollectionResponse
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.AlbumRecCard
import com.kvmusic.app.ui.components.EqIndicator
import com.kvmusic.app.ui.components.KvPlayButton
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackCard
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
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.util.Formatters
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AlbumScreen(albumId: String) {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()

    var collection by remember { mutableStateOf<CollectionResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var recommendations by remember { mutableStateOf<Recommendations?>(null) }
    val savedAlbums by container.libraryRepository.savedAlbums.collectAsState(initial = emptyList())
    val playerState by container.playerController.state.collectAsState()

    LaunchedEffect(albumId) {
        loading = true
        collection = null
        recommendations = null
        collection = container.musicRepository.collection(albumId)
        loading = false
        recommendations = container.musicRepository.recommendations(albumId, "album", 10)
    }

    val tracks = collection?.tracks.orEmpty()
    val title = collection?.title ?: ""
    val cover = collection?.cover_url.orEmpty()
    val artist = tracks.firstOrNull()?.artist ?: "Various Artists"
    val isSaved = savedAlbums.any { it.id == albumId }

    when {
        loading -> CollectionSkeleton()
        collection == null -> ErrorState("Không tìm thấy album")
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
                        Text("Album", style = NavTitle, color = Fg)
                    }
                    Spacer(Modifier.height(18.dp))
                    Row {
                        CoverImage(url = cover, title = title, size = 128.dp, cornerRadius = 20.dp)
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Album",
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
                            Text(
                                text = "$artist · ${tracks.size} bài hát",
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
                                KvPlayButton(
                                    onClick = { if (tracks.isNotEmpty()) container.playerController.playQueue(tracks, 0) },
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                    contentDescription = "Phát",
                                )
                                ShufflePill(
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                    onClick = { if (tracks.isNotEmpty()) container.playerController.playQueue(tracks.shuffled(), 0) },
                                )
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .align(Alignment.CenterVertically)
                                        .clickable {
                                            scope.launch {
                                                container.libraryRepository.toggleSavedAlbum(albumId, title, artist, cover)
                                                Toaster.show(if (isSaved) "Đã bỏ lưu album" else "Đã lưu album")
                                            }
                                        },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        imageVector = if (isSaved) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                                        contentDescription = "Lưu album",
                                        tint = if (isSaved) KvOrange else Fg2,
                                        modifier = Modifier.size(22.dp),
                                    )
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                }
            }

            item {
                if (tracks.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("Không có bài hát nào", fontSize = 13.sp, color = Muted)
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .padding(horizontal = 16.dp)
                            .glass(KvShapeCard),
                    ) {
                        tracks.forEachIndexed { index, track ->
                            CollectionTrackRow(
                                index = index,
                                track = track,
                                isCurrent = playerState.currentTrack?.id == track.id,
                                isPlaying = playerState.isPlaying,
                                onClick = { container.playerController.playQueue(tracks, index) },
                            )
                            if (index < tracks.lastIndex) {
                                Box(Modifier.fillMaxWidth().height(0.5.dp).background(Hair))
                            }
                        }
                    }
                }
            }

            val rec = recommendations
            if (rec != null && (rec.tracks.isNotEmpty() || rec.albums.isNotEmpty())) {
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
