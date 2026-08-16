package com.kvmusic.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

val KvShapes = Shapes(
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp)
)

@Composable
fun KvMusicTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = KvOrange,
        onPrimary = Color.White,
        secondary = KvOrange2,
        onSecondary = Color.White,
        background = KvBackground,
        onBackground = Color.White,
        surface = KvSurface,
        onSurface = Color.White,
        surfaceVariant = KvCard,
        onSurfaceVariant = KvMuted,
        outline = KvBorder,
        outlineVariant = KvBorder,
        error = Color(0xFFCF6679)
    )
    MaterialTheme(
        colorScheme = scheme,
        typography = KvTypography,
        shapes = KvShapes,
        content = content
    )
}

@Composable
fun Modifier.glassCard(rounded: Dp = 12.dp, bg: Color = Color(0xFF1A1A1A)): Modifier =
    this.background(bg, RoundedCornerShape(rounded))
        .border(1.dp, KvBorder, RoundedCornerShape(rounded))
