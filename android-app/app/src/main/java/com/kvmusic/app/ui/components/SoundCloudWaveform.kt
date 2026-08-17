package com.kvmusic.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.SoundCloudNeonOrange
import com.kvmusic.app.ui.theme.SoundCloudOrangeGradientEnd
import com.kvmusic.app.ui.theme.WaveformInactiveDark

@Composable
fun SoundCloudWaveform(
    amplitudes: List<Float>,
    progressFraction: Float,
    onSeekFraction: (Float) -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = 80.dp
) {
    var isDragging by remember { mutableStateOf(false) }
    var dragFraction by remember { mutableFloatStateOf(0f) }

    val activeFraction = if (isDragging) dragFraction else progressFraction.coerceIn(0f, 1f)

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .pointerInput(Unit) {
                detectTapGestures { offset ->
                    val fraction = (offset.x / size.width).coerceIn(0f, 1f)
                    onSeekFraction(fraction)
                }
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        isDragging = true
                        dragFraction = (offset.x / size.width).coerceIn(0f, 1f)
                    },
                    onDragEnd = {
                        isDragging = false
                        onSeekFraction(dragFraction)
                    },
                    onDragCancel = {
                        isDragging = false
                    },
                    onDrag = { change, _ ->
                        dragFraction = (change.position.x / size.width).coerceIn(0f, 1f)
                    }
                )
            }
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
                    color = WaveformInactiveDark,
                    topLeft = Offset(x = left, y = top),
                    size = Size(width = barWidth, height = barHeight),
                    cornerRadius = CornerRadius(barWidth / 2, barWidth / 2)
                )
            }
        }

        // Animated Scrub Cursor Line
        val cursorX = activeCutoffX.coerceIn(0f, width)
        drawLine(
            color = Color.White,
            start = Offset(x = cursorX, y = 0f),
            end = Offset(x = cursorX, y = canvasHeight),
            strokeWidth = 3.dp.toPx()
        )
    }
}
