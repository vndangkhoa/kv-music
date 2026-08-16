package com.kvmusic.app.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.QueueMusic
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.components.TrackRowSkeleton
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.GlyphBg
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.OnAccent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun AddToPlaylistSheet() {
    val context = LocalContext.current
    val container = (context.applicationContext as KvMusicApp).container
    val library = container.libraryRepository
    val scope = rememberCoroutineScope()

    val track = AppUi.addToPlaylistTrack
    if (track == null) return

    val playlists by library.playlists.collectAsStateWithLifecycle(initialValue = emptyList())
    var contains by remember(track.id) { mutableStateOf(setOf<Long>()) }
    var counts by remember(track.id) { mutableStateOf(mapOf<Long, Int>()) }
    var loading by remember(track.id) { mutableStateOf(true) }
    var busyId by remember { mutableStateOf<Long?>(null) }

    LaunchedEffect(track.id) {
        loading = true
        val all = library.playlists.first()
        val containsSet = buildSet {
            all.forEach { playlist ->
                if (library.isTrackInPlaylist(playlist.id, track.id)) add(playlist.id)
            }
        }
        contains = containsSet
        counts = library.playlistCounts().first()
        loading = false
    }

    KvBottomSheet(onDismissRequest = { AppUi.addToPlaylistTrack = null }) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Thêm vào playlist", style = NavTitle, color = Fg)
                Text(
                    "${track.title} — ${track.artist}",
                    fontSize = 13.sp,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = { AppUi.addToPlaylistTrack = null }) {
                Icon(Icons.Rounded.Close, contentDescription = "Đóng", tint = Muted)
            }
        }

        if (loading) {
            Column(Modifier.fillMaxWidth()) {
                repeat(3) { TrackRowSkeleton() }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 380.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                playlists.forEach { playlist ->
                    val inPlaylist = playlist.id in contains
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable(enabled = busyId == null) {
                                scope.launch {
                                    busyId = playlist.id
                                    if (playlist.id in contains) {
                                        library.removeFromPlaylist(playlist.id, track.id)
                                        contains = contains - playlist.id
                                        Toaster.show("Đã xóa khỏi playlist")
                                    } else {
                                        library.addToPlaylist(playlist.id, track)
                                        contains = contains + playlist.id
                                        Toaster.show("Đã thêm vào playlist")
                                    }
                                    busyId = null
                                }
                            }
                            .padding(horizontal = 20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(GlyphBg),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Rounded.QueueMusic, contentDescription = null, tint = Fg2, modifier = Modifier.size(18.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Text(
                            playlist.title,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = Fg,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        val count = counts[playlist.id] ?: 0
                        if (count > 0) {
                            Text(
                                count.toString(),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Muted,
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        if (inPlaylist) {
                            Icon(Icons.Rounded.Check, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                if (playlists.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(96.dp), contentAlignment = Alignment.Center) {
                        Text("Chưa có playlist nào", fontSize = 13.sp, color = Faint)
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { AppUi.createPlaylistOpen = true }
                    .padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(KvOrange, RoundedCornerShape(percent = 50)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null, tint = OnAccent, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(12.dp))
                Text("Thêm vào playlist mới", fontSize = 16.sp, fontWeight = FontWeight.Medium, color = Fg)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
