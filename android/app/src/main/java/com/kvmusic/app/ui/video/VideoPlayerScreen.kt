package com.kvmusic.app.ui.video

import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.ui.AppUi

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun VideoPlayerScreen(track: Track) {
    val context = LocalContext.current
    val container = remember(context) { (context.applicationContext as KvMusicApp).container }

    DisposableEffect(Unit) {
        container.playerController.setVideoMode(true)
        onDispose { container.playerController.setVideoMode(false) }
    }

    BackHandler { AppUi.videoTrack = null }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.domStorageEnabled = true
                    webChromeClient = WebChromeClient()
                    webViewClient = WebViewClient()
                    loadUrl("https://www.youtube.com/embed/${track.id}?autoplay=1&playsinline=1&rel=0")
                }
            },
        )
        Icon(
            imageVector = Icons.Rounded.Close,
            contentDescription = "Đóng",
            tint = Color.White,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp)
                .size(40.dp)
                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                .clickable { AppUi.videoTrack = null }
                .padding(8.dp),
        )
    }
}
