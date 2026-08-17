package com.kvmusic.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.*

sealed class NavScreen(val route: String, val title: String, val icon: ImageVector) {
    object Home : NavScreen("home", "Discover", Icons.Default.Home)
    object Search : NavScreen("search", "Search", Icons.Default.Search)
    object Library : NavScreen("library", "Library", Icons.Default.LibraryMusic)
    object Settings : NavScreen("settings", "Settings", Icons.Default.Settings)
}

@Composable
fun BottomNavBar(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val items = listOf(
        NavScreen.Home,
        NavScreen.Search,
        NavScreen.Library,
        NavScreen.Settings
    )

    NavigationBar(
        modifier = modifier,
        containerColor = GlassSurfaceDark,
        tonalElevation = 12.dp
    ) {
        items.forEach { screen ->
            val isSelected = currentRoute == screen.route
            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(screen.route) },
                icon = {
                    Icon(
                        imageVector = screen.icon,
                        contentDescription = screen.title
                    )
                },
                label = { Text(text = screen.title) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = SoundCloudNeonOrange,
                    selectedTextColor = SoundCloudNeonOrange,
                    unselectedIconColor = TextDarkMuted,
                    unselectedTextColor = TextDarkMuted,
                    indicatorColor = GlassSurfaceDark
                )
            )
        }
    }
}
