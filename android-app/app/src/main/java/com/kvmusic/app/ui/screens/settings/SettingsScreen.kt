package com.kvmusic.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.launch

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

        Spacer(modifier = Modifier.height(100.dp))
    }
}
