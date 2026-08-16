package com.kvmusic.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvSheet
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KvBottomSheet(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        containerColor = KvSheet,
        scrimColor = Color(0x99000000),
        dragHandle = { BottomSheetDefaults.DragHandle(color = KvFaint) }
    ) {
        content()
    }
}

private const val ToastExitMs = 400L

@Composable
fun KvToastHost(modifier: Modifier = Modifier) {
    val toasts by Toaster.toasts
    val items = remember { mutableStateListOf<Toaster.ToastItem>() }
    val hidden = remember { mutableStateListOf<Long>() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(toasts) {
        val sourceIds = toasts.map { it.id }.toSet()
        for (t in toasts) {
            if (items.none { it.id == t.id }) {
                hidden.remove(t.id)
                items.add(t)
            }
        }
        items.toList().forEach { item ->
            if (item.id !in sourceIds) {
                if (hidden.add(item.id)) {
                    scope.launch {
                        delay(ToastExitMs)
                        items.remove(item)
                        hidden.remove(item.id)
                    }
                }
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(bottom = 96.dp)
            .zIndex(100f),
        contentAlignment = Alignment.BottomCenter
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items.forEach { item ->
                key(item.id) {
                    AnimatedVisibility(
                        visible = item.id !in hidden,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF333333), RoundedCornerShape(24.dp))
                                .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(24.dp))
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = item.message,
                                fontSize = 13.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}
