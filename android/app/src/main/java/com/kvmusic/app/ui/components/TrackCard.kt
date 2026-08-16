package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.model.AlbumSuggestion
import com.kvmusic.app.data.model.PlaylistSuggestion
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange

@Composable
fun TrackCard(
    track: Track,
    onPlay: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 140.dp,
) {
    Column(
        modifier = modifier
            .width(width)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onPlay),
    ) {
        Box(modifier = Modifier.size(width)) {
            CoverImage(
                url = track.cover_url,
                title = track.title,
                size = width,
                cornerRadius = 10.dp,
            )
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(44.dp)
                    .shadow(8.dp, CircleShape, spotColor = KvOrange.copy(alpha = 0.4f))
                    .background(KvOrange)
                    .alpha(0.95f),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.PlayArrow,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = track.title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = track.artist,
            fontSize = 11.sp,
            color = KvMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun AlbumRecCard(
    album: AlbumSuggestion,
    onClick: () -> Unit,
    width: Dp = 140.dp,
) {
    Column(
        modifier = Modifier
            .width(width)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
    ) {
        CoverImage(
            url = album.cover_url,
            title = album.title,
            size = width,
            cornerRadius = 10.dp,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = album.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = album.artist,
            fontSize = 11.sp,
            color = KvMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun PlaylistRecCard(
    playlist: PlaylistSuggestion,
    onClick: () -> Unit,
    width: Dp = 140.dp,
) {
    Column(
        modifier = Modifier
            .width(width)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
    ) {
        CoverImage(
            url = playlist.cover_url,
            title = playlist.title,
            size = width,
            cornerRadius = 10.dp,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = playlist.title,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
