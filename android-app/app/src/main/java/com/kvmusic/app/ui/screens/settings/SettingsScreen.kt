package com.kvmusic.app.ui.screens.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.data.update.AppUpdateInfo
import com.kvmusic.app.data.update.UpdateChecker
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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

    // 4. App update state (Settings → Check for updates, notes from changelog)
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightBlack)
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text(
            text = "App & Server Settings",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Black,
                fontSize = 22.sp
            ),
            color = TextElectricWhite
        )

        Spacer(modifier = Modifier.height(20.dp))

        // 1. Server URL Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = GlassCardDark)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Dns,
                        contentDescription = "Server",
                        tint = SoundCloudNeonOrange
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "KV Music Server Host",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextElectricWhite
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Connect to your self-hosted Docker / NAS backend server",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextLightGray
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it; saveSuccess = false },
                    label = { Text("Server URL (e.g. http://192.168.1.50:8080)") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SoundCloudNeonOrange,
                        unfocusedBorderColor = GlassCardBorder,
                        focusedTextColor = TextElectricWhite,
                        unfocusedTextColor = TextElectricWhite
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        RetrofitClient.setBaseUrl(serverUrl)
                        saveSuccess = true
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SoundCloudNeonOrange),
                    modifier = Modifier.align(Alignment.End)
                ) {
                    if (saveSuccess) {
                        Icon(Icons.Default.Check, contentDescription = "Saved", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Saved & Connected")
                    } else {
                        Text("Save & Connect")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 2. Account Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = GlassCardDark)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Account",
                        tint = SoundCloudNeonOrange
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Account",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextElectricWhite
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (currentUser != null) {
                    Text(
                        text = "Logged in as ${currentUser?.name} (${currentUser?.email})",
                        color = TextElectricWhite,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { authRepo.logout() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.8f))
                    ) {
                        Text("Sign Out")
                    }
                } else {
                    if (isRegisterMode) {
                        OutlinedTextField(
                            value = nameInput,
                            onValueChange = { nameInput = it },
                            label = { Text("Display Name") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    OutlinedTextField(
                        value = emailInput,
                        onValueChange = { emailInput = it },
                        label = { Text("Email Address") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = passwordInput,
                        onValueChange = { passwordInput = it },
                        label = { Text("Password") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (authError != null) {
                        Text(text = authError!!, color = Color.Red, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        TextButton(onClick = { isRegisterMode = !isRegisterMode }) {
                            Text(
                                if (isRegisterMode) "Already have an account? Sign In" else "Create Account",
                                color = SoundCloudNeonOrange
                            )
                        }

                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    authError = null
                                    if (isRegisterMode) {
                                        val res = authRepo.register(nameInput, emailInput, passwordInput)
                                        if (res.isFailure) authError = "Registration failed"
                                    } else {
                                        val res = authRepo.login(emailInput, passwordInput)
                                        if (res.isFailure) authError = "Login failed"
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = SoundCloudNeonOrange)
                        ) {
                            Text(if (isRegisterMode) "Register" else "Login")
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 3. Pairing Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = GlassCardDark)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.QrCode,
                        contentDescription = "Pairing",
                        tint = SoundCloudNeonOrange
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Cross-Device Pairing",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextElectricWhite
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Link your account across devices using a 6-digit pair code",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextLightGray
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = pairCodeInput,
                        onValueChange = { pairCodeInput = it },
                        label = { Text("Enter 6-digit Pair Code") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )

                    Button(
                        onClick = {
                            coroutineScope.launch {
                                val res = authRepo.linkPairCode(pairCodeInput)
                                pairStatusMessage = if (res.isSuccess) "Device paired successfully!" else "Invalid pair code"
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SoundCloudNeonOrange)
                    ) {
                        Text("Link")
                    }
                }

                if (pairStatusMessage != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = pairStatusMessage!!, color = SoundCloudNeonOrange, fontSize = 13.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 4. App Updates Card (check GitHub → Forgejo releases, notes = changelog)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, GlassCardBorder, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = GlassCardDark)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.SystemUpdate,
                        contentDescription = "App updates",
                        tint = SoundCloudNeonOrange
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "App Updates",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TextElectricWhite,
                        modifier = Modifier.weight(1f)
                    )
                    Surface(
                        color = Color(0xFF252525),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "v$installedVersion",
                            color = TextLightGray,
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
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
                    color = if (updateState is UpdateUiState.Error) Color.Red.copy(alpha = 0.9f) else TextLightGray
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { checkForUpdates() },
                        enabled = updateState !is UpdateUiState.Checking,
                        colors = ButtonDefaults.buttonColors(containerColor = SoundCloudNeonOrange),
                        modifier = Modifier.weight(1f)
                    ) {
                        if (updateState is UpdateUiState.Checking) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Checking…")
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Check",
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Check for updates")
                        }
                    }

                    val pending = updateState as? UpdateUiState.Available
                    if (pending != null) {
                        Button(
                            onClick = {
                                val url = pending.info.apkUrl ?: pending.info.pageUrl
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2ECC71)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Download,
                                contentDescription = "Download",
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Download")
                        }
                    }
                }

                if (available != null && available.info.notes.isNotBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = { notesExpanded = !notesExpanded }) {
                        Text(
                            text = if (notesExpanded) "Hide what's new" else "See what's new",
                            color = SoundCloudNeonOrange,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    if (notesExpanded) {
                        Surface(
                            color = Color.Black.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = available.info.notes,
                                color = TextElectricWhite,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(100.dp))
    }
}
