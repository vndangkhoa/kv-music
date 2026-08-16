package com.kvmusic.app.util

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment

object Downloader {

    fun download(context: Context, url: String, title: String) {
        val extension = when {
            url.contains("fmt=m4a") -> "m4a"
            url.contains("fmt=video") -> "mp4"
            else -> "webm"
        }
        val base = title
            .trim()
            .replace(Regex("[\\\\/:*?\"<>|\\x00-\\x1F]"), "_")
            .replace(Regex("(?i)\\.(webm|m4a|mp4)$"), "")
            .trim()
            .ifBlank { "kv-music-track" }
        val fileName = "$base.$extension"
        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle(title)
            .setDescription("KV Music")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            .setAllowedOverMetered(true)
        try {
            manager.enqueue(request)
        } catch (e: Exception) {
            throw e
        }
    }
}
