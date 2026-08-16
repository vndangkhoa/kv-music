package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.ArtA
import com.kvmusic.app.ui.theme.ArtBorder
import com.kvmusic.app.ui.theme.ArtC
import com.kvmusic.app.ui.theme.T1End
import com.kvmusic.app.ui.theme.T1Start
import com.kvmusic.app.ui.theme.T2End
import com.kvmusic.app.ui.theme.T2Start

@Composable
fun PlaylistArtStack(modifier: Modifier = Modifier, seed: Int = 0) {
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(76.dp)
            .clip(shape)
            .background(Brush.linearGradient(listOf(ArtA, ArtC)))
            .border(1.dp, ArtBorder, shape),
    ) {
        ArtStackTile(offsetX = 10.dp, offsetY = 10.dp, t2 = seed % 2 == 1)
        ArtStackTile(offsetX = 30.dp, offsetY = 30.dp, t2 = seed % 2 == 0)
    }
}

@Composable
private fun ArtStackTile(offsetX: Dp, offsetY: Dp, t2: Boolean) {
    val shape = RoundedCornerShape(10.dp)
    Box(
        modifier = Modifier
            .offset(offsetX, offsetY)
            .size(46.dp)
            .clip(shape)
            .background(
                Brush.linearGradient(if (t2) listOf(T2Start, T2End) else listOf(T1Start, T1End)),
            )
            .border(1.dp, ArtBorder, shape),
    )
}
