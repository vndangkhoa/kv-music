package com.kvmusic.app.ui.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Login
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.QrCode
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.KvMusicApp
import com.kvmusic.app.ui.AppUi
import com.kvmusic.app.ui.Toaster
import com.kvmusic.app.ui.components.KvBottomSheet
import com.kvmusic.app.ui.theme.KvBorder
import com.kvmusic.app.ui.theme.KvCard
import com.kvmusic.app.ui.theme.KvFaint
import com.kvmusic.app.ui.theme.KvInput
import com.kvmusic.app.ui.theme.KvMuted
import com.kvmusic.app.ui.theme.KvOrange
import kotlinx.coroutines.launch

private data class AvatarGradient(val from: Color, val to: Color)

private val AvatarColors = listOf(
    AvatarGradient(Color(0xFFFF5500), Color(0xFFFF7A00)),
    AvatarGradient(Color(0xFF00A8FF), Color(0xFF2E86DE)),
    AvatarGradient(Color(0xFF1DB954), Color(0xFF0F8F3F)),
    AvatarGradient(Color(0xFFFF6B6B), Color(0xFFC92A2A)),
    AvatarGradient(Color(0xFF4ECDC4), Color(0xFF1A936F)),
    AvatarGradient(Color(0xFF45B7D1), Color(0xFF2C6E91)),
    AvatarGradient(Color(0xFF6C5CE7), Color(0xFF341F97)),
    AvatarGradient(Color(0xFFFDCB6E), Color(0xFFE17055)),
)

