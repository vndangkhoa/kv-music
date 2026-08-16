package com.kvmusic.app.ui

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.kvmusic.app.data.model.Track
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

object AppUi {
    var settingsOpen by mutableStateOf(false)
    var loginOpen by mutableStateOf(false)
    var addToPlaylistTrack by mutableStateOf<Track?>(null)
    var createPlaylistOpen by mutableStateOf(false)
    var fullPlayerOpen by mutableStateOf(false)
    var lyricsOpen by mutableStateOf(false)
    var queueOpen by mutableStateOf(false)
    var videoTrack by mutableStateOf<Track?>(null)
}

object Toaster {

    data class ToastItem(val id: Long, val message: String)

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val toastsState = mutableStateOf<List<ToastItem>>(emptyList())
    private val activeMessages = mutableSetOf<String>()
    private var nextId = 0L

    val toasts: State<List<ToastItem>> get() = toastsState

    fun show(message: String) {
        if (message.isBlank()) return
        scope.launch {
            if (!activeMessages.add(message)) return@launch
            val id = nextId++
            toastsState.value = toastsState.value + ToastItem(id, message)
            delay(2500)
            toastsState.value = toastsState.value.filterNot { it.id == id }
            activeMessages.remove(message)
        }
    }
}
