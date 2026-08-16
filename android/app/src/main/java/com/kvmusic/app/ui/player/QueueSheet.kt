package com.kvmusic.app.ui.player

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.components.CoverImage
import com.kvmusic.app.ui.components.EqIndicator
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.util.Formatters

@Composable
fun QueueSheet() {
    val context = LocalContext.current
    val player = (context.applicationContext as KvMusicApp).container.playerController
    val state by player.state.collectAsStateWithLifecycle()

    if (!AppUi.queueOpen) return

    KvBottomSheet(onDismissRequest = { AppUi.queueOpen = false }) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Hàng đợi",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Fg,
            )
            Spacer(Modifier.width(8.dp))
            Text("${state.queue.size}", fontSize = 12.sp, color = Muted, fontFamily = FontFamily.Monospace)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { player.clearQueue() }) {
                Text("Xóa", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = KvOrange)
            }
        }
        if (state.queue.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                Text("Hàng đợi trống", fontSize = 13.sp, color = Faint)
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth().heightIn(max = 460.dp)) {
                itemsIndexed(state.queue, key = { index, queueTrack -> "q-$index-${queueTrack.id}" }) { index, queueTrack ->
                    val isCurrent = queueTrack.id == state.currentTrack?.id
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(42.dp)
                                .clickable { player.playQueue(state.queue, index) }
                                .padding(horizontal = 20.dp),
                        ) {
                            CoverImage(url = queueTrack.cover_url, title = queueTrack.title, size = 32.dp, cornerRadius = 8.dp)
                            Spacer(Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (isCurrent) {
                                        EqIndicator(playing = state.isPlaying)
                                        Spacer(Modifier.width(4.dp))
                                    }
                                    Text(
                                        text = queueTrack.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isCurrent) KvOrange else Fg2,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                Text(
                                    text = queueTrack.artist,
                                    fontSize = 11.sp,
                                    color = Muted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(
                                Formatters.duration(queueTrack.duration),
                                fontSize = 12.sp,
                                color = Muted,
                                fontFamily = FontFamily.Monospace,
                            )
                            Spacer(Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clickable { player.removeFromQueue(index) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.Close,
                                    contentDescription = "Xóa khỏi hàng đợi",
                                    tint = Faint,
                                    modifier = Modifier.size(14.dp),
                                )
                            }
                        }
                        if (index < state.queue.lastIndex) {
                            Box(Modifier.fillMaxWidth().padding(horizontal = 20.dp).height(0.5.dp).background(Hair))
                        }
                    }
                }
            }
        }
    }
}
