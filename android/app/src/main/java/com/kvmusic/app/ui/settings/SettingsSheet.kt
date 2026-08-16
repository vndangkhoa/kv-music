package com.kvmusic.app.ui.settings

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Cookie
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.QrCode
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.components.SectionHeader
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvCard
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvOrange2
import com.kvmusic.app.ui.theme.KvRow
import kotlinx.coroutines.launch

@Composable
fun SettingsSheet() {
    val context = LocalContext.current
    val container = (context.applicationContext as KvMusicApp).container
    val store = container.serverConfigStore
    val apiClient = container.apiClient
    val musicRepository = container.musicRepository
    val authRepository = container.authRepository
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current

    val host by store.host.collectAsStateWithLifecycle(initialValue = store.currentHost())
    val quality by store.quality.collectAsStateWithLifecycle(initialValue = "auto")
    val authState by authRepository.state.collectAsStateWithLifecycle()

    var hostInput by remember { mutableStateOf(host) }
    LaunchedEffect(host) { hostInput = host }

    var checking by remember { mutableStateOf(false) }
    var clearing by remember { mutableStateOf(false) }
    var updating by remember { mutableStateOf(false) }
    var updateLog by remember { mutableStateOf<String?>(null) }
    var fetchingCookies by remember { mutableStateOf(false) }
    var cookieLog by remember { mutableStateOf<String?>(null) }
    var pairInput by remember { mutableStateOf("") }
    var pairMsg by remember { mutableStateOf<String?>(null) }
    var pairMsgError by remember { mutableStateOf(false) }
    var generatingPair by remember { mutableStateOf(false) }
    var linkingPair by remember { mutableStateOf(false) }
    var copied by remember { mutableStateOf(false) }

    if (!AppUi.settingsOpen) return

    KvBottomSheet(onDismissRequest = { AppUi.settingsOpen = false }) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 16.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Cài đặt",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { AppUi.settingsOpen = false }) {
                    Icon(Icons.Rounded.Close, contentDescription = "Đóng", tint = KvMuted)
                }
            }

            SectionHeader(title = "MÁY CHỦ", modifier = Modifier.padding(horizontal = 20.dp))
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(KvRow, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Dns, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Máy chủ hiện tại", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = KvMuted)
                    Text(
                        host.ifBlank { "Chưa cấu hình" },
                        fontSize = 13.sp,
                        color = if (host.isBlank()) KvFaint else Color.White,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            SettingsField(
                value = hostInput,
                onValueChange = { hostInput = it },
                placeholder = "http://192.168.1.100:3110",
            )
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(
                    onClick = {
                        scope.launch {
                            store.setHost(hostInput)
                            store.clearAuth()
                            Toaster.show("Đã lưu máy chủ — vui lòng đăng nhập lại")
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = KvOrange),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Lưu", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            checking = true
                            val ok = musicRepository.canConnect()
                            checking = false
                            Toaster.show(if (ok) "Kết nối thành công!" else "Không thể kết nối")
                        }
                    },
                    enabled = !checking,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, KvBorder),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = KvOrange, disabledContentColor = KvFaint),
                    modifier = Modifier.weight(1f),
                ) {
                    if (checking) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = KvOrange, strokeWidth = 2.dp)
                    } else {
                        Text("Kiểm tra kết nối", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "VD: http://192.168.1.100:3110",
                fontSize = 11.sp,
                color = KvFaint,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
            Spacer(Modifier.height(16.dp))

            SectionHeader(title = "CHẤT LƯỢNG ÂM THANH", modifier = Modifier.padding(horizontal = 20.dp))
            Spacer(Modifier.height(4.dp))
            val qualityOptions = listOf(
                "auto" to "Auto Stream",
                "lossless" to "Lossless FLAC",
                "high" to "High (256k)",
                "standard" to "Standard",
            )
            qualityOptions.forEach { (id, label) ->
                val selected = quality == id
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (selected) Color(0x14FF5500) else Color.Transparent)
                        .clickable {
                            scope.launch { store.setQuality(id) }
                        }
                        .padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        label,
                        fontSize = 13.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                        color = if (selected) Color.White else KvMuted,
                        modifier = Modifier.weight(1f),
                    )
                    if (selected) {
                        Icon(Icons.Rounded.Check, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            SectionHeader(title = "GHÉP THIẾT BỊ", modifier = Modifier.padding(horizontal = 20.dp))
            Spacer(Modifier.height(8.dp))
            val user = authState.user
            if (authState.isLoggedIn && user != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .background(KvRow, RoundedCornerShape(10.dp))
                        .padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.QrCode, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Mã ghép của bạn", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = KvMuted)
                        Spacer(Modifier.height(2.dp))
                        Text(
                            user.pair_code,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = KvOrange,
                            letterSpacing = 3.sp,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(KvInput)
                            .clickable {
                                clipboard.setText(AnnotatedString(user.pair_code))
                                copied = true
                                Toaster.show("Đã sao chép mã")
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.ContentCopy,
                            contentDescription = "Sao chép",
                            tint = if (copied) Color(0xFF4CAF50) else KvOrange,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            generatingPair = true
                            authRepository.generatePairCode()
                                .onSuccess {
                                    authRepository.refreshMe()
                                    Toaster.show("Đã tạo mã ghép mới")
                                }
                                .onFailure { Toaster.show(it.message ?: "Không thể tạo mã ghép") }
                            generatingPair = false
                        }
                    },
                    enabled = !generatingPair,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, KvBorder),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = KvOrange, disabledContentColor = KvFaint),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                ) {
                    Text(if (generatingPair) "Đang tạo..." else "Tạo mã mới", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(10.dp))
                SettingsField(value = pairInput, onValueChange = { pairInput = it }, placeholder = "Nhập mã ghép (VD: KV-849201)")
                pairMsg?.let { message ->
                    Spacer(Modifier.height(6.dp))
                    Text(
                        message,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (pairMsgError) Color(0xFFCF6679) else Color(0xFF4CAF50),
                        modifier = Modifier.padding(horizontal = 20.dp),
                    )
                }
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        scope.launch {
                            linkingPair = true
                            authRepository.linkPairCode(pairInput.trim())
                                .onSuccess {
                                    pairMsg = "Đã ghép thiết bị thành công!"
                                    pairMsgError = false
                                    pairInput = ""
                                }
                                .onFailure {
                                    pairMsg = it.message ?: "Mã ghép không hợp lệ"
                                    pairMsgError = true
                                }
                            linkingPair = false
                        }
                    },
                    enabled = pairInput.isNotBlank() && !linkingPair,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KvOrange,
                        disabledContainerColor = KvCard,
                    ),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                ) {
                    Text("Ghép", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            } else {
                Text(
                    "Đăng nhập để dùng mã ghép",
                    fontSize = 12.sp,
                    color = KvMuted,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }
            Spacer(Modifier.height(16.dp))

            SectionHeader(title = "HỆ THỐNG", modifier = Modifier.padding(horizontal = 20.dp))
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(KvRow, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Storage, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Xóa bộ nhớ đệm", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Xóa cấu hình máy chủ, tài khoản và dữ liệu tạm", fontSize = 11.sp, color = KvMuted)
                }
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            clearing = true
                            store.clearAll()
                            container.database.clearAll()
                            clearing = false
                            Toaster.show("Đã xóa bộ nhớ đệm")
                        }
                    },
                    enabled = !clearing,
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, Color(0x66CF6679)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFCF6679), disabledContentColor = KvFaint),
                ) {
                    Text("Xóa", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(KvRow, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Refresh, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Cập nhật yt-dlp", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Cập nhật engine trích xuất âm thanh", fontSize = 11.sp, color = KvMuted)
                }
                Button(
                    onClick = {
                        scope.launch {
                            updating = true
                            updateLog = null
                            try {
                                val response = apiClient.service().updateYtdlp()
                                val body = response.body()
                                updateLog = when {
                                    response.isSuccessful && body != null ->
                                        body.output ?: body.error ?: "Đã cập nhật yt-dlp thành công!"
                                    else -> "Lỗi máy chủ (${response.code()})"
                                }
                            } catch (_: Exception) {
                                updateLog = "Lỗi kết nối máy chủ"
                            } finally {
                                updating = false
                            }
                        }
                    },
                    enabled = !updating,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = KvOrange, disabledContainerColor = KvCard),
                ) {
                    Text(if (updating) "Đang cập nhật..." else "Cập nhật", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
            updateLog?.let { log ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.4f))
                        .border(1.dp, KvBorder, RoundedCornerShape(8.dp))
                        .padding(10.dp),
                ) {
                    Text(
                        log,
                        fontSize = 10.sp,
                        color = KvOrange2,
                        fontFamily = FontFamily.Monospace,
                        maxLines = 6,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(KvRow, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Cookie, contentDescription = null, tint = KvOrange, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Lấy Cookie mới", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Xoay phiên làm việc để duy trì tốc độ phát", fontSize = 11.sp, color = KvMuted)
                }
                Button(
                    onClick = {
                        scope.launch {
                            fetchingCookies = true
                            cookieLog = null
                            try {
                                val response = apiClient.service().fetchCookies()
                                val body = response.body()
                                cookieLog = when {
                                    response.isSuccessful && body != null ->
                                        body.output ?: body.error ?: "Đã lấy cookie mới thành công!"
                                    else -> "Lỗi máy chủ (${response.code()})"
                                }
                            } catch (_: Exception) {
                                cookieLog = "Lỗi kết nối máy chủ"
                            } finally {
                                fetchingCookies = false
                            }
                        }
                    },
                    enabled = !fetchingCookies,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = KvOrange, disabledContainerColor = KvCard),
                ) {
                    Text(if (fetchingCookies) "Đang lấy..." else "Lấy Cookie", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
            cookieLog?.let { log ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.4f))
                        .border(1.dp, KvBorder, RoundedCornerShape(8.dp))
                        .padding(10.dp),
                ) {
                    Text(
                        log,
                        fontSize = 10.sp,
                        color = KvOrange2,
                        fontFamily = FontFamily.Monospace,
                        maxLines = 6,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))

            if (authState.isLoggedIn) {
                SectionHeader(title = "TÀI KHOẢN", modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            authRepository.logout()
                            Toaster.show("Đã đăng xuất")
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0x66CF6679)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFCF6679)),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                ) {
                    Icon(Icons.Rounded.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Đăng xuất", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun SettingsField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = KvFaint) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = KvOrange,
            unfocusedBorderColor = KvBorder,
            focusedContainerColor = KvInput,
            unfocusedContainerColor = KvInput,
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            cursorColor = KvOrange,
        ),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
    )
}
