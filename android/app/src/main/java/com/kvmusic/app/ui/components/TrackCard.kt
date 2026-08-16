package com.kvmusic.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kvmusic.app.data.model.AlbumSuggestion
import com.kvmusic.app.data.model.PlaylistSuggestion
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.theme.CardTitle
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.Meta
import com.kvmusic.app.ui.theme.Muted

private val CardSurfaceShape = RoundedCornerShape(20.dp)
private val CardPadding = 10.dp

@Composable
private fun CardSurface(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.97f else 1f, label = "cardScale")
    Column(
        modifier = modifier
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(CardSurfaceShape)
            .background(Color.White.copy(alpha = 0.05f))
            .border(0.5.dp, GlassBorder, CardSurfaceShape)
            .padding(CardPadding)
            .clickable(
                interactionSource = interaction,
                indication = ripple(),
                onClick = onClick
            ),
        content = content
    )
}

@Composable
fun TrackCard(
    track: Track,
    onPlay: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 140.dp,
) {
    CardSurface(modifier = modifier.width(width), onClick = onPlay) {
        Box(modifier = Modifier.size(width - CardPadding * 2)) {
            CoverImage(
                url = track.cover_url,
                title = track.title,
                size = width - CardPadding * 2,
                cornerRadius = 16.dp,
            )
            KvPlayButton(
                onClick = onPlay,
                size = 40.dp,
                shadowRadius = 8.dp,
                modifier = Modifier.align(Alignment.Center),
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = track.title,
            style = CardTitle,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = track.artist,
            style = Meta,
            color = Muted,
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
    CardSurface(modifier = Modifier.width(width), onClick = onClick) {
        CoverImage(
            url = album.cover_url,
            title = album.title,
            size = width - CardPadding * 2,
            cornerRadius = 16.dp,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = album.title,
            style = CardTitle,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = album.artist,
            style = Meta,
            color = Muted,
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
    CardSurface(modifier = Modifier.width(width), onClick = onClick) {
        CoverImage(
            url = playlist.cover_url,
            title = playlist.title,
            size = width - CardPadding * 2,
            cornerRadius = 16.dp,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = playlist.title,
            style = CardTitle,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
