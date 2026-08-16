package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.theme.AccentSoft
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.TrackTitle
import com.kvmusic.app.ui.theme.glass
import com.kvmusic.app.util.Formatters
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
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.navigationBars),
        contentPadding = PaddingValues(top = 18.dp, bottom = 160.dp),
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                Text(
                    text = "Bài hát đã thích",
                    style = LargeTitle,
                    color = Fg,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = if (loading) " " else "${tracks.size} bài hát",
                    fontSize = 13.sp,
                    color = Muted,
                    fontFamily = FontFamily.Monospace,
                        )
            }
        }

        when {
            loading -> {
                items(count = 8, key = { "skeleton-$it" }) {
                    Column {
                        Spacer(Modifier.height(14.dp))
                        TrackRowSkeleton()
                    }
                }
            }
            tracks.isEmpty() -> {
                vGap(14.dp)
                item { EmptyLikes() }
            }
            else -> {
                vGap(14.dp)
                itemsIndexed(tracks, key = { _, track -> track.id }) { index, track ->
                    GlassTrackRow(
                        isFirst = index == 0,
                        isLast = index == tracks.lastIndex,
                        showDivider = index > 0,
                    ) {
                        LikedRow(
                            track = track,
                            isCurrent = playerState.currentTrack?.id == track.id,
                            onToggleLiked = {
                                scope.launch {
                                    container.libraryRepository.toggleLiked(track)
                                    Toaster.show("Đã bỏ thích")
                                }
                            },
                            onClick = { container.playerController.playQueue(tracks, index) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LikedRow(
    track: Track,
    isCurrent: Boolean,
    onToggleLiked: () -> Unit,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CoverImage(
            url = track.cover_url,
            title = track.title,
            size = 42.dp,
            cornerRadius = 12.dp,
        )
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                style = TrackTitle,
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                color = Fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
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
            fontSize = 12.sp,
            color = Muted,
            fontFamily = FontFamily.Monospace,
        )
        Box(
            modifier = Modifier
                .size(40.dp)
                .clickable(onClick = onToggleLiked),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.Favorite,
                contentDescription = "Bỏ thích",
                tint = KvOrange,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun GlassTrackRow(
    isFirst: Boolean,
    isLast: Boolean,
    showDivider: Boolean,
    content: @Composable () -> Unit,
) {
    val shape = when {
        isFirst && isLast -> RoundedCornerShape(20.dp)
        isFirst -> RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
        isLast -> RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)
        else -> RectangleShape
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(shape)
            .background(Color.White.copy(alpha = 0.04f), shape)
            .padding(top = if (isFirst) 4.dp else 0.dp, bottom = if (isLast) 4.dp else 0.dp),
    ) {
        if (showDivider) {
            HorizontalDivider(color = Hair, thickness = 0.5.dp)
        }
        content()
    }
}

private fun LazyListScope.vGap(height: Dp) {
    item { Spacer(Modifier.height(height)) }
}

@Composable
private fun EmptyLikes() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 24.dp)
            .glass(KvShapeCard)
            .padding(horizontal = 32.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .background(AccentSoft, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.FavoriteBorder,
                contentDescription = null,
                tint = KvOrange,
                modifier = Modifier.size(32.dp),
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Bài hát bạn thích sẽ xuất hiện ở đây",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = Fg,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Lưu bài hát bằng cách chạm vào biểu tượng trái tim",
            fontSize = 13.sp,
            color = Muted,
            textAlign = TextAlign.Center,
        )
    }
}
