package com.kvmusic.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.BottomNavBar
import com.kvmusic.app.ui.components.MiniPlayer
import com.kvmusic.app.ui.components.NavScreen
import com.kvmusic.app.ui.screens.detail.DetailScreen
import com.kvmusic.app.ui.screens.home.HomeScreen
import com.kvmusic.app.ui.screens.library.LibraryScreen
import com.kvmusic.app.ui.screens.player.FullPlayerScreen
import com.kvmusic.app.ui.screens.search.SearchScreen
import com.kvmusic.app.ui.screens.settings.SettingsScreen
import com.kvmusic.app.ui.theme.KVMusicTheme

data class ActiveDetailData(
    val id: String,
    val title: String,
    val coverUrl: String,
    val subtitle: String,
    val type: String
)

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Pre-initialize ExoPlayer for background audio support
        PlayerManager.getExoPlayer(this)

        val app = application as KVMusicApp
        val musicRepo = app.musicRepository
        val authRepo = app.authRepository

        setContent {
            KVMusicTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route ?: NavScreen.Home.route

                val currentTrack by PlayerManager.currentTrack.collectAsState()
                val isPlaying by PlayerManager.isPlaying.collectAsState()
                val positionMs by PlayerManager.currentPosition.collectAsState()
                val durationMs by PlayerManager.duration.collectAsState()

                var isFullPlayerExpanded by remember { mutableStateOf(false) }
                var activeDetail by remember { mutableStateOf<ActiveDetailData?>(null) }

                val progressFraction = if (durationMs > 0) positionMs.toFloat() / durationMs else 0f

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .windowInsetsPadding(WindowInsets.statusBars)
                ) {
                    Scaffold(
                        bottomBar = {
                            Column(
                                modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)
                            ) {
                                // SoundCloud Floating MiniPlayer (Always stacked directly above bottom navigation bar or detail screen)
                                if (currentTrack != null) {
                                    MiniPlayer(
                                        track = currentTrack,
                                        isPlaying = isPlaying,
                                        progressFraction = progressFraction,
                                        onTogglePlay = { PlayerManager.togglePlayPause() },
                                        onSkipNext = { PlayerManager.playNext() },
                                        onClickExpand = { isFullPlayerExpanded = true }
                                    )
                                }

                                if (activeDetail == null) {
                                    BottomNavBar(
                                        currentRoute = currentRoute,
                                        onNavigate = { route ->
                                            if (currentRoute != route) {
                                                navController.navigate(route) {
                                                    popUpTo(NavScreen.Home.route) { saveState = true }
                                                    launchSingleTop = true
                                                    restoreState = true
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Box(modifier = Modifier.padding(innerPadding)) {
                            NavHost(
                                navController = navController,
                                startDestination = NavScreen.Home.route
                            ) {
                                composable(NavScreen.Home.route) {
                                    HomeScreen(
                                        musicRepo = musicRepo,
                                        onNavigateSettings = { navController.navigate(NavScreen.Settings.route) },
                                        onArtistClick = { name, avatarUrl, subtitle ->
                                            activeDetail = ActiveDetailData(
                                                id = name,
                                                title = name,
                                                coverUrl = avatarUrl,
                                                subtitle = subtitle,
                                                type = "artist"
                                            )
                                        }
                                    )
                                }
                                composable(NavScreen.Search.route) {
                                    SearchScreen(
                                        musicRepo = musicRepo,
                                        onArtistClick = { name, avatarUrl, subtitle ->
                                            activeDetail = ActiveDetailData(
                                                id = name,
                                                title = name,
                                                coverUrl = avatarUrl,
                                                subtitle = subtitle,
                                                type = "artist"
                                            )
                                        },
                                        onAlbumClick = { id, title, coverUrl, subtitle ->
                                            activeDetail = ActiveDetailData(
                                                id = id,
                                                title = title,
                                                coverUrl = coverUrl,
                                                subtitle = subtitle,
                                                type = "album"
                                            )
                                        },
                                        onPlaylistClick = { id, title, coverUrl, subtitle ->
                                            activeDetail = ActiveDetailData(
                                                id = id,
                                                title = title,
                                                coverUrl = coverUrl,
                                                subtitle = subtitle,
                                                type = "playlist"
                                            )
                                        }
                                    )
                                }
                                composable(NavScreen.Library.route) {
                                    LibraryScreen(authRepo = authRepo)
                                }
                                composable(NavScreen.Settings.route) {
                                    SettingsScreen(authRepo = authRepo)
                                }
                            }

                            // Artist / Album / Playlist Detail Screen Overlay
                            AnimatedVisibility(
                                visible = activeDetail != null,
                                enter = slideInHorizontally(initialOffsetX = { it }) + fadeIn(),
                                exit = slideOutHorizontally(targetOffsetX = { it }) + fadeOut()
                            ) {
                                val d = activeDetail
                                if (d != null) {
                                    DetailScreen(
                                        id = d.id,
                                        title = d.title,
                                        coverUrl = d.coverUrl,
                                        subtitle = d.subtitle,
                                        type = d.type,
                                        musicRepo = musicRepo,
                                        onBack = { activeDetail = null }
                                    )
                                }
                            }
                        }
                    }

                    // Full Player Overlay Screen with slide-up animation
                    AnimatedVisibility(
                        visible = isFullPlayerExpanded && currentTrack != null,
                        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
                    ) {
                        FullPlayerScreen(
                            musicRepo = musicRepo,
                            onMinimize = { isFullPlayerExpanded = false }
                        )
                    }
                }
            }
        }
    }
}
