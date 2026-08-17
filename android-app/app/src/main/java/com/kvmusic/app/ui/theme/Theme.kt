package com.kvmusic.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView

private val SoundCloudElectricDarkColorScheme = darkColorScheme(
    primary = SoundCloudNeonOrange,
    onPrimary = TextElectricWhite,
    primaryContainer = SoundCloudOrangeGradientEnd,
    secondary = SoundCloudOrangeGradientStart,
    onSecondary = TextElectricWhite,
    background = MidnightBlack,
    onBackground = TextElectricWhite,
    surface = GlassSurfaceDark,
    onSurface = TextElectricWhite,
    surfaceVariant = GlassCardDark,
    onSurfaceVariant = TextLightGray
)

@Composable
fun KVMusicTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = SoundCloudElectricDarkColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = MidnightBlack.toArgb()
            window.navigationBarColor = MidnightBlack.toArgb()
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
