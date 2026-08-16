package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.kvmusic.app.ui.theme.ArtA
import com.kvmusic.app.ui.theme.ArtBorder
import com.kvmusic.app.ui.theme.ArtC
import com.kvmusic.app.ui.theme.T1End
import com.kvmusic.app.ui.theme.T1Start
import com.kvmusic.app.ui.theme.T2End
import com.kvmusic.app.ui.theme.T2Start

private val ArtPalettes = listOf(
    listOf(ArtA, ArtC),
    listOf(T1Start, T1End),
    listOf(T2Start, T2End),
)

internal fun coverGradient(seed: String): Brush {
    val palette = ArtPalettes[Math.floorMod(seed.hashCode(), ArtPalettes.size)]
    return Brush.linearGradient(palette)
}

@Composable
fun CoverImage(
    url: String?,
    title: String,
    size: Dp,
    cornerRadius: Dp = 8.dp,
    modifier: Modifier = Modifier,
    initials: Boolean = false,
) {
    val shape = RoundedCornerShape(cornerRadius)
    val hasImage = !url.isNullOrBlank()
    var loaded by remember(url) { mutableStateOf(false) }
    val seed = url?.takeIf { it.isNotBlank() } ?: title
    val brush = remember(seed) { coverGradient(seed) }
    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(brush)
            .border(1.dp, ArtBorder, shape),
        contentAlignment = Alignment.Center
    ) {
        if (hasImage) {
            AsyncImage(
                model = url,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(if (loaded) 1f else 0f),
                onSuccess = { loaded = true },
                onLoading = { loaded = false },
                onError = { loaded = false }
            )
        }
        if (!hasImage || !loaded) {
            if (initials) {
                val text = coverInitials(title)
                if (text.isNotEmpty()) {
                    Text(
                        text = text,
                        fontSize = with(LocalDensity.current) { (size * 0.30f).toSp() },
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White.copy(alpha = 0.66f),
                    )
                } else {
                    FallbackIcon(size)
                }
            } else {
                FallbackIcon(size)
            }
        }
    }
}

@Composable
private fun FallbackIcon(size: Dp) {
    Icon(
        imageVector = Icons.Rounded.MusicNote,
        contentDescription = null,
        tint = Color.White.copy(alpha = 0.6f),
        modifier = Modifier.size(size * 0.35f)
    )
}

private fun coverInitials(title: String): String {
    val words = title.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return words.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
}
