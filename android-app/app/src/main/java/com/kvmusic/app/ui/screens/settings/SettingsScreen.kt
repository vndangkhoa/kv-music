package com.kvmusic.app.ui.screens.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material.icons.filled.VpnLock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.api.InnerTubeMusicClient
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.data.update.AppUpdateInfo
import com.kvmusic.app.data.update.UpdateChecker
import com.kvmusic.app.ui.components.YtmIcons
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

private sealed interface UpdateUiState {
    data object Idle : UpdateUiState
    data object Checking : UpdateUiState
    data class UpToDate(val tag: String, val checkedAt: String) : UpdateUiState
    data class Available(val info: AppUpdateInfo, val checkedAt: String) : UpdateUiState
    data class Error(val message: String) : UpdateUiState
}

private fun nowStamp(): String =
    SimpleDateFormat("HH:mm, dd MMM", Locale.getDefault()).format(Date())

@Composable
fun SettingsScreen(
    authRepo: AuthRepository,
    modifier: Modifier = Modifier
) {
    var serverUrl by remember { mutableStateOf(RetrofitClient.getBaseUrl()) }
    var saveSuccess by remember { mutableStateOf(false) }

    var warpBypassEnabled by remember { mutableStateOf(RetrofitClient.isWarpBypassEnabled()) }
    var warpProxyInput by remember { mutableStateOf(RetrofitClient.getWarpProxyUrl()) }
    var warpProxySaved by remember { mutableStateOf(false) }
    var serverWarpStatus by remember { mutableStateOf<String?>(null) }
    var isCheckingWarp by remember { mutableStateOf(false) }

    var pairCodeInput by remember { mutableStateOf("") }
    var pairStatusMessage by remember { mutableStateOf<String?>(null) }

    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var nameInput by remember { mutableStateOf("") }
    var isRegisterMode by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }

    val currentUser by authRepo.currentUser.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    val installedVersion = remember {
        try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "?"
        } catch (_: Exception) {
            "?"
        }
    }
    var updateState by remember { mutableStateOf<UpdateUiState>(UpdateUiState.Idle) }
    var notesExpanded by remember { mutableStateOf(false) }

    fun checkForUpdates() {
        coroutineScope.launch {
            updateState = UpdateUiState.Checking
            notesExpanded = false
            val latest = UpdateChecker.fetchLatest()
            updateState = when {
                latest == null || latest.tag.isBlank() ->
                    UpdateUiState.Error("Couldn't reach the update server. Check your connection and try again.")
                UpdateChecker.isNewer(latest.tag, installedVersion) ->
                    UpdateUiState.Available(latest, nowStamp())
                else ->
                    UpdateUiState.UpToDate(latest.tag, nowStamp())
            }
        }
    }

    val ytmTextFieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = YtmWhite,
        unfocusedBorderColor = YtmWhite20,
        focusedContainerColor = YtmGrey13,
        unfocusedContainerColor = YtmGrey13,
        focusedTextColor = YtmWhite,
        unfocusedTextColor = YtmWhite,
        focusedLabelColor = YtmWhite,
        unfocusedLabelColor = YtmWhite67,
        cursorColor = YtmWhite
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(YtmPureBlack)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 14.dp)
    ) {
        Text(
            text = "Settings",
            style = TextStyle(
                fontFamily = YouTubeSansFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                letterSpacing = (-0.04).em,
                color = YtmWhite
            )
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "Account, server host & app updates",
            style = YtmSubtitle01
        )

        Spacer(modifier = Modifier.height(18.dp))

        // 1. Server URL Card
        YtmSettingsCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Dns,
                    contentDescription = "Server",
                    tint = YtmWhite,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "KV Music Server Host",
                    style = YtmTitle03
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Connect to your self-hosted Docker / NAS backend server",
                style = YtmSubtitle01
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it; saveSuccess = false },
                label = { Text("Server URL (e.g. http://192.168.1.50:8080)") },
                singleLine = true,
                colors = ytmTextFieldColors,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    RetrofitClient.setBaseUrl(serverUrl)
                    saveSuccess = true
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = YtmWhite,
                    contentColor = YtmPureBlack
                ),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.align(Alignment.End)
            ) {
                if (saveSuccess) {
                    Icon(
                        imageVector = YtmIcons.Check24,
                        contentDescription = "Saved",
                        tint = YtmPureBlack,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Saved & Connected", fontWeight = FontWeight.Medium)
                } else {
                    Text("Save & Connect", fontWeight = FontWeight.Medium)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 1B. YouTube IP Block Bypass (Cloudflare WARP + Direct InnerTube)
        YtmSettingsCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.VpnLock,
                    contentDescription = "YouTube IP Bypass",
                    tint = YtmWhite,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "YouTube IP Block Bypass",
                    style = YtmTitle03,
                    modifier = Modifier.weight(1f)
                )
                Surface(
                    color = if (warpBypassEnabled || warpProxyInput.isNotBlank()) Color(0x262BA640) else YtmGrey10,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = if (warpProxyInput.isNotBlank()) "WARP PROXY" else if (warpBypassEnabled) "BYPASS ON" else "SERVER ONLY",
                        color = if (warpBypassEnabled || warpProxyInput.isNotBlank()) YtmGreen01 else YtmWhite67,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Matches KV-Tube's WARP MASQUE & InnerTube IP-symmetry architecture so playback works even if the NAS IPv4 is blocked by YouTube",
                style = YtmSubtitle01
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                    Text(
                        text = "Direct InnerTube + Failover",
                        style = YtmTitle02
                    )
                    Text(
                        text = "Uses fast server WARP + local audio cache first, and auto-fails over to Direct InnerTube (or routes direct when a WARP proxy is set)",
                        style = YtmSubtitle01.copy(fontSize = 12.sp)
                    )
                }
                Switch(
                    checked = warpBypassEnabled,
                    onCheckedChange = { enabled ->
                        warpBypassEnabled = enabled
                        RetrofitClient.setWarpBypassEnabled(enabled)
                        InnerTubeMusicClient.clearCache()
                    },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = YtmPureBlack,
                        checkedTrackColor = YtmWhite,
                        uncheckedThumbColor = YtmWhite67,
                        uncheckedTrackColor = YtmGrey10
                    )
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = warpProxyInput,
                onValueChange = { warpProxyInput = it; warpProxySaved = false },
                label = { Text("Optional WARP / HTTP Proxy (e.g. http://192.168.1.50:29083)") },
                singleLine = true,
                colors = ytmTextFieldColors,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            )

            if (serverWarpStatus != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = serverWarpStatus!!,
                    color = if (serverWarpStatus!!.contains("WARP active")) YtmGreen01 else YtmWhite67,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = {
                        coroutineScope.launch {
                            isCheckingWarp = true
                            serverWarpStatus = withContext(Dispatchers.IO) {
                                try {
                                    val client = OkHttpClient.Builder()
                                        .connectTimeout(5, TimeUnit.SECONDS)
                                        .readTimeout(5, TimeUnit.SECONDS)
                                        .build()
                                    val req = Request.Builder()
                                        .url("${RetrofitClient.getBaseUrl()}/api/settings/cookies")
                                        .build()
                                    client.newCall(req).execute().use { resp ->
                                        if (!resp.isSuccessful) {
                                            return@withContext "Server check HTTP ${resp.code}"
                                        }
                                        val json = JSONObject(resp.body?.string().orEmpty())
                                        val warpOn = json.optBoolean("warp_active", false)
                                        val ipv6On = json.optBoolean("ipv6_routable", false)
                                        val cookiesOn = json.optBoolean("is_authenticated", false)
                                        when {
                                            warpOn -> "Server: WARP active (${json.optString("warp_proxy", "29083")})"
                                            ipv6On -> "Server: Native IPv6 routable"
                                            cookiesOn -> "Server: Authenticated cookies loaded (no WARP detected)"
                                            else -> "Server: No WARP/IPv6 reported — Android Direct InnerTube bypass handles playback"
                                        }
                                    }
                                } catch (e: Exception) {
                                    "Could not query server WARP status: ${e.message ?: "offline"}"
                                }
                            }
                            isCheckingWarp = false
                        }
                    },
                    enabled = !isCheckingWarp,
                    border = BorderStroke(1.dp, YtmWhite20),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = YtmWhite10,
                        contentColor = YtmWhite
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = if (isCheckingWarp) "Checking..." else "Check Server WARP",
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp
                    )
                }

                Button(
                    onClick = {
                        RetrofitClient.setWarpProxyUrl(warpProxyInput)
                        warpProxyInput = RetrofitClient.getWarpProxyUrl()
                        InnerTubeMusicClient.clearCache()
                        warpProxySaved = true
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = YtmWhite,
                        contentColor = YtmPureBlack
                    ),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text(
                        text = if (warpProxySaved) "Saved" else "Save Proxy",
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 2. Account Card
        YtmSettingsCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = YtmIcons.PersonAudio24,
                    contentDescription = "Account",
                    tint = YtmWhite,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Account",
                    style = YtmTitle03
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (currentUser != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(YtmRedAccent),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = currentUser?.name?.firstOrNull()?.uppercaseChar()?.toString() ?: "U",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = YtmPureWhite
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = currentUser?.name ?: "",
                            style = YtmTitle02
                        )
                        Text(
                            text = currentUser?.email ?: "",
                            style = YtmSubtitle01
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = { authRepo.logout() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = YtmRedAccent,
                        contentColor = YtmPureWhite
                    ),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Sign Out", fontWeight = FontWeight.Medium)
                }
            } else {
                if (isRegisterMode) {
                    OutlinedTextField(
                        value = nameInput,
                        onValueChange = { nameInput = it },
                        label = { Text("Display Name") },
                        singleLine = true,
                        colors = ytmTextFieldColors,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                OutlinedTextField(
                    value = emailInput,
                    onValueChange = { emailInput = it },
                    label = { Text("Email Address") },
                    singleLine = true,
                    colors = ytmTextFieldColors,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = passwordInput,
                    onValueChange = { passwordInput = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    colors = ytmTextFieldColors,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                if (authError != null) {
                    Text(text = authError!!, color = YtmLightRed, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                }

                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    TextButton(onClick = { isRegisterMode = !isRegisterMode }) {
                        Text(
                            text = if (isRegisterMode) "Already have an account? Sign In" else "Create Account",
                            color = YtmWhite
                        )
                    }

                    Button(
                        onClick = {
                            coroutineScope.launch {
                                authError = null
                                if (isRegisterMode) {
                                    val res = authRepo.register(nameInput, emailInput, passwordInput)
                                    if (res.isFailure) {
                                        authError = res.exceptionOrNull()?.message ?: "Registration failed"
                                    } else {
                                        passwordInput = ""
                                    }
                                } else {
                                    val res = authRepo.login(emailInput, passwordInput)
                                    if (res.isFailure) {
                                        authError = res.exceptionOrNull()?.message ?: "Login failed"
                                    } else {
                                        passwordInput = ""
                                    }
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = YtmWhite,
                            contentColor = YtmPureBlack
                        ),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Text(
                            text = if (isRegisterMode) "Register" else "Login",
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 3. Cross-Device Pairing Card
        YtmSettingsCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.QrCode,
                    contentDescription = "Pairing",
                    tint = YtmWhite,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Cross-Device Pairing",
                    style = YtmTitle03
                )
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Link your account across devices using a 6-digit pair code",
                style = YtmSubtitle01
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = pairCodeInput,
                    onValueChange = { pairCodeInput = it },
                    label = { Text("Enter 6-digit Pair Code") },
                    singleLine = true,
                    colors = ytmTextFieldColors,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f)
                )

                Button(
                    onClick = {
                        coroutineScope.launch {
                            val res = authRepo.linkPairCode(pairCodeInput)
                            pairStatusMessage = if (res.isSuccess) {
                                "Device paired successfully!"
                            } else {
                                res.exceptionOrNull()?.message ?: "Invalid pair code"
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = YtmWhite,
                        contentColor = YtmPureBlack
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.height(44.dp)
                ) {
                    Text("Link", fontWeight = FontWeight.Medium)
                }
            }

            if (pairStatusMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = pairStatusMessage!!,
                    color = if (pairStatusMessage!!.contains("successfully")) YtmGreen01 else YtmLightRed,
                    fontSize = 13.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // 4. App Updates Card
        YtmSettingsCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.SystemUpdate,
                    contentDescription = "App updates",
                    tint = YtmWhite,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "App Updates",
                    style = YtmTitle03,
                    modifier = Modifier.weight(1f)
                )
                Surface(
                    color = if (updateState is UpdateUiState.Available) YtmRedAccent else YtmGrey10,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = if (updateState is UpdateUiState.Available) "NEW" else "v$installedVersion",
                        color = if (updateState is UpdateUiState.Available) YtmPureWhite else YtmWhite67,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            val available = updateState as? UpdateUiState.Available
            val statusText = when (val s = updateState) {
                is UpdateUiState.Idle -> "Check whether a newer release is available"
                is UpdateUiState.Checking -> "Checking GitHub and Forgejo releases…"
                is UpdateUiState.UpToDate -> "You're up to date (${s.tag}) · checked ${s.checkedAt}"
                is UpdateUiState.Available -> "${s.info.name} is available · checked ${s.checkedAt}"
                is UpdateUiState.Error -> s.message
            }
            Text(
                text = statusText,
                style = YtmSubtitle01.copy(fontSize = 13.sp),
                color = if (updateState is UpdateUiState.Error) YtmLightRed else YtmWhite67
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { checkForUpdates() },
                    enabled = updateState !is UpdateUiState.Checking,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = YtmWhite,
                        contentColor = YtmPureBlack,
                        disabledContainerColor = YtmWhite20,
                        disabledContentColor = YtmWhite67
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    if (updateState is UpdateUiState.Checking) {
                        CircularProgressIndicator(
                            color = YtmPureBlack,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Checking…", fontWeight = FontWeight.Medium)
                    } else {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Check",
                            tint = YtmPureBlack,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Check for updates", fontWeight = FontWeight.Medium)
                    }
                }

                val pending = updateState as? UpdateUiState.Available
                if (pending != null) {
                    OutlinedButton(
                        onClick = {
                            val url = pending.info.apkUrl ?: pending.info.pageUrl
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        },
                        border = BorderStroke(1.dp, YtmWhite20),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = YtmWhite10,
                            contentColor = YtmWhite
                        ),
                        shape = RoundedCornerShape(24.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = YtmIcons.Download24,
                            contentDescription = "Download",
                            tint = YtmWhite,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Download", fontWeight = FontWeight.Medium)
                    }
                }
            }

            if (available != null && available.info.notes.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = { notesExpanded = !notesExpanded }) {
                    Text(
                        text = if (notesExpanded) "Hide what's new" else "See what's new",
                        color = YtmWhite,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                if (notesExpanded) {
                    Surface(
                        color = YtmGrey13,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, YtmWhite08),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = available.info.notes,
                            color = YtmWhite,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun YtmSettingsCard(
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, YtmWhite08, RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        color = YtmGrey12
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            content = content
        )
    }
}
