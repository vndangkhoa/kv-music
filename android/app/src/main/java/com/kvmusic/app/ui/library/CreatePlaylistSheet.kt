package com.kvmusic.app.ui.library

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Glass
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.OnAccent
import kotlinx.coroutines.launch

@Composable
fun CreatePlaylistSheet() {
    val context = LocalContext.current
    val container = (context.applicationContext as KvMusicApp).container
    val scope = rememberCoroutineScope()

    if (!AppUi.createPlaylistOpen) return

    var title by remember { mutableStateOf("") }
    var creating by remember { mutableStateOf(false) }

    KvBottomSheet(onDismissRequest = { AppUi.createPlaylistOpen = false }) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Tạo playlist mới",
                style = NavTitle,
                color = Fg,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { AppUi.createPlaylistOpen = false }) {
                Icon(Icons.Rounded.Close, contentDescription = "Đóng", tint = Muted)
            }
        }
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            placeholder = { Text("Tên playlist", color = Faint) },
            singleLine = true,
            shape = KvShapePill,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = GlassBorder,
                unfocusedBorderColor = GlassBorder,
                focusedContainerColor = Glass,
                unfocusedContainerColor = Glass,
                focusedTextColor = Fg,
                unfocusedTextColor = Fg,
                cursorColor = KvOrange,
            ),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                scope.launch {
                    creating = true
                    container.libraryRepository.createPlaylist(title.trim())
                    creating = false
                    Toaster.show("Đã tạo playlist")
                    AppUi.createPlaylistOpen = false
                }
            },
            enabled = title.isNotBlank() && !creating,
            shape = KvShapePill,
            colors = ButtonDefaults.buttonColors(
                containerColor = KvOrange,
                contentColor = OnAccent,
                disabledContainerColor = Glass,
                disabledContentColor = Faint,
            ),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        ) {
            Text(if (creating) "Đang tạo..." else "Tạo", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(24.dp))
    }
}
