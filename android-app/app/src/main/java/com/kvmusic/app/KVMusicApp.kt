package com.kvmusic.app

import android.app.Application
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.data.repository.MusicRepository

class KVMusicApp : Application() {

    lateinit var musicRepository: MusicRepository
        private set

    lateinit var authRepository: AuthRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        musicRepository = MusicRepository()
        authRepository = AuthRepository(this)
    }

    companion object {
        lateinit var instance: KVMusicApp
            private set
    }
}
