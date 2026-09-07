package com.kvmusic.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitTouchSlopOrCancellation
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.ui.theme.SoundCloudNeonOrange
import com.kvmusic.app.ui.theme.SoundCloudOrangeGradientEnd
import com.kvmusic.app.ui.theme.WaveformInactiveDark
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

private const val HOLD_TO_SCRUB_MS = 280L

private fun formatMs(ms: Long): String {
    val totalSec = (ms / 1000).toInt().coerceAtLeast(0)
    return String.format(Locale.getDefault(), "%d:%02d", totalSec / 60, totalSec % 60)
}

/**
 * SoundCloud-style amplitude scrubber with a miss-tap-safe touch model.
 *
 * - [interactive] = false → pure visual, consumes no gestures (use in lists).
 * - [requireHoldToSeek] = true (default) → a simple tap does NOTHING.
 *   Scrubbing starts only after a press-and-hold (~280 ms, haptic confirms)
 *   or a slide past touch-slop, and the new position commits on release.
 *   This is the "touch – hold – slide on the wave to adjust timestamp"
 *   behavior: accidental taps on the wave never seek or start playback.
 * - [requireHoldToSeek] = false → classic tap-to-seek (desktop/precise UI).
 *
 * The touch target is padded well beyond the visual bars (min 56 dp tall)
 * so thumbs land reliably, and a time bubble previews the scrub position.
 */
