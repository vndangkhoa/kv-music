package com.kvmusic.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.selection.selectable
import androidx.compose.material.ripple.rememberRipple
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.YtmCaption03
import com.kvmusic.app.ui.theme.YtmGrey12
import com.kvmusic.app.ui.theme.YtmWhite
import com.kvmusic.app.ui.theme.YtmWhite08
import com.kvmusic.app.ui.theme.YtmWhite20
import com.kvmusic.app.ui.theme.YtmWhite67

sealed class NavScreen(
    val route: String,
    val title: String,
    val icon: ImageVector,
    val unselectedIcon: ImageVector = icon
) {
    object Home : NavScreen(
        route = "home",
        title = "Home",
        icon = YtmIcons.HomeFilled,
        unselectedIcon = YtmIcons.HomeOutline
    )

    object Search : NavScreen(
        route = "search",
        title = "Explore",
        icon = YtmIcons.ExploreFilled,
        unselectedIcon = YtmIcons.ExploreOutline
    )

    object Library : NavScreen(
        route = "library",
        title = "Library",
        icon = YtmIcons.LibraryFilled,
        unselectedIcon = YtmIcons.LibraryOutline
    )

    object Settings : NavScreen(
        route = "settings",
        title = "Settings",
        icon = YtmIcons.SettingsGear24,
        unselectedIcon = YtmIcons.SettingsGear24
    )
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

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp),
        color = YtmGrey12,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(YtmWhite08)
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalAlignment = Alignment.Top
            ) {
                items.forEach { screen ->
                    val isSelected = currentRoute == screen.route
                    val tint = if (isSelected) YtmWhite else YtmWhite67
                    val tabIcon = if (isSelected) screen.icon else screen.unselectedIcon
                    val interactionSource = remember { MutableInteractionSource() }

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .defaultMinSize(minWidth = 48.dp)
                            .selectable(
                                selected = isSelected,
                                interactionSource = interactionSource,
                                indication = rememberRipple(bounded = false, color = YtmWhite20),
                                role = Role.Tab,
                                onClick = { onNavigate(screen.route) }
                            )
                            .padding(top = 6.dp, start = 4.dp, end = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = tabIcon,
                            contentDescription = screen.title,
                            tint = tint,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = screen.title,
                            style = YtmCaption03.copy(color = tint),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}
