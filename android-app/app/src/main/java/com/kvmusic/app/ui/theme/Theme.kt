package com.kvmusic.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val YtmDarkColorScheme = darkColorScheme(
    primary = YtmWhite,
    onPrimary = YtmPureBlack,
    primaryContainer = YtmGrey10,
    onPrimaryContainer = YtmWhite,
    secondary = YtmRedAccent,
    onSecondary = YtmPureWhite,
    background = YtmPureBlack,
    onBackground = YtmWhite,
    surface = YtmGrey12,
    onSurface = YtmWhite,
    surfaceVariant = YtmGrey10,
    onSurfaceVariant = YtmWhite67,
    outline = YtmWhite15
)

@Composable
fun KVMusicTheme(
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = YtmGrey12.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = YtmDarkColorScheme,
        typography = Typography,
        content = content
    )
}
