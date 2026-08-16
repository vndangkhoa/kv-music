package com.kvmusic.app.ui.components

import android.provider.Settings
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.kvmusic.app.ui.theme.KvOrange

@Composable
fun EqIndicator(playing: Boolean, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val reducedMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    Box(modifier = modifier.size(16.dp), contentAlignment = Alignment.BottomCenter) {
        if (playing && !reducedMotion) {
            val transition = rememberInfiniteTransition(label = "eq")
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                val bases = listOf(8.dp, 14.dp, 10.dp)
                val ranges = listOf(0.55f to 1f, 0.6f to 1f, 0.7f to 1f)
                val delays = listOf(0, 150, 75)
                bases.forEachIndexed { i, base ->
                    val (lo, hi) = ranges[i]
                    val scale by transition.animateFloat(
                        initialValue = hi,
                        targetValue = lo,
                        animationSpec = infiniteRepeatable(
                            animation = tween(520, delayMillis = delays[i]),
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "eqBar$i"
                    )
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(base * scale)
                            .background(KvOrange, RoundedCornerShape(2.dp))
                    )
                }
            }
        } else {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                listOf(8.dp, 14.dp, 10.dp).forEach { base ->
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(base)
                            .background(KvOrange, RoundedCornerShape(2.dp))
                    )
                }
            }
        }
    }
}
