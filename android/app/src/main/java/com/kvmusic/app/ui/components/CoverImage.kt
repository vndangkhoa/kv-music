package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage

private val CoverPalette = listOf("#1DB954", "#FF6B6B", "#4ECDC4", "#45B7D1", "#6C5CE7", "#FDCB6E")

internal fun coverColor(seed: String): Color {
    val hex = CoverPalette[Math.floorMod(seed.hashCode(), CoverPalette.size)]
    val rgb = hex.removePrefix("#").toLong(16)
    return Color(0xFF000000L or rgb)
}

internal fun coverGradient(seed: String): Brush {
    val base = coverColor(seed)
    val dark = Color(base.red * 0.5f, base.green * 0.5f, base.blue * 0.5f)
    return Brush.linearGradient(listOf(base, dark))
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
    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(coverGradient(title)),
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
                        fontSize = with(LocalDensity.current) { (size * 0.34f).toSp() },
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.6f),
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
        tint = Color.White.copy(alpha = 0.7f),
        modifier = Modifier.size(size * 0.35f)
    )
}

private fun coverInitials(title: String): String {
    val words = title.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return words.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
}
