package com.kvmusic.app.ui.auth

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Login
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.QrCode
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
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
import com.kvmusic.app.ui.theme.AccentSoft
import com.kvmusic.app.ui.theme.Eyebrow
import com.kvmusic.app.ui.theme.Faint
import com.kvmusic.app.ui.theme.Fg
import com.kvmusic.app.ui.theme.Fg2
import com.kvmusic.app.ui.theme.GlassBorder
import com.kvmusic.app.ui.theme.Hair
import com.kvmusic.app.ui.theme.KvOrange
import com.kvmusic.app.ui.theme.KvShapePill
import com.kvmusic.app.ui.theme.Muted
import com.kvmusic.app.ui.theme.NavTitle
import com.kvmusic.app.ui.theme.glass
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
    var linkError by remember { mutableStateOf<String?>(null) }
    var generateError by remember { mutableStateOf<String?>(null) }

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
                style = NavTitle,
                color = Fg,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { AppUi.loginOpen = false }) {
                Icon(Icons.Rounded.Close, contentDescription = "Đóng", tint = Fg2, modifier = Modifier.size(20.dp))
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .glass(KvShapePill)
                .padding(4.dp),
        ) {
            AuthTab(
                label = "Đăng nhập",
                icon = Icons.Rounded.Login,
                selected = tab == 0,
                modifier = Modifier.weight(1f),
                onClick = { tab = 0; error = null; linkError = null; generateError = null },
            )
            AuthTab(
                label = "Đăng ký",
                icon = Icons.Rounded.PersonAdd,
                selected = tab == 1,
                modifier = Modifier.weight(1f),
                onClick = { tab = 1; error = null; linkError = null; generateError = null },
            )
            AuthTab(
                label = "Mã ghép",
                icon = Icons.Rounded.QrCode,
                selected = tab == 2,
                modifier = Modifier.weight(1f),
                onClick = { tab = 2; error = null; linkError = null; generateError = null },
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            when (tab) {
                0 -> {
                    AuthField(value = email, onValueChange = { email = it }, label = "Email", leadingIcon = Icons.Rounded.Email)
                    Spacer(Modifier.height(12.dp))
                    AuthField(value = password, onValueChange = { password = it }, label = "Mật khẩu", leadingIcon = Icons.Rounded.Lock, isPassword = true)
                    Spacer(Modifier.height(18.dp))
                    error?.let { message ->
                        ErrorBanner(message)
                        Spacer(Modifier.height(12.dp))
                    }
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
                    Spacer(Modifier.height(16.dp))
                    AuthField(value = name, onValueChange = { name = it }, label = "Họ tên", leadingIcon = Icons.Rounded.Person)
                    Spacer(Modifier.height(12.dp))
                    AuthField(value = email, onValueChange = { email = it }, label = "Email", leadingIcon = Icons.Rounded.Email)
                    Spacer(Modifier.height(12.dp))
                    AuthField(value = password, onValueChange = { password = it }, label = "Mật khẩu (tối thiểu 6 ký tự)", leadingIcon = Icons.Rounded.Lock, isPassword = true)
                    if (password.isNotEmpty() && password.length < 6) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Mật khẩu phải có ít nhất 6 ký tự",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Màu đại diện",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Muted,
                    )
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
                                    .border(2.dp, if (isSelected) KvOrange else Color.Transparent, CircleShape)
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
                    error?.let { message ->
                        ErrorBanner(message)
                        Spacer(Modifier.height(12.dp))
                    }
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
                        color = Muted,
                    )
                    Spacer(Modifier.height(18.dp))
                    Text("LIÊN KẾT MÃ", style = Eyebrow, color = Muted)
                    Spacer(Modifier.height(10.dp))
                    AuthField(value = pairInput, onValueChange = { pairInput = it }, label = "Mã ghép (VD: KV-849201)", leadingIcon = Icons.Rounded.QrCode)
                    Spacer(Modifier.height(12.dp))
                    linkError?.let { message ->
                        ErrorBanner(message)
                        Spacer(Modifier.height(12.dp))
                    }
                    AuthButton(
                        text = "Liên kết",
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
                                    onFailure = { linkError = it.message ?: "Mã ghép không hợp lệ" },
                                )
                            }
                        },
                    )
                    Spacer(Modifier.height(18.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Hair))
                    Spacer(Modifier.height(18.dp))
                    Text("TẠO MÃ", style = Eyebrow, color = Muted)
                    Spacer(Modifier.height(10.dp))
                    generateError?.let { message ->
                        ErrorBanner(message)
                        Spacer(Modifier.height(12.dp))
                    }
                    GenerateButton(
                        text = "Tạo mã",
                        loading = generating,
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
                                    onFailure = { generateError = it.message ?: "Không thể tạo mã ghép" },
                                )
                            }
                        },
                    )
                    generatedCode?.let { code ->
                        Spacer(Modifier.height(18.dp))
                        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "MÃ GHÉP CỦA BẠN",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Muted,
                                letterSpacing = 1.sp,
                            )
                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    code,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = KvOrange,
                                    letterSpacing = 4.sp,
                                    fontFamily = FontFamily.Monospace,
                                )
                                Spacer(Modifier.width(10.dp))
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .glass(KvShapePill)
                                        .clickable {
                                            clipboard.setText(AnnotatedString(code))
                                            Toaster.show("Đã sao chép")
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
private fun AuthTab(label: String, icon: ImageVector, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val tint = if (selected) KvOrange else Muted
    Row(
        modifier = modifier
            .clip(KvShapePill)
            .background(if (selected) AccentSoft else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 8.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(
            label,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = tint,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun AuthField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    leadingIcon: ImageVector,
    isPassword: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val focusRequester = remember { FocusRequester() }
    val interactionSource = remember { MutableInteractionSource() }
    var passwordVisible by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(46.dp)
            .glass(KvShapePill)
            .clickable(interactionSource = interactionSource, indication = null) { focusRequester.requestFocus() }
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(leadingIcon, contentDescription = null, tint = Muted, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(12.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .weight(1f)
                .focusRequester(focusRequester),
            textStyle = TextStyle(color = Fg, fontSize = 16.sp, fontWeight = FontWeight.Medium),
            cursorBrush = SolidColor(KvOrange),
            singleLine = true,
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            decorationBox = { innerTextField ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) {
                        Text(
                            label,
                            fontSize = 16.sp,
                            color = Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    innerTextField()
                }
            },
        )
        if (isPassword) {
            Spacer(Modifier.width(6.dp))
            IconButton(
                onClick = { passwordVisible = !passwordVisible },
                modifier = Modifier.size(32.dp),
            ) {
                Icon(
                    imageVector = if (passwordVisible) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                    contentDescription = if (passwordVisible) "Ẩn mật khẩu" else "Hiện mật khẩu",
                    tint = Fg2,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

@Composable
private fun AuthButton(text: String, loading: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "authButtonScale",
    )
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        interactionSource = interactionSource,
        shape = KvShapePill,
        colors = ButtonDefaults.buttonColors(
            containerColor = KvOrange,
            contentColor = Color.White,
            disabledContainerColor = Fg.copy(alpha = 0.08f),
            disabledContentColor = Faint,
        ),
        contentPadding = PaddingValues(horizontal = 16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale },
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun GenerateButton(text: String, loading: Boolean, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "generateButtonScale",
    )
    Button(
        onClick = onClick,
        enabled = !loading,
        interactionSource = interactionSource,
        shape = KvShapePill,
        border = BorderStroke(1.dp, GlassBorder),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = KvOrange,
            disabledContainerColor = Color.Transparent,
            disabledContentColor = Faint,
        ),
        contentPadding = PaddingValues(horizontal = 16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(46.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale },
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = KvOrange, strokeWidth = 2.dp)
        } else {
            Text(text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ErrorBanner(message: String, modifier: Modifier = Modifier) {
    val errorColor = MaterialTheme.colorScheme.error
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(errorColor.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
            .border(0.5.dp, errorColor.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.ErrorOutline, contentDescription = null, tint = errorColor, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(message, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = errorColor)
    }
}

private fun Color.hex(): String = "#%06x".format(this.value.toLong() and 0xFFFFFFL)
