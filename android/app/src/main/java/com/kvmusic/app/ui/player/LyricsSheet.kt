package com.kvmusic.app.ui.player

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.QueueMusic
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.LyricLine
import com.kvmusic.app.data.remote.LrcParser
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.components.LyricsView
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Muted

@Composable
fun LyricsSheet() {
    val context = LocalContext.current
    val container = (context.applicationContext as KvMusicApp).container
    val player = container.playerController
    val state by player.state.collectAsStateWithLifecycle()
    val progress by player.progress.collectAsStateWithLifecycle()
    val track = state.currentTrack

    if (!AppUi.lyricsOpen) return

    KvBottomSheet(
        onDismissRequest = { AppUi.lyricsOpen = false },
        modifier = Modifier.fillMaxHeight(0.85f),
    ) {
        val current = state.currentTrack
        if (current == null) {
            Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Text("Chưa có bài hát đang phát", fontSize = 13.sp, color = Faint)
            }
            return@KvBottomSheet
        }

        var lines by remember(current.id) { mutableStateOf<List<LyricLine>?>(null) }
        var loading by remember(current.id) { mutableStateOf(true) }

        LaunchedEffect(current.id) {
            loading = true
            lines = runCatching {
                val result = container.musicRepository.lyrics(current.title, current.artist, current.id)
                when {
                    result?.syncedLyrics != null -> LrcParser.parse(result.syncedLyrics)
                    result?.plainLyrics != null -> result.plainLyrics.split("\n").mapIndexed { index, line ->
                        LyricLine(time = index * 4.0, text = line)
                    }
                    else -> emptyList()
                }
            }.getOrDefault(emptyList())
            loading = false
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = current.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Fg,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = current.artist,
                    fontSize = 12.sp,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clickable { AppUi.lyricsOpen = false },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.Close, contentDescription = "Đóng", tint = Fg2, modifier = Modifier.size(20.dp))
            }
        }

        when {
            loading -> {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text("Đang tải lời bài hát...", fontSize = 13.sp, color = Muted)
                }
            }
            lines.isNullOrEmpty() -> {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Rounded.QueueMusic,
                            contentDescription = null,
                            tint = Faint,
                            modifier = Modifier.size(40.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text("Không tìm thấy lời bài hát", fontSize = 13.sp, color = Muted)
                    }
                }
            }
            else -> {
                LyricsView(
                    lines = lines ?: emptyList(),
                    currentTime = progress / 1000.0,
                    onLineClick = { time -> player.seekTo((time * 1000).toLong()) },
                    modifier = Modifier.fillMaxWidth().weight(1f),
                )
            }
        }
    }
}
