package com.kvmusic.app.util

import java.util.Locale

object Formatters {

    fun count(n: Long?): String {
        if (n == null) return "—"
        return when {
            n >= 1_000_000L -> "${oneDecimal(n / 1_000_000.0)}M"
            n >= 1_000L -> "${oneDecimal(n / 1_000.0)}K"
            else -> n.toString()
        }
    }

    fun duration(seconds: Int): String {
        val total = seconds.coerceAtLeast(0)
        val hours = total / 3600
        val minutes = (total % 3600) / 60
        val secs = total % 60
        return if (hours > 0) {
            String.format(Locale.US, "%d:%02d:%02d", hours, minutes, secs)
        } else {
            String.format(Locale.US, "%d:%02d", minutes, secs)
        }
    }

    private fun oneDecimal(value: Double): String =
        String.format(Locale.US, "%.1f", value)
}
