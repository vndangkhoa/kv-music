package com.kvmusic.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.model.LyricLine
import com.kvmusic.app.ui.theme.KvMuted
import kotlin.math.max

@Composable
fun LyricsView(lines: List<LyricLine>, currentTime: Double, onLineClick: (Double) -> Unit, modifier: Modifier = Modifier) {
    val listState = rememberLazyListState()
    val activeIndex = remember(lines, currentTime) {
        var idx = -1
        lines.forEachIndexed { i, line ->
            if (line.time <= currentTime) idx = i
        }
        idx
    }
    LaunchedEffect(activeIndex) {
        if (activeIndex >= 0) {
            listState.animateScrollToItem(max(0, activeIndex - 2))
        }
    }
    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(18.dp),
        contentPadding = PaddingValues(vertical = 24.dp)
    ) {
        itemsIndexed(lines) { i, line ->
            val isActive = i == activeIndex
            Text(
                text = line.text,
                fontSize = if (isActive) 16.sp else 14.sp,
                fontWeight = if (isActive) FontWeight.Medium else FontWeight.Normal,
                color = if (isActive) Color.White else KvMuted,
                modifier = Modifier.clickable { onLineClick(line.time) }
            )
        }
    }
}
