package com.kvmusic.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

val KvShapeHero = RoundedCornerShape(24.dp)
val KvShapeSheet = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
val KvShapeCard = RoundedCornerShape(20.dp)
val KvShapeMini = RoundedCornerShape(22.dp)
val KvShapeTabBar = RoundedCornerShape(34.dp)
val KvShapePill = RoundedCornerShape(percent = 50)
val KvShapeArt = RoundedCornerShape(14.dp)

val KvShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

@Composable
fun KvMusicTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = KvOrange,
        onPrimary = OnAccent,
        secondary = KvOrange2,
        onSecondary = OnAccent,
        background = KvBackground,
        onBackground = Fg,
        surface = KvSurface,
        onSurface = Fg,
        surfaceVariant = KvCard,
        onSurfaceVariant = Muted,
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

fun Modifier.glassCard(rounded: Dp = 12.dp, bg: Color = Color(0xFF1A1A1A)): Modifier {
    val shape = RoundedCornerShape(rounded)
    return this.background(bg, shape).glass(shape)
}
