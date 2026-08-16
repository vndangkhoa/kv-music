package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.kvmusic.app.ui.theme.GlassBorder

@Composable
fun ArtistAvatar(url: String?, name: String, size: Dp, modifier: Modifier = Modifier) {
    val hasImage = !url.isNullOrBlank()
    var loaded by remember(url) { mutableStateOf(false) }
    val initialsSize = with(LocalDensity.current) { (size * 0.32f).toSp() }
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(coverGradient(name))
            .border(2.dp, GlassBorder, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        if (hasImage) {
            AsyncImage(
                model = url,
                contentDescription = name,
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
            Text(
                text = artistInitials(name),
                color = Color.White,
                fontSize = initialsSize,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

private fun artistInitials(name: String): String {
    val words = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    val initials = words.take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString("")
    return if (initials.isEmpty()) "♪" else initials
}
