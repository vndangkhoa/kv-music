package com.kvmusic.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Cookie
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.Equalizer
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.data.model.User
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.theme.AccentSoft
import com.kvmusic.app.ui.theme.BodyRow
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.Glass
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.GlyphBg
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvOrange2
import com.kvmusic.app.ui.theme.KvShapeCard
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.LargeTitle
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.OnAccent
import com.kvmusic.app.ui.theme.TagBg
import com.kvmusic.app.ui.theme.glass
import kotlinx.coroutines.launch
import org.json.JSONObject

private val ErrorRed = Color(0xFFCF6679)
private val SuccessGreen = Color(0xFF4CAF50)

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
    val country by store.country.collectAsStateWithLifecycle(initialValue = "VN")
    val authState by authRepository.state.collectAsStateWithLifecycle()

    var hostInput by remember { mutableStateOf(host) }
    LaunchedEffect(host) { hostInput = host }

    var checking by remember { mutableStateOf(false) }
    var connOk by remember { mutableStateOf<Boolean?>(null) }
    var clearing by remember { mutableStateOf(false) }
    var updating by remember { mutableStateOf(false) }
    var updateLog by remember { mutableStateOf<String?>(null) }
    var fetchingCookies by remember { mutableStateOf(false) }
    var cookieLog by remember { mutableStateOf<String?>(null) }
    var pairInput by remember { mutableStateOf("") }
    var pairMsg by remember { mutableStateOf<String?>(null) }
    var pairMsgError by remember { mutableStateOf(false) }
    var generatingPair by remember { mutableStateOf(false) }
    var generatePairMsg by remember { mutableStateOf<String?>(null) }
    var linkingPair by remember { mutableStateOf(false) }
    var copied by remember { mutableStateOf(false) }
    var qualityOpen by remember { mutableStateOf(false) }
    var countryOpen by remember { mutableStateOf(false) }

    val versionName = remember {
        runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        }.getOrNull() ?: "1.0"
    }

    if (!AppUi.settingsOpen) return

    KvBottomSheet(onDismissRequest = { AppUi.settingsOpen = false }) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 28.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 12.dp, top = 6.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Cài đặt",
                    style = LargeTitle,
                    color = Fg,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    "Xong",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Fg2,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { AppUi.settingsOpen = false }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }

            SettingsSectionHeader(title = "MÁY CHỦ")
            SettingsCard {
                SettingsRow(
                    icon = Icons.Rounded.Dns,
                    title = "Máy chủ hiện tại",
                    value = host.ifBlank { "Chưa cấu hình" },
                    mono = true,
                    valueColor = if (host.isBlank()) Faint else Fg2,
                    onClick = {
                        if (!checking) {
                            scope.launch {
                                checking = true
                                val ok = musicRepository.canConnect()
                                checking = false
                                connOk = ok
                                Toaster.show(if (ok) "Kết nối thành công!" else "Không thể kết nối")
                            }
                        }
                    },
                    trailing = {
                        when {
                            checking -> CircularProgressIndicator(
                                modifier = Modifier.size(14.dp),
                                color = KvOrange,
                                strokeWidth = 2.dp,
                            )
                            connOk == true -> StatusPill("Kết nối OK", SuccessGreen)
                            connOk == false -> StatusPill("Không thể kết nối", ErrorRed)
                            else -> StatusPill("Kiểm tra kết nối", Muted)
                        }
                    },
                )
                SettingsDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = 14.dp, top = 8.dp, bottom = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SettingsInput(
                        value = hostInput,
                        onValueChange = { hostInput = it },
                        placeholder = "http://192.168.1.100:3110",
                        modifier = Modifier.weight(1f),
                    )
                    PrimaryPillButton(text = "Lưu", onClick = {
                        scope.launch {
                            store.setHost(hostInput)
                            authRepository.logout()
                            Toaster.show("Đã lưu máy chủ — vui lòng đăng nhập lại")
                        }
                    })
                }
                Text(
                    "VD: http://192.168.1.100:3110",
                    fontSize = 11.sp,
                    color = Faint,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 10.dp),
                )
            }

            SettingsSectionHeader(title = "PHÁT LẠI")
            SettingsCard {
                SettingsRow(
                    icon = Icons.Rounded.Equalizer,
                    title = "Chất lượng âm thanh",
                    value = quality,
                    mono = true,
                    onClick = { qualityOpen = !qualityOpen },
                    trailing = { Chevron() },
                )
                if (qualityOpen) {
                    SettingsDivider()
                    ChipSelector(
                        options = listOf(
                            "auto" to "Auto Stream",
                            "lossless" to "Lossless FLAC",
                            "high" to "High (256k)",
                            "standard" to "Standard",
                        ),
                        selected = quality,
                        onSelect = { id -> scope.launch { store.setQuality(id) } },
                        modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 14.dp),
                    )
                }
                SettingsDivider()
                SettingsRow(
                    icon = Icons.Rounded.Public,
                    title = "Quốc gia",
                    value = country,
                    mono = true,
                    onClick = { countryOpen = !countryOpen },
                    trailing = { Chevron() },
                )
                if (countryOpen) {
                    SettingsDivider()
                    ChipSelector(
                        options = listOf(
                            "VN" to "Việt Nam",
                            "US" to "Mỹ",
                            "KR" to "Hàn Quốc",
                            "JP" to "Nhật Bản",
                            "GB" to "Anh",
                            "IN" to "Ấn Độ",
                        ),
                        selected = country,
                        onSelect = { id -> scope.launch { store.setCountry(id) } },
                        modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 14.dp),
                    )
                }
            }

            val user = authState.user
            if (authState.isLoggedIn && user != null) {
                SettingsSectionHeader(title = "TÀI KHOẢN")
                SettingsCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        UserAvatarBadge(user)
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = user.name,
                                style = BodyRow,
                                color = Fg,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                text = user.email,
                                fontSize = 12.sp,
                                color = Muted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                    SettingsDivider()
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Glyph(icon = Icons.Rounded.Key)
                        Spacer(Modifier.width(12.dp))
                        Text(
                            "Mã ghép của bạn",
                            style = BodyRow,
                            color = Fg,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            user.pair_code,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = KvOrange,
                            letterSpacing = 1.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(GlyphBg)
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
                                tint = if (copied) SuccessGreen else Fg2,
                                modifier = Modifier.size(17.dp),
                            )
                        }
                    }
                    SettingsDivider()
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                    ) {
                        SecondaryPillButton(
                            text = if (generatingPair) "Đang tạo..." else "Tạo mã mới",
                            onClick = {
                                scope.launch {
                                    generatingPair = true
                                    generatePairMsg = null
                                    authRepository.generatePairCode()
                                        .onSuccess {
                                            authRepository.refreshMe()
                                            Toaster.show("Đã tạo mã ghép mới")
                                        }
                                        .onFailure {
                                            generatePairMsg = it.message ?: "Không thể tạo mã ghép"
                                            Toaster.show(it.message ?: "Không thể tạo mã ghép")
                                        }
                                    generatingPair = false
                                }
                            },
                            enabled = !generatingPair,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        generatePairMsg?.let { message ->
                            Spacer(Modifier.height(8.dp))
                            Text(
                                message,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = ErrorRed,
                            )
                        }
                    }
                    SettingsDivider()
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 14.dp, end = 14.dp, top = 10.dp, bottom = 10.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Glyph(icon = Icons.Rounded.Link)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                "Liên kết mã",
                                style = BodyRow,
                                color = Fg,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            SettingsInput(
                                value = pairInput,
                                onValueChange = { pairInput = it },
                                placeholder = "Nhập mã ghép (VD: KV-849201)",
                                modifier = Modifier.weight(1f),
                            )
                            PrimaryPillButton(
                                text = "Ghép",
                                onClick = {
                                    scope.launch {
                                        linkingPair = true
                                        authRepository.linkPairCode(pairInput.trim())
                                            .onSuccess {
                                                authRepository.refreshMe()
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
                            )
                        }
                        pairMsg?.let { message ->
                            Spacer(Modifier.height(8.dp))
                            Text(
                                message,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (pairMsgError) ErrorRed else SuccessGreen,
                            )
                        }
                    }
                    SettingsDivider()
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .clickable {
                                scope.launch {
                                    authRepository.logout()
                                    Toaster.show("Đã đăng xuất")
                                }
                            }
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Glyph(icon = Icons.Rounded.Logout, tint = ErrorRed)
                        Spacer(Modifier.width(12.dp))
                        Text(
                            "Đăng xuất",
                            style = BodyRow,
                            color = ErrorRed,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            } else {
                SettingsSectionHeader(title = "TÀI KHOẢN")
                SettingsCard {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "Đăng nhập để dùng mã ghép",
                            fontSize = 12.sp,
                            color = Muted,
                        )
                    }
                }
            }

            SettingsSectionHeader(title = "NÂNG CAO")
            SettingsCard {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Glyph(icon = Icons.Rounded.Refresh)
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Cập nhật yt-dlp", style = BodyRow, color = Fg)
                        Spacer(Modifier.height(2.dp))
                        Text("Cập nhật engine trích xuất âm thanh", fontSize = 11.sp, color = Muted)
                    }
                    Spacer(Modifier.width(8.dp))
                    ActionPillButton(
                        text = if (updating) "Đang cập nhật..." else "Cập nhật",
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
                    )
                }
                updateLog?.let { log ->
                    LogBox(log = log, modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 12.dp))
                }
                SettingsDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Glyph(icon = Icons.Rounded.Cookie)
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Lấy Cookie mới", style = BodyRow, color = Fg)
                        Spacer(Modifier.height(2.dp))
                        Text("Xoay phiên làm việc để duy trì tốc độ phát", fontSize = 11.sp, color = Muted)
                    }
                    Spacer(Modifier.width(8.dp))
                    ActionPillButton(
                        text = if (fetchingCookies) "Đang lấy..." else "Lấy Cookie",
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
                    )
                }
                cookieLog?.let { log ->
                    LogBox(log = log, modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 12.dp))
                }
                SettingsDivider()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Glyph(icon = Icons.Rounded.Storage)
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Xóa bộ nhớ đệm", style = BodyRow, color = Fg)
                        Spacer(Modifier.height(2.dp))
                        Text("Xóa cấu hình máy chủ, tài khoản và dữ liệu tạm", fontSize = 11.sp, color = Muted)
                    }
                    Spacer(Modifier.width(8.dp))
                    DangerPillButton(
                        text = "Xóa",
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
                    )
                }
            }

            Text(
                text = "v$versionName",
                fontSize = 11.sp,
                color = Muted,
                fontFamily = FontFamily.Monospace,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
            )
        }
    }
}

