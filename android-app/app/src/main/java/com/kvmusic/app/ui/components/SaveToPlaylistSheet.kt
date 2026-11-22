package com.kvmusic.app.ui.components

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.PlaylistManager
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.theme.YouTubeSansFontFamily
import com.kvmusic.app.ui.theme.YtmBlue02
import com.kvmusic.app.ui.theme.YtmGrey11
import com.kvmusic.app.ui.theme.YtmPureBlack
import com.kvmusic.app.ui.theme.YtmWhite
import com.kvmusic.app.ui.theme.YtmWhite20
import com.kvmusic.app.ui.theme.YtmWhite67

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaveToPlaylistBottomSheet(
    track: Track,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val playlists by PlaylistManager.playlists.collectAsState()
    val likedIds by PlayerManager.likedTrackIds.collectAsState()
    val downloadedIds by PlayerManager.downloadedTrackIds.collectAsState()

    val isLiked = likedIds.contains(track.id)
    val isDownloaded = downloadedIds.contains(track.id)

    var showCreateDialog by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = YtmGrey11,
        contentColor = YtmWhite,
        tonalElevation = 0.dp,
        shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Save to playlist",
                    fontFamily = YouTubeSansFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = YtmWhite
                )
                TextButton(onClick = { showCreateDialog = true }) {
                    Icon(
                        imageVector = YtmIcons.Add24,
                        contentDescription = null,
                        tint = YtmBlue02,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "New playlist",
                        color = YtmBlue02,
                        fontWeight = FontWeight.Medium,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 320.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                SaveCheckRow(
                    label = "Liked Music",
                    subtitle = null,
                    checked = isLiked,
                    onToggle = { PlayerManager.toggleLike(track.id) }
                )
                SaveCheckRow(
                    label = "Offline Downloads",
                    subtitle = null,
                    checked = isDownloaded,
                    onToggle = { PlayerManager.toggleDownload(context, track) }
                )
                playlists.forEach { pl ->
                    val inPlaylist = pl.tracks.any { it.id == track.id }
                    val songCount = pl.tracks.size
                    SaveCheckRow(
                        label = pl.name,
                        subtitle = "$songCount ${if (songCount == 1) "song" else "songs"}",
                        checked = inPlaylist,
                        onToggle = {
                            val added = PlaylistManager.toggleTrackInPlaylist(pl.id, track)
                            Toast.makeText(
                                context,
                                if (added) "Saved to '${pl.name}'" else "Removed from '${pl.name}'",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(
                    containerColor = YtmWhite,
                    contentColor = YtmPureBlack
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(42.dp)
            ) {
                Text(
                    text = "Done",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    if (showCreateDialog) {
        CreatePlaylistDialog(
            title = "New playlist",
            confirmLabel = "Create & save",
            onDismiss = { showCreateDialog = false },
            onConfirm = { name ->
                val created = PlaylistManager.createPlaylist(name = name, initialTrack = track)
                showCreateDialog = false
                Toast.makeText(context, "Saved to '${created.name}'", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
private fun SaveCheckRow(
    label: String,
    subtitle: String?,
    checked: Boolean,
    onToggle: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clickable(onClick = onToggle),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = { onToggle() },
            colors = CheckboxDefaults.colors(
                checkedColor = YtmWhite,
                uncheckedColor = YtmWhite67,
                checkmarkColor = YtmPureBlack
            )
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                fontSize = 15.sp,
                color = YtmWhite,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = YtmWhite67,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
fun CreatePlaylistDialog(
    title: String = "New playlist",
    initialName: String = "",
    confirmLabel: String = "Create",
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var name by remember(initialName) { mutableStateOf(initialName) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = YtmGrey11,
        titleContentColor = YtmWhite,
        textContentColor = YtmWhite,
        title = {
            Text(
                text = title,
                fontFamily = YouTubeSansFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                placeholder = { Text("Playlist title", color = YtmWhite67) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = YtmWhite,
                    unfocusedBorderColor = YtmWhite20,
                    focusedTextColor = YtmWhite,
                    unfocusedTextColor = YtmWhite,
                    cursorColor = YtmWhite
                ),
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(name.trim()) },
                enabled = name.trim().isNotEmpty()
            ) {
                Text(confirmLabel, color = YtmBlue02, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = YtmWhite67)
            }
        }
    )
}
