package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.CollectionResponse
import com.kvmusic.app.data.model.Recommendations
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.AlbumRecCard
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.TrackCard
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.util.Formatters
import kotlinx.coroutines.launch

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
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CoverImage(url = cover, title = title, size = 180.dp, cornerRadius = 16.dp)
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Album",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.7f),
                        letterSpacing = 2.sp,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(artist, fontSize = 14.sp, color = KvMuted, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(16.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .background(KvOrange, CircleShape)
                                .clickable { if (tracks.isNotEmpty()) container.playerController.playQueue(tracks, 0) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Rounded.PlayArrow,
                                contentDescription = "Phát",
                                tint = Color.White,
                                modifier = Modifier.size(32.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        IconButton(
                            onClick = {
                                scope.launch {
                                    container.libraryRepository.toggleSavedAlbum(albumId, title, artist, cover)
                                    Toaster.show(if (isSaved) "Đã bỏ lưu album" else "Đã lưu album")
                                }
                            },
                        ) {
                            Icon(
                                imageVector = if (isSaved) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                                contentDescription = "Lưu album",
                                tint = if (isSaved) KvOrange else Color.White,
                                modifier = Modifier.size(28.dp),
                            )
                        }
                    }
                }
            }

            if (tracks.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("Không có bài hát nào", fontSize = 14.sp, color = KvMuted)
                    }
                }
            } else {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "#",
                            fontSize = 12.sp,
                            color = KvFaint,
                            modifier = Modifier.width(28.dp),
                            textAlign = TextAlign.Center,
                        )
                        Text("Title", fontSize = 12.sp, color = KvFaint, modifier = Modifier.weight(1f))
                        Icon(
                            Icons.Rounded.Schedule,
                            contentDescription = null,
                            tint = KvFaint,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                }
                itemsIndexed(tracks) { index, track ->
                    TrackRow(
                        track = track,
                        index = index + 1,
                        isCurrent = playerState.currentTrack?.id == track.id,
                        trailing = {
                            Text(Formatters.duration(track.duration), fontSize = 12.sp, color = KvFaint)
                        },
                        onClick = { container.playerController.playQueue(tracks, index) },
                    )
                }
            }

            val rec = recommendations
            if (rec != null && (rec.tracks.isNotEmpty() || rec.albums.isNotEmpty())) {
                item { Spacer(Modifier.height(20.dp)) }
                item {
                    SectionHeader(title = "Gợi ý", modifier = Modifier.padding(horizontal = 16.dp))
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
private fun CollectionSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SkeletonBox(width = 180.dp, height = 180.dp, shape = RoundedCornerShape(16.dp))
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