@Composable
private fun SettingsSectionHeader(title: String, modifier: Modifier = Modifier) {
    Text(
        text = title,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        fontFamily = FontFamily.Monospace,
        letterSpacing = 0.09.em,
        color = Muted,
        modifier = modifier.padding(start = 8.dp, end = 8.dp, top = 16.dp, bottom = 8.dp),
    )
}

@Composable
private fun SettingsCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier = modifier.fillMaxWidth().glass(KvShapeCard), content = content)
}

@Composable
private fun SettingsRow(
    icon: ImageVector,
    title: String,
    value: String? = null,
    mono: Boolean = false,
    valueColor: Color = Muted,
    onClick: (() -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Glyph(icon = icon)
        Spacer(Modifier.width(12.dp))
        Text(
            title,
            style = BodyRow,
            color = Fg,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (value != null) {
            Text(
                value,
                fontSize = 13.sp,
                fontFamily = if (mono) FontFamily.Monospace else null,
                color = valueColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        if (trailing != null) {
            Spacer(Modifier.width(8.dp))
            trailing()
        }
    }
}

@Composable
private fun SettingsDivider(modifier: Modifier = Modifier) {
    HorizontalDivider(
        modifier = modifier.padding(start = 60.dp),
        thickness = 0.5.dp,
        color = Hair,
    )
}

@Composable
private fun Glyph(icon: ImageVector, tint: Color = Fg2) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(GlyphBg),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(19.dp))
    }
}

