package com.kvmusic.app.ui.player

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.components.TrackRow
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange

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
                .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Hàng đợi",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Spacer(Modifier.width(8.dp))
            Text("${state.queue.size}", fontSize = 12.sp, color = KvMuted)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { player.clearQueue() }) {
                Text("Xóa", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = KvOrange)
            }
        }
        if (state.queue.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                Text("Hàng đợi trống", fontSize = 13.sp, color = KvFaint)
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth().heightIn(max = 460.dp)) {
                itemsIndexed(state.queue, key = { index, queueTrack -> "q-$index-${queueTrack.id}" }) { index, queueTrack ->
                    TrackRow(
                        track = queueTrack,
                        index = index + 1,
                        isCurrent = queueTrack.id == state.currentTrack?.id,
                        trailing = {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clickable { player.removeFromQueue(index) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.Close,
                                    contentDescription = "Xóa khỏi hàng đợi",
                                    tint = KvFaint,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        },
                        onClick = { player.playQueue(state.queue, index) },
                    )
                }
            }
        }
    }
}
