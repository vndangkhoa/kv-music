package com.kvmusic.app.ui

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.repository.AuthState
import com.kvmusic.app.ui.auth.LoginSheet
import com.kvmusic.app.ui.components.ArtistAvatar
import com.kvmusic.app.ui.components.KvToastHost
import com.kvmusic.app.ui.library.AddToPlaylistSheet
import com.kvmusic.app.ui.library.CreatePlaylistSheet
import com.kvmusic.app.ui.navigation.AppNavHost
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.player.FullPlayerSheet
import com.kvmusic.app.ui.player.LyricsSheet
import com.kvmusic.app.ui.player.MobileMiniBar
import com.kvmusic.app.ui.player.QueueSheet
import com.kvmusic.app.ui.settings.SettingsSheet
import com.kvmusic.app.ui.theme.KvBackground
import com.kvmusic.app.ui.theme.KvBase
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvOrange2
import com.kvmusic.app.ui.video.VideoPlayerScreen

@Composable
fun AppRoot() {
    val container = (LocalContext.current.applicationContext as KvMusicApp).container
    val player by container.playerController.state.collectAsStateWithLifecycle()
    val auth by container.authRepository.state.collectAsStateWithLifecycle()
    val navController = rememberNavController()

    Box(Modifier.fillMaxSize().background(KvBackground)) {
        Column(Modifier.fillMaxSize()) {
            MobileHeader(navController, auth)
            Box(Modifier.weight(1f)) {
                AppNavHost(navController)
            }
            MobileBottomNav(navController)
        }
        MobileMiniBar()
        FullPlayerSheet()
        QueueSheet()
        LyricsSheet()
        LoginSheet()
        SettingsSheet()
        AddToPlaylistSheet()
        CreatePlaylistSheet()
        if (AppUi.videoTrack != null) {
            VideoPlayerScreen(AppUi.videoTrack!!)
        }
        KvToastHost(Modifier.align(Alignment.Center))
    }
}

@Composable
private fun MobileHeader(navController: NavHostController, auth: AuthState) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .height(56.dp)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Rounded.MusicNote,
            null,
            modifier = Modifier.size(28.dp),
            tint = KvOrange,
        )
        Spacer(Modifier.width(8.dp))
        Text(
            "KV",
            fontSize = 18.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color.White,
        )
        Spacer(Modifier.weight(1f))
        Box(
            modifier = Modifier
                .width(140.dp)
                .height(36.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(KvInput)
                .clickable { navController.navigate(Routes.SEARCH) },
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Rounded.Search,
                    null,
                    modifier = Modifier.size(16.dp),
                    tint = KvMuted,
                )
                Spacer(Modifier.width(6.dp))
                Text("Tìm kiếm...", fontSize = 13.sp, color = KvMuted)
            }
        }
        Spacer(Modifier.width(8.dp))
        IconButton(onClick = { AppUi.settingsOpen = true }) {
            Icon(
                Icons.Rounded.Settings,
                null,
                modifier = Modifier.size(20.dp),
                tint = if (AppUi.settingsOpen) KvOrange else Color.White,
            )
        }
        IconButton(onClick = { navController.navigate(Routes.PROFILE) }) {
            if (auth.isLoggedIn && auth.user != null) {
                ArtistAvatar(null, auth.user!!.name, 28.dp)
            } else {
                Icon(
                    Icons.Rounded.Person,
                    null,
                    modifier = Modifier.size(20.dp),
                    tint = Color.White,
                )
            }
        }
    }
}

@Composable
private fun MobileBottomNav(navController: NavHostController) {
    val context = LocalContext.current
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(KvBase)
            .navigationBarsPadding()
            .height(62.dp)
            .drawBehind {
                drawLine(
                    color = KvBorder,
                    start = Offset(0f, 0f),
                    end = Offset(size.width, 0f),
                    strokeWidth = 0.5.dp.toPx(),
                )
            },
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        NavItem(
            icon = Icons.Rounded.Home,
            label = "Home",
            selected = currentRoute == Routes.HOME,
            onClick = { navController.navigateTab(Routes.HOME) },
        )
        NavItem(
            icon = Icons.Rounded.Explore,
            label = "Stream",
            selected = currentRoute == Routes.FEED,
            onClick = { navController.navigateTab(Routes.FEED) },
        )
        PlayButton(context)
        NavItem(
            icon = Icons.Rounded.LibraryMusic,
            label = "Library",
            selected = currentRoute == Routes.LIBRARY,
            onClick = { navController.navigateTab(Routes.LIBRARY) },
        )
        NavItem(
            icon = Icons.Rounded.Person,
            label = "Profile",
            selected = currentRoute == Routes.PROFILE,
            onClick = { navController.navigateTab(Routes.PROFILE) },
        )
    }
}

@Composable
private fun NavItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    val color = if (selected) KvOrange else KvMuted
    Column(
        modifier = Modifier
            .clickable {
                haptic(context, 6L)
                onClick()
            }
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, null, modifier = Modifier.size(20.dp), tint = color)
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
private fun PlayButton(context: Context) {
    Box(
        modifier = Modifier.offset(y = -14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(60.dp)
                .shadow(8.dp, CircleShape, spotColor = KvOrange.copy(alpha = 0.4f))
                .background(Brush.linearGradient(listOf(KvOrange, KvOrange2)), CircleShape)
                .clickable {
                    haptic(context, 8L)
                    AppUi.fullPlayerOpen = true
                },
        ) {
            Icon(
                Icons.Rounded.PlayArrow,
                null,
                modifier = Modifier.size(30.dp).align(Alignment.Center),
                tint = Color.White,
            )
        }
    }
}

private fun NavHostController.navigateTab(route: String) {
    navigate(route) {
        popUpTo(route) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private fun haptic(context: Context, ms: Long) {
    try {
        (context.getSystemService(Vibrator::class.java))?.vibrate(
            VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE)
        )
    } catch (_: Exception) {
    }
}