@Composable
private fun Chevron() {
    Icon(
        imageVector = Icons.Rounded.ChevronRight,
        contentDescription = null,
        tint = Faint,
        modifier = Modifier.size(16.dp),
    )
}

@Composable
private fun StatusPill(text: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(KvShapePill)
            .background(color.copy(alpha = 0.14f))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChipSelector(
    options: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { (id, label) ->
            val isSelected = selected == id
            Row(
                modifier = Modifier
                    .clip(KvShapePill)
                    .background(if (isSelected) AccentSoft else GlyphBg)
                    .clickable { onSelect(id) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    label,
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (isSelected) Fg else Muted,
                )
                if (isSelected) {
                    Spacer(Modifier.width(5.dp))
                    Icon(
                        imageVector = Icons.Rounded.Check,
                        contentDescription = null,
                        tint = KvOrange,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(46.dp)
            .glass(KvShapePill),
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = TextStyle(fontSize = 16.sp, color = Fg),
            cursorBrush = SolidColor(KvOrange),
            modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp),
            decorationBox = { innerTextField ->
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) {
                        Text(
                            placeholder,
                            fontSize = 15.sp,
                            color = Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    innerTextField()
                }
            },
        )
    }
}

@Composable
private fun PrimaryPillButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(48.dp)
            .clip(KvShapePill)
            .background(if (enabled) KvOrange else TagBg)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 22.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (enabled) OnAccent else Faint,
        )
    }
}