@Composable
fun SoundCloudWaveform(
    amplitudes: List<Float>,
    progressFraction: Float,
    onSeekFraction: (Float) -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = 80.dp,
    interactive: Boolean = true,
    requireHoldToSeek: Boolean = true,
    durationMs: Long = 0L,
    showHint: Boolean = false
) {
    val haptics = LocalHapticFeedback.current
    val density = LocalDensity.current
    // External scope for the hold-timer: awaitEachGesture's restricted scope
    // forbids launching coroutines directly.
    val gestureScope = rememberCoroutineScope()

    var isScrubbing by remember { mutableStateOf(false) }
    var previewFraction by remember { mutableFloatStateOf(0f) }

    val activeFraction = if (isScrubbing) previewFraction else progressFraction.coerceIn(0f, 1f)

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .pointerInput(interactive, requireHoldToSeek) {
                if (!interactive) return@pointerInput
                awaitEachGesture {
                    val down = awaitFirstDown()
                    val width = size.width.toFloat()
                    if (width <= 0f) return@awaitEachGesture

                    fun fractionOf(x: Float) = (x / width).coerceIn(0f, 1f)

                    if (!requireHoldToSeek) {
                        // Classic mode: drag previews, tap or release commits.
                        var preview = fractionOf(down.position.x)
                        var pastSlop = false
                        isScrubbing = true
                        previewFraction = preview
                        var upOrCancel = awaitTouchSlopOrCancellation(down.id) { change, _ ->
                            pastSlop = true
                            preview = fractionOf(change.position.x)
                            previewFraction = preview
                            change.consume()
                        }
                        if (upOrCancel == null && !pastSlop) {
                            // Pure tap → seek where tapped.
                            onSeekFraction(preview)
                            isScrubbing = false
                            return@awaitEachGesture
                        }
                        if (upOrCancel != null) {
                            // Drag in progress — follow until release.
                            var pointerId = upOrCancel.id
                            while (true) {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull { it.id == pointerId }
                                    ?: event.changes.firstOrNull()
                                    ?: break
                                preview = fractionOf(change.position.x)
                                previewFraction = preview
                                change.consume()
                                if (!change.pressed) break
                                pointerId = change.id
                            }
                            onSeekFraction(preview)
                        } else {
                            onSeekFraction(preview)
                        }
                        isScrubbing = false
                        return@awaitEachGesture
                    }

                    // Hold-to-seek mode: ignore taps, scrub on hold OR slide.
                    var preview = fractionOf(down.position.x)
                    var scrubbing = false
                    var holdFired = false
                    val holdJob: Job = gestureScope.launch {
                        delay(HOLD_TO_SCRUB_MS)
                        holdFired = true
                        if (!scrubbing) {
                            scrubbing = true
                            isScrubbing = true
                            previewFraction = preview
                            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                        }
                    }

                    // First: wait for either lift (tap → ignore) or slop (slide → scrub).
                    val slopChange = awaitTouchSlopOrCancellation(down.id) { change, _ ->
                        preview = fractionOf(change.position.x)
                    }
                    if (slopChange == null) {
                        // Finger lifted before moving past slop.
                        holdJob.cancel()
                        if (holdFired && !scrubbing) {
                            // Was a hold with no movement: enter scrub at hold point,
                            // wait for a slide or lift (lift commits the hold point).
                            scrubbing = true
                            isScrubbing = true
                            previewFraction = preview
                        }
                        if (!scrubbing) {
                            // Plain tap → intentionally ignored (miss-tap fix).
                            isScrubbing = false
                            return@awaitEachGesture
                        }
                        // Hold-only: commit on lift.
                        while (true) {
                            val event = awaitPointerEvent()
                            val change = event.changes.firstOrNull() ?: break
                            if (!change.pressed) {
                                preview = fractionOf(change.position.x)
                                break
                            }
                            preview = fractionOf(change.position.x)
                            previewFraction = preview
                        }
                        previewFraction = preview
                        isScrubbing = false
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onSeekFraction(preview)
                        return@awaitEachGesture
                    }

                    // Slide past slop → scrub immediately (no hold needed).
                    holdJob.cancel()
                    if (!scrubbing) {
                        scrubbing = true
                        isScrubbing = true
                        previewFraction = preview
                        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    }
                    slopChange.consume()
                    var pointerId = slopChange.id
                    preview = fractionOf(slopChange.position.x)
                    previewFraction = preview
                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull { it.id == pointerId }
                            ?: event.changes.firstOrNull()
                            ?: break
                        preview = fractionOf(change.position.x)
                        previewFraction = preview
                        change.consume()
                        if (!change.pressed) break
                        pointerId = change.id
                    }
                    isScrubbing = false
                    haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onSeekFraction(preview)
                }
            }
    ) {
        val bubbleVisible = isScrubbing && durationMs > 0
        val bubbleText = if (bubbleVisible) {
            "${formatMs((previewFraction * durationMs).toLong())} / ${formatMs(durationMs)}"
        } else null

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .align(Alignment.Center)
        ) {
            val width = size.width
            val canvasHeight = size.height
            val totalBars = amplitudes.size.coerceAtLeast(1)

            val spacing = 2.5.dp.toPx()
            val totalSpacing = spacing * (totalBars - 1)
            val barWidth = ((width - totalSpacing) / totalBars).coerceAtLeast(2.5.dp.toPx())

            val activeCutoffX = width * activeFraction

            val activeBrush = Brush.verticalGradient(
                colors = listOf(SoundCloudNeonOrange, SoundCloudOrangeGradientEnd)
            )

            amplitudes.forEachIndexed { index, amplitude ->
                val left = index * (barWidth + spacing)
                val barHeight = (canvasHeight * amplitude * 0.9f).coerceAtLeast(8.dp.toPx())
                val top = (canvasHeight - barHeight) / 2f

                val isPlayed = left + barWidth <= activeCutoffX

                if (isPlayed) {
                    drawRoundRect(
                        brush = activeBrush,
                        topLeft = Offset(x = left, y = top),
                        size = Size(width = barWidth, height = barHeight),
                        cornerRadius = CornerRadius(barWidth / 2, barWidth / 2)
                    )
                } else {
                    drawRoundRect(
                        color = if (isScrubbing) WaveformInactiveDark.copy(alpha = 0.7f) else WaveformInactiveDark,
                        topLeft = Offset(x = left, y = top),
                        size = Size(width = barWidth, height = barHeight),
                        cornerRadius = CornerRadius(barWidth / 2, barWidth / 2)
                    )
                }
            }

            // Scrub cursor: thicker + handle dot while scrubbing for fat-finger visibility.
            val cursorX = activeCutoffX.coerceIn(0f, width)
            if (isScrubbing) {
                drawLine(
                    color = Color.White,
                    start = Offset(x = cursorX, y = 0f),
                    end = Offset(x = cursorX, y = canvasHeight),
                    strokeWidth = 4.dp.toPx()
                )
                drawCircle(
                    color = SoundCloudNeonOrange,
                    radius = 9.dp.toPx(),
                    center = Offset(x = cursorX, y = canvasHeight / 2f)
                )
                drawCircle(
                    color = Color.White,
                    radius = 9.dp.toPx(),
                    center = Offset(x = cursorX, y = canvasHeight / 2f),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx())
                )
            } else {
                drawLine(
                    color = Color.White,
                    start = Offset(x = cursorX, y = 0f),
                    end = Offset(x = cursorX, y = canvasHeight),
                    strokeWidth = 3.dp.toPx()
                )
            }
        }

        // Scrub time bubble follows the finger.
        if (bubbleText != null) {
            val offsetXPx = with(density) {
                ((maxWidth.toPx() * previewFraction) - 32.dp.toPx()).toInt()
                    .coerceIn(0, (maxWidth.toPx() - 64.dp.toPx()).toInt().coerceAtLeast(0))
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color.Black.copy(alpha = 0.85f),
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .offset { IntOffset(offsetXPx, 0) }
                    .padding(top = 2.dp)
            ) {
                Text(
                    text = bubbleText,
                    color = Color.White,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }

        if (showHint && interactive) {
            Text(
                text = "Touch & hold, then slide to seek",
                color = Color.White.copy(alpha = 0.45f),
                fontSize = 10.sp,
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}
