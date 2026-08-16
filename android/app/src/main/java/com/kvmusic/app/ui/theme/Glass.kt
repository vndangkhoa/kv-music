package com.kvmusic.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

private val SheenBrush = Brush.horizontalGradient(
    colorStops = arrayOf(
        0.0f to Color.Transparent,
        0.22f to Color(0x8CFFFFFF),
        0.60f to Color(0x2EFFFFFF),
        1.0f to Color.Transparent
    )
)

private fun DrawScope.drawSheen() {
    val stroke = 1.5.dp.toPx()
    val inset = 8.dp.toPx()
    drawLine(
        brush = SheenBrush,
        start = Offset(inset, stroke / 2f),
        end = Offset(size.width - inset, stroke / 2f),
        strokeWidth = stroke,
        cap = StrokeCap.Round
    )
}

private fun Modifier.glassSurface(shape: Shape, colors: List<Color>): Modifier =
    this
        .clip(shape)
        .background(Brush.verticalGradient(colors))
        .border(0.5.dp, GlassBorder, shape)
        .drawBehind { drawSheen() }

fun Modifier.glass(shape: Shape = RoundedCornerShape(20.dp)): Modifier =
    glassSurface(shape, listOf(GlassHi, GlassLo))

val Modifier.glassStrong: Modifier
    get() = glassSurface(RoundedCornerShape(20.dp), listOf(GlassStrong, Glass))

@Composable
fun WashBackground(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(KvBackground)
            .drawBehind {
                wash(WashA, 0.12f, -0.06f, 520.dp)
                wash(WashB, 1.08f, 0.18f, 460.dp)
                wash(WashC, 0.50f, 1.14f, 620.dp)
            }
    )
}

private fun DrawScope.wash(color: Color, fx: Float, fy: Float, radiusDp: Dp) {
    val center = Offset(size.width * fx, size.height * fy)
    val radius = radiusDp.toPx()
    drawCircle(
        brush = Brush.radialGradient(
            colorStops = arrayOf(0.0f to color, 1.0f to Color.Transparent),
            center = center,
            radius = radius
        ),
        radius = radius,
        center = center
    )
}

data class PlayButtonPalette(val bg: Color, val fg: Color, val glow: Color)

val PlayButtonColors = PlayButtonPalette(bg = OnAccent, fg = KvBackground, glow = AccentGlow)