@Composable
private fun SecondaryPillButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(42.dp)
            .clip(KvShapePill)
            .background(Glass, KvShapePill)
            .border(1.dp, GlassBorder, KvShapePill)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (enabled) Fg2 else Faint,
        )
    }
}

@Composable
private fun ActionPillButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(34.dp)
            .clip(KvShapePill)
            .background(if (enabled) KvOrange else TagBg)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (enabled) OnAccent else Faint,
        )
    }
}

@Composable
private fun DangerPillButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(34.dp)
            .clip(KvShapePill)
            .background(if (enabled) ErrorRed.copy(alpha = 0.12f) else TagBg)
            .border(1.dp, ErrorRed.copy(alpha = 0.35f), KvShapePill)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (enabled) ErrorRed else Faint,
        )
    }
}

@Composable
private fun LogBox(log: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(TagBg)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(
            log,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = KvOrange2,
            maxLines = 6,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun UserAvatarBadge(user: User) {
    val (from, to) = remember(user.avatar_color) { parseAvatarGradient(user.avatar_color) }
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(from, to))),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = nameInitials(user.name),
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            color = OnAccent,
        )
    }
}

private fun parseAvatarGradient(raw: String): Pair<Color, Color> {
    val fallback = KvOrange to KvOrange2
    if (raw.isBlank()) return fallback
    return try {
        val json = JSONObject(raw)
        val from = json.optString("from", "").toColorOrNull() ?: KvOrange
        val to = json.optString("to", "").toColorOrNull() ?: KvOrange2
        from to to
    } catch (_: Exception) {
        fallback
    }
}

private fun String.toColorOrNull(): Color? =
    try {
        Color(android.graphics.Color.parseColor(this))
    } catch (_: Exception) {
        null
    }

private fun nameInitials(name: String): String {
    val words = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    val initials = words.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
    return initials.ifEmpty { "♪" }
}
