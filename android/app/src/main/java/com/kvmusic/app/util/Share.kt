package com.kvmusic.app.util

import android.content.Context
import android.content.Intent
import com.kvmusic.app.data.model.Track

object Share {

    fun track(context: Context, track: Track, streamUrl: String = "") {
        val text = buildString {
            append("${track.title} — ${track.artist}")
            if (streamUrl.isNotBlank()) append("\n$streamUrl")
        }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            putExtra(Intent.EXTRA_TITLE, "${track.title} — ${track.artist}")
        }
        try {
            context.startActivity(Intent.createChooser(intent, null))
        } catch (_: Exception) {
        }
    }
}