@Composable
fun LoginSheet() {
    val context = LocalContext.current
    val container = (context.applicationContext as KvMusicApp).container
    val auth = container.authRepository
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current

    if (!AppUi.loginOpen) return

    var tab by remember { mutableStateOf(0) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var avatarIndex by remember { mutableStateOf(0) }
    var pairInput by remember { mutableStateOf("") }
    var generatedCode by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var linking by remember { mutableStateOf(false) }
    var generating by remember { mutableStateOf(false) }

    KvBottomSheet(
        onDismissRequest = { AppUi.loginOpen = false },
        modifier = Modifier.fillMaxHeight(0.8f),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 4.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Tài khoản & Đồng bộ",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { AppUi.loginOpen = false }) {
                Icon(Icons.Rounded.Close, contentDescription = "Đóng", tint = KvMuted)
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .background(KvInput, RoundedCornerShape(12.dp))
                .padding(3.dp),
        ) {
            LoginTab(
                label = "Đăng nhập",
                icon = Icons.Rounded.Login,
                selected = tab == 0,
                modifier = Modifier.weight(1f),
                onClick = { tab = 0; error = null },
            )
            LoginTab(
                label = "Đăng ký",
                icon = Icons.Rounded.PersonAdd,
                selected = tab == 1,
                modifier = Modifier.weight(1f),
                onClick = { tab = 1; error = null },
            )
            LoginTab(
                label = "Mã ghép",
                icon = Icons.Rounded.QrCode,
                selected = tab == 2,
                modifier = Modifier.weight(1f),
                onClick = { tab = 2; error = null },
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            error?.let { message ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0x1ACF6679), RoundedCornerShape(10.dp))
                        .padding(10.dp),
                ) {
                    Text(message, fontSize = 12.sp, color = Color(0xFFCF6679), fontWeight = FontWeight.Medium)
                }
                Spacer(Modifier.height(12.dp))
            }

            when (tab) {
                0 -> {
                    AuthField(value = email, onValueChange = { email = it }, label = "Email")
                    Spacer(Modifier.height(10.dp))
                    AuthField(value = password, onValueChange = { password = it }, label = "Mật khẩu", isPassword = true)
                    Spacer(Modifier.height(16.dp))
                    AuthButton(
                        text = "Đăng nhập",
                        loading = loading,
                        enabled = email.isNotBlank() && password.isNotBlank(),
                        onClick = {
                            scope.launch {
                                loading = true
                                val result = auth.login(email.trim(), password)
                                loading = false
                                result.fold(
                                    onSuccess = { displayName ->
                                        AppUi.loginOpen = false
                                        Toaster.show("Xin chào, $displayName!")
                                    },
                                    onFailure = { error = it.message ?: "Đã xảy ra lỗi" },
                                )
                            }
                        },
                    )
                }
                1 -> {
                    val selected = AvatarColors[avatarIndex]
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(Brush.linearGradient(listOf(selected.from, selected.to)))
                                .border(2.dp, KvOrange, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                            )
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    AuthField(value = name, onValueChange = { name = it }, label = "Họ tên")
                    Spacer(Modifier.height(10.dp))
                    AuthField(value = email, onValueChange = { email = it }, label = "Email")
                    Spacer(Modifier.height(10.dp))
                    AuthField(value = password, onValueChange = { password = it }, label = "Mật khẩu (tối thiểu 6 ký tự)", isPassword = true)
                    if (password.isNotEmpty() && password.length < 6) {
                        Spacer(Modifier.height(6.dp))
                        Text("Mật khẩu phải có ít nhất 6 ký tự", fontSize = 11.sp, color = Color(0xFFCF6679))
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Màu đại diện", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = KvMuted)
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AvatarColors.forEachIndexed { index, gradient ->
                            val isSelected = index == avatarIndex
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Brush.linearGradient(listOf(gradient.from, gradient.to)))
                                    .border(2.dp, if (isSelected) Color.White else Color.Transparent, CircleShape)
                                    .clickable { avatarIndex = index },
                                contentAlignment = Alignment.Center,
                            ) {
                                if (isSelected) {
                                    Icon(
                                        imageVector = Icons.Rounded.Check,
                                        contentDescription = "Đã chọn",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                    AuthButton(
                        text = "Đăng ký",
                        loading = loading,
                        enabled = name.isNotBlank() && email.isNotBlank() && password.length >= 6,
                        onClick = {
                            val colorJson = "{\"from\":\"${selected.from.hex()}\",\"to\":\"${selected.to.hex()}\"}"
                            scope.launch {
                                loading = true
                                val result = auth.register(name.trim(), email.trim(), password, colorJson)
                                loading = false
                                result.fold(
                                    onSuccess = {
                                        AppUi.loginOpen = false
                                        Toaster.show("Đăng ký thành công!")
                                    },
                                    onFailure = { error = it.message ?: "Đã xảy ra lỗi" },
                                )
                            }
                        },
                    )
                }
                else -> {
                    Text(
                        "Nhập mã ghép từ thiết bị khác để đồng bộ danh sách phát và tài khoản.",
                        fontSize = 12.sp,
                        color = KvMuted,
                    )
                    Spacer(Modifier.height(12.dp))
                    AuthField(value = pairInput, onValueChange = { pairInput = it }, label = "Mã ghép (VD: KV-849201)")
                    Spacer(Modifier.height(16.dp))
                    AuthButton(
                        text = "Ghép thiết bị",
                        loading = linking,
                        enabled = pairInput.isNotBlank(),
                        onClick = {
                            scope.launch {
                                linking = true
                                val result = auth.linkPairCode(pairInput.trim())
                                linking = false
                                result.fold(
                                    onSuccess = {
                                        AppUi.loginOpen = false
                                        Toaster.show("Đã ghép thiết bị thành công!")
                                    },
                                    onFailure = { error = it.message ?: "Mã ghép không hợp lệ" },
                                )
                            }
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = {
                            scope.launch {
                                generating = true
                                val result = auth.generatePairCode()
                                generating = false
                                result.fold(
                                    onSuccess = { code ->
                                        generatedCode = code
                                        Toaster.show("Đã tạo mã ghép mới")
                                    },
                                    onFailure = { error = it.message ?: "Không thể tạo mã ghép" },
                                )
                            }
                        },
                        enabled = !generating,
                        shape = RoundedCornerShape(24.dp),
                        border = BorderStroke(1.dp, KvBorder),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = KvOrange,
                            disabledContentColor = KvFaint,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Tạo mã ghép mới", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    generatedCode?.let { code ->
                        Spacer(Modifier.height(16.dp))
                        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "MÃ GHÉP CỦA BẠN",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = KvMuted,
                                letterSpacing = 1.sp,
                            )
                            Spacer(Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    code,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = KvOrange,
                                    letterSpacing = 4.sp,
                                    fontFamily = FontFamily.Monospace,
                                )
                                Spacer(Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(KvInput)
                                        .clickable {
                                            clipboard.setText(AnnotatedString(code))
                                            Toaster.show("Đã sao chép mã")
                                        },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.ContentCopy,
                                        contentDescription = "Sao chép mã",
                                        tint = KvOrange,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun LoginTab(label: String, icon: ImageVector, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(9.dp))
            .background(if (selected) KvOrange else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = if (selected) Color.White else KvMuted, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = if (selected) Color.White else KvMuted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun AuthField(value: String, onValueChange: (String) -> Unit, label: String, isPassword: Boolean = false) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = KvMuted) },
        singleLine = true,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
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
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun AuthButton(text: String, loading: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(24.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = KvOrange,
            contentColor = Color.White,
            disabledContainerColor = KvCard,
            disabledContentColor = KvFaint,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
    }
}

private fun Color.hex(): String = "#%06x".format(this.value.toLong() and 0xFFFFFFL)
