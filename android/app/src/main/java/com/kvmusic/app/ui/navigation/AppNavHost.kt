package com.kvmusic.app.ui.navigation

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.kvmusic.app.ui.screens.AlbumScreen
import com.kvmusic.app.ui.screens.ArtistScreen
import com.kvmusic.app.ui.screens.ArtistsScreen
import com.kvmusic.app.ui.screens.ChartsScreen
import com.kvmusic.app.ui.screens.CollectionScreen
import com.kvmusic.app.ui.screens.FeedScreen
import com.kvmusic.app.ui.screens.HomeScreen
import com.kvmusic.app.ui.screens.LibraryScreen
import com.kvmusic.app.ui.screens.PlaylistScreen
import com.kvmusic.app.ui.screens.ProfileScreen
import com.kvmusic.app.ui.screens.SearchScreen
import com.kvmusic.app.ui.screens.SectionScreen
import com.kvmusic.app.ui.screens.TrackScreen

object Routes {
    const val HOME = "home"
    const val SEARCH = "search"
    const val LIBRARY = "library"
    const val FEED = "feed"
    const val PROFILE = "profile"
    const val CHARTS = "charts"
    const val ARTISTS = "artists"
    const val COLLECTION = "collection"
    const val PLAYLIST = "playlist/{id}"
    const val ALBUM = "album/{id}"
    const val ARTIST = "artist/{id}?name={name}"
    const val SECTION = "section/{category}"
    const val TRACK = "track/{id}"

    fun playlist(id: String) = "playlist/$id"
    fun album(id: String) = "album/$id"
    fun artist(id: String, name: String? = null) =
        if (name == null) "artist/$id" else "artist/$id?name=${Uri.encode(name)}"
    fun section(category: String) = "section/${Uri.encode(category)}"
    fun track(id: String) = "track/$id"
}

val LocalNav = staticCompositionLocalOf<NavHostController> { error("No NavHostController") }

@Composable
fun AppNavHost(navController: NavHostController) {
    CompositionLocalProvider(LocalNav provides navController) {
        NavHost(navController = navController, startDestination = Routes.HOME) {
            composable(Routes.HOME) { HomeScreen() }
            composable(Routes.SEARCH) { SearchScreen() }
            composable(Routes.LIBRARY) { LibraryScreen() }
            composable(Routes.FEED) { FeedScreen() }
            composable(Routes.PROFILE) { ProfileScreen() }
            composable(Routes.CHARTS) { ChartsScreen() }
            composable(Routes.ARTISTS) { ArtistsScreen() }
            composable(Routes.COLLECTION) { CollectionScreen() }
            composable(
                route = Routes.PLAYLIST,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) {
                PlaylistScreen(it.arguments?.getString("id") ?: "")
            }
            composable(
                route = Routes.ALBUM,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) {
                AlbumScreen(it.arguments?.getString("id") ?: "")
            }
            composable(
                route = Routes.ARTIST,
                arguments = listOf(
                    navArgument("id") { type = NavType.StringType },
                    navArgument("name") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
                ),
            ) {
                ArtistScreen(
                    artistId = it.arguments?.getString("id") ?: "",
                    artistName = it.arguments?.getString("name"),
                )
            }
            composable(
                route = Routes.SECTION,
                arguments = listOf(navArgument("category") { type = NavType.StringType }),
            ) {
                SectionScreen(it.arguments?.getString("category") ?: "")
            }
            composable(
                route = Routes.TRACK,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) {
                TrackScreen(it.arguments?.getString("id") ?: "")
            }
        }
    }
}
