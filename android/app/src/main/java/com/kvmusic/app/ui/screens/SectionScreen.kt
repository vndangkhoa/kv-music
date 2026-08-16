package com.kvmusic.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.StaticPlaylist
import com.kvmusic.app.ui.components.SkeletonBox
import com.kvmusic.app.ui.navigation.LocalNav
import com.kvmusic.app.ui.navigation.Routes
import com.kvmusic.app.ui.theme.ArtBorder
import com.kvmusic.app.ui.theme.Eyebrow
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.T1End
import com.kvmusic.app.ui.theme.T1Start
import com.kvmusic.app.ui.theme.T2End
import com.kvmusic.app.ui.theme.T2Start
import com.kvmusic.app.ui.theme.TagBg
import com.kvmusic.app.ui.theme.glass
import kotlinx.coroutines.flow.first

@Composable
fun SectionScreen(category: String) {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }
    val nav = LocalNav.current

    var playlists by remember { mutableStateOf<List<StaticPlaylist>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(category) {
        loading = true
        val country = container.serverConfigStore.country.first()
        playlists = container.musicRepository.browse(country)[category].orEmpty()
        loading = false
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .glass(CircleShape)
                    .clickable { nav.popBackStack() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = "Quay lại",
                    tint = Fg2,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(
                text = category.replaceFirstChar { it.uppercaseChar() },
                style = NavTitle,
                color = Fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        when {
            loading -> SectionGridSkeleton()
            playlists.isEmpty() -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text("Danh mục trống", fontSize = 14.sp, color = Muted)
            }
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 160.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                itemsIndexed(playlists) { index, item ->
                    SectionGridItem(item = item, index = index)
                }
            }
        }
    }
}

@Composable
private fun SectionGridItem(item: StaticPlaylist, index: Int) {
    val nav = LocalNav.current
    val onClick: () -> Unit = {
        when (item.type) {
            "Artist" -> nav.navigate(Routes.artist(item.id, item.title))
            "Album" -> nav.navigate(Routes.album(item.id))
            else -> nav.navigate(Routes.playlist(item.id))
        }
    }
    val shape = RoundedCornerShape(20.dp)
    val palette = if (index % 2 == 0) listOf(T1Start, T1End) else listOf(T2Start, T2End)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(92.dp)
            .clip(shape)
            .background(Brush.linearGradient(palette))
            .border(1.dp, ArtBorder, shape)
            .clickable(onClick = onClick),
    ) {
        Text(
            text = when (item.type) {
                "Artist" -> "NGHỆ SĨ"
                "Album" -> "ALBUM"
                else -> "PLAYLIST"
            },
            style = Eyebrow,
            fontFamily = FontFamily.Monospace,
            color = Muted,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 8.dp, end = 10.dp)
                .background(TagBg, RoundedCornerShape(6.dp))
                .padding(horizontal = 6.dp, vertical = 2.dp),
        )
        Text(
            text = item.title,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(12.dp),
        )
    }
}

@Composable
private fun SectionGridSkeleton() {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 160.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(6) { index ->
            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                val w = maxWidth
                SkeletonBox(
                    width = w,
                    height = 92.dp,
                    shape = RoundedCornerShape(20.dp),
                    art = true,
                    index = index,
                )
            }
        }
    }
}
