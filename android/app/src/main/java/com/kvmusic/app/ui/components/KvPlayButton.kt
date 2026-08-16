package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.PlayButtonColors

private val NoContent: @Composable BoxScope.() -> Unit = {}

@Composable
fun KvPlayButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 52.dp,
    iconSize: Dp = 20.dp,
    shadowRadius: Dp = 10.dp,
    icon: ImageVector = Icons.Rounded.PlayArrow,
    contentDescription: String? = null,
    content: @Composable BoxScope.() -> Unit = NoContent,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val shape = RoundedCornerShape(50)
    Box(
        modifier = modifier
            .size(size)
            .graphicsLayer {
                scaleX = if (pressed) 0.95f else 1f
                scaleY = if (pressed) 0.95f else 1f
            }
            .shadow(shadowRadius, shape, spotColor = PlayButtonColors.glow, ambientColor = PlayButtonColors.glow)
            .background(PlayButtonColors.bg, shape)
            .clickable(interactionSource = interaction, indication = ripple(), onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (content === NoContent) {
            Icon(
                imageVector = icon,
                contentDescription = contentDescription,
                tint = PlayButtonColors.fg,
                modifier = Modifier.size(iconSize),
            )
        } else {
            content()
        }
    }
}
