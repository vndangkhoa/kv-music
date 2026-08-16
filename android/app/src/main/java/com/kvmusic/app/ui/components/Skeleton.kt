package com.kvmusic.app.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.T1End
import com.kvmusic.app.ui.theme.T1Start
import com.kvmusic.app.ui.theme.T2End
import com.kvmusic.app.ui.theme.T2Start

@Composable
fun SkeletonBox(
    width: Dp,
    height: Dp,
    shape: Shape = RoundedCornerShape(8.dp),
    modifier: Modifier = Modifier,
    art: Boolean = false,
    index: Int = 0,
) {
    val transition = rememberInfiniteTransition()
    val alpha by transition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Reverse),
    )
    Box(
        modifier = modifier
            .size(width, height)
            .clip(shape)
            .then(
                if (art) {
                    val palette = if (index % 2 == 0) listOf(T1Start, T1End) else listOf(T2Start, T2End)
                    Modifier.background(Brush.linearGradient(palette))
                } else {
                    Modifier.background(Color.White.copy(alpha = 0.05f))
                },
            )
            .alpha(alpha),
    )
}

@Composable
fun TrackRowSkeleton(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SkeletonBox(
            width = 48.dp,
            height = 48.dp,
            shape = RoundedCornerShape(12.dp),
            art = true,
            index = 0,
        )
        Spacer(Modifier.width(10.dp))
        Column {
            SkeletonBox(width = 160.dp, height = 14.dp)
            Spacer(Modifier.height(8.dp))
            SkeletonBox(width = 100.dp, height = 12.dp)
        }
    }
}
