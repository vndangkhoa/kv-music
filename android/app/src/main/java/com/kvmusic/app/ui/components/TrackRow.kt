package com.kvmusic.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.util.Formatters

@Composable
fun TrackRow(
    track: Track,
    index: Int? = null,
    isCurrent: Boolean = false,
    isPlaying: Boolean? = null,
    trailing: @Composable RowScope.() -> Unit = {},
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(),
                onClick = onClick
            )
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (index != null) {
            Box(
                modifier = Modifier.width(24.dp),
                contentAlignment = Alignment.Center
            ) {
                if (isCurrent) {
                    EqIndicator(playing = isPlaying ?: true)
                } else {
                    Text(
                        text = index.toString(),
                        textAlign = TextAlign.Center,
                        fontSize = 13.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Faint
                    )
                }
            }
        }
        CoverImage(url = track.cover_url, title = track.title, size = 42.dp, cornerRadius = 12.dp)
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 15.sp,
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                color = Fg
            )
            Text(
                text = track.artist,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 12.sp,
                color = Muted
            )
        }
        if (track.duration > 0) {
            Spacer(Modifier.width(8.dp))
            Text(
                text = Formatters.duration(track.duration),
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                color = Muted
            )
        }
        Spacer(Modifier.width(8.dp))
        trailing()
    }
}
