package com.kvmusic.app

import android.app.Application
import android.content.Context
import com.kvmusic.app.data.local.LibraryDb
import com.kvmusic.app.data.local.ServerConfigStore
import com.kvmusic.app.data.remote.ApiClient
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.data.repository.LibraryRepository
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class AppContainer(context: Context) {

    val serverConfigStore = ServerConfigStore(context)
    val apiClient = ApiClient(context, serverConfigStore)
    val database = LibraryDb.getInstance(context)
    val authRepository = AuthRepository(apiClient, serverConfigStore)
    val musicRepository = MusicRepository(apiClient)
    val libraryRepository = LibraryRepository(database, serverConfigStore)
    val playerController: PlayerController by lazy { PlayerController(context, apiClient, libraryRepository) }

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        applicationScope.launch { libraryRepository.ensureSeeded() }
        applicationScope.launch {
            val host = serverConfigStore.host.first()
            if (host.isNotBlank()) authRepository.refreshMe()
        }
    }
}

class KvMusicApp : Application() {

    val container: AppContainer by lazy { AppContainer(this) }
}
