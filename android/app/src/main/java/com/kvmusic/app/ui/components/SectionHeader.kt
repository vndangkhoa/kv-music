package com.kvmusic.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.sp
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.SectionHeader as SectionHeaderStyle

@Composable
fun SectionHeader(title: String, onMore: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            style = SectionHeaderStyle,
            color = Fg,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (onMore != null) {
            Text(
                text = "Xem thêm",
                fontSize = 13.sp,
                color = Muted,
                modifier = Modifier.clickable(onClick = onMore)
            )
        }
    }
}
