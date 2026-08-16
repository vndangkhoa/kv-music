package com.kvmusic.app.player

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.R

@OptIn(UnstableApi::class)
class PlaybackService : MediaSessionService() {

    private lateinit var mediaSession: MediaSession

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val controller = (application as KvMusicApp).container.playerController
        val provider = DefaultMediaNotificationProvider.Builder(this)
            .setChannelId(CHANNEL_ID)
            .build()
        provider.setSmallIcon(defaultNotificationIcon)
        setMediaNotificationProvider(provider)
        mediaSession = MediaSession.Builder(this, controller.player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? =
        mediaSession

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val controller = (application as KvMusicApp).container.playerController
        val mediaAction =
            intent != null && (intent.action == Intent.ACTION_MEDIA_BUTTON || intent.data != null)
        if (!controller.state.value.isPlaying && !mediaAction) {
            stopSelf()
        }
        super.onStartCommand(intent, flags, startId)
        return START_NOT_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val controller = (application as KvMusicApp).container.playerController
        if (!controller.state.value.isPlaying) {
            stopSelf()
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        if (::mediaSession.isInitialized) {
            mediaSession.release()
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            val channel = NotificationChannel(CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW)
            channel.description = "Media playback controls"
            manager.createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "playback"
        const val defaultNotificationId = 1001
        val defaultNotificationIcon = R.mipmap.ic_launcher
    }
}
