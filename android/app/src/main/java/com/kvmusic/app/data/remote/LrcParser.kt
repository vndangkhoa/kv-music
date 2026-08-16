package com.kvmusic.app.data.remote

import com.kvmusic.app.data.model.LyricLine

object LrcParser {

    private val TIME_TAG = Regex("""\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?]""")
    private val METADATA_TAG = Regex("""\[[a-zA-Z]+:[^\]]*]""")

    fun parse(lrc: String): List<LyricLine> {
        val out = mutableListOf<LyricLine>()
        for (line in lrc.lines()) {
            val times = TIME_TAG.findAll(line)
                .map { match ->
                    val minutes = match.groupValues[1].toIntOrNull() ?: 0
                    val seconds = match.groupValues[2].toIntOrNull() ?: 0
                    val fractionRaw = match.groupValues[3]
                    val fraction = if (fractionRaw.isEmpty()) {
                        0.0
                    } else {
                        val padded = fractionRaw.padEnd(3, '0').take(3)
                        (padded.toIntOrNull() ?: 0) / 1000.0
                    }
                    minutes * 60.0 + seconds + fraction
                }
                .toList()
            if (times.isEmpty()) continue
            val text = line.replace(TIME_TAG, "").replace(METADATA_TAG, "").trim()
            if (text.isEmpty()) continue
            for (time in times) {
                out.add(LyricLine(time = time, text = text))
            }
        }
        return out.sortedBy { it.time }
    }
}
