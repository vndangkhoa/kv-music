package com.kvmusic.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.KvOrange
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sin

object Peaks {
    fun pseudo(trackId: String): List<Float> {
        var seed = trackId.hashCode().toLong() and 0xFFFFFFFFL
        val out = ArrayList<Float>(160)
        for (i in 0 until 160) {
            val t = i / 159.0
            val envelope = sin(PI * t).coerceAtLeast(0.05)
            seed = seed * 1103515245 + 12345
            val noise01 = ((seed ushr 16) and 0xFFFF) / 65535.0
            val v = (envelope * (0.35 + 0.65 * abs(noise01))).coerceIn(0.08, 1.0)
            out.add(v.toFloat())
        }
        return out
    }
}

@Composable
fun Waveform(
    peaks: List<Float>,
    progress: Float,
    onSeek: (Float) -> Unit,
    active: Boolean = true,
    modifier: Modifier = Modifier,
    barCount: Int = 60
) {
    val count = barCount.coerceAtLeast(1)
    val currentOnSeek by rememberUpdatedState(onSeek)
    val currentActive by rememberUpdatedState(active)

    Canvas(
        modifier = modifier
            .pointerInput(currentActive) {
                if (currentActive) {
                    detectTapGestures { offset ->
                        currentOnSeek((offset.x / size.width).coerceIn(0f, 1f))
                    }
                }
            }
            .pointerInput(currentActive) {
                if (currentActive) {
                    detectDragGestures { change, _ ->
                        change.consume()
                        currentOnSeek((change.position.x / size.width).coerceIn(0f, 1f))
                    }
                }
            }
    ) {
        val bars = downsample(peaks, count)
        val barWidth = size.width / count * 0.6f
        val gap = size.width / count - barWidth
        val progressIdx = (progress.coerceIn(0f, 1f) * count).roundToInt()
        val minBarHeight = 2.dp.toPx()
        val unplayed = Faint.copy(alpha = 0.5f)
        bars.forEachIndexed { i, peak ->
            val barHeight = (peak * size.height).coerceAtLeast(minBarHeight)
            val x = i * (barWidth + gap)
            val y = (size.height - barHeight) / 2f
            drawRoundRect(
                color = when {
                    !currentActive -> unplayed
                    i <= progressIdx -> KvOrange
                    else -> unplayed
                },
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(barWidth / 2f)
            )
        }
    }
}

private fun downsample(peaks: List<Float>, barCount: Int): List<Float> {
    if (peaks.isEmpty()) return List(barCount) { 0.2f }
    if (peaks.size == barCount) return peaks
    return List(barCount) { i ->
        val start = i * peaks.size / barCount
        val end = ((i + 1) * peaks.size / barCount).coerceIn(start + 1, peaks.size)
        var max = 0f
        for (j in start until end) {
            if (peaks[j] > max) max = peaks[j]
        }
        if (max <= 0f) 0.15f else max
    }
}
