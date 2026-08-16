package com.kvmusic.app.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import kotlinx.coroutines.launch

@Composable
fun CollectionScreen() {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val scope = rememberCoroutineScope()
    val playerState by container.playerController.state.collectAsStateWithLifecycle()

    var liked by remember { mutableStateOf<List<Track>?>(null) }
    LaunchedEffect(container) {
        container.libraryRepository.likedTracks.collect { liked = it }
    }

    val tracks = liked ?: emptyList()
    val loading = liked == null

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 160.dp),
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.Favorite,
                        contentDescription = null,
                        tint = KvOrange,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Bài hát đã thích",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = if (loading) " " else "${tracks.size} bài hát",
                    fontSize = 13.sp,
                    color = KvMuted,
                )
            }
        }

        when {
            loading -> {
                items(count = 8, key = { "skeleton-$it" }) {
                    TrackRowSkeleton()
                }
            }
            tracks.isEmpty() -> {
                item { EmptyLikes() }
            }
            else -> {
                itemsIndexed(tracks, key = { _, track -> track.id }) { index, track ->
                    TrackRow(
                        track = track,
                        index = index + 1,
                        isCurrent = playerState.currentTrack?.id == track.id,
                        trailing = {
                            IconButton(onClick = {
                                scope.launch {
                                    container.libraryRepository.toggleLiked(track)
                                    Toaster.show("Đã bỏ thích")
                                }
                            }) {
                                Icon(
                                    imageVector = Icons.Rounded.Favorite,
                                    contentDescription = "Bỏ thích",
                                    tint = KvOrange,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        },
                        onClick = { container.playerController.playQueue(tracks, index) },
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyLikes() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Rounded.FavoriteBorder,
            contentDescription = null,
            tint = KvFaint,
            modifier = Modifier.size(64.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Bài hát bạn thích sẽ xuất hiện ở đây",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Lưu bài hát bằng cách chạm vào biểu tượng trái tim",
            fontSize = 13.sp,
            color = KvMuted,
            textAlign = TextAlign.Center,
        )
    }
}
