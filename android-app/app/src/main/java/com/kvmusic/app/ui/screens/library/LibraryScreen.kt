package com.kvmusic.app.ui.screens.library

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvmusic.app.data.repository.AuthRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.SoundCloudTrackCard
import com.kvmusic.app.ui.theme.*

@Composable
fun LibraryScreen(
    authRepo: AuthRepository,
    modifier: Modifier = Modifier
) {
    val currentUser by authRepo.currentUser.collectAsState()
    val likedIds by PlayerManager.likedTrackIds.collectAsState()
    val historyTracks by PlayerManager.recentlyPlayedHistory.collectAsState()
    val downloadedIds by PlayerManager.downloadedTrackIds.collectAsState()

    val downloadedTracks = remember(historyTracks, downloadedIds) {
        historyTracks.filter { downloadedIds.contains(it.id) }
    }

    var activeTab by remember { mutableStateOf("all") } // "all", "history", "liked", "downloads"

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightBlack)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 120.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Your SoundCloud Library",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Black,
                        fontSize = 22.sp
                    ),
                    color = TextElectricWhite,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Profile Card (Guest Mode supported)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .border(1.dp, GlassCardBorder, RoundedCornerShape(16.dp)),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = GlassCardDark)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(CircleShape)
                                .background(SoundCloudNeonOrange),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "User",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = currentUser?.name ?: "Guest Listener",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                ),
                                color = TextElectricWhite
                            )
                            Text(
                                text = if (currentUser != null) currentUser!!.email else "Local Library • Offline Downloads Enabled",
                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 11.sp),
                                color = TextLightGray
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Quick Filter Tiles (History, Liked, Downloads)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    LibraryTile(
                        title = "History",
                        subtitle = "${historyTracks.size} played",
                        icon = Icons.Default.History,
                        iconTint = Color(0xFF00A8FF),
                        isSelected = activeTab == "history",
                        onClick = { activeTab = if (activeTab == "history") "all" else "history" },
                        modifier = Modifier.weight(1f)
                    )
                    LibraryTile(
                        title = "Downloads",
                        subtitle = "${downloadedIds.size} saved",
                        icon = Icons.Default.DownloadDone,
                        iconTint = Color(0xFF2ECC71),
                        isSelected = activeTab == "downloads",
                        onClick = { activeTab = if (activeTab == "downloads") "all" else "downloads" },
                        modifier = Modifier.weight(1f)
                    )
                    LibraryTile(
                        title = "Liked",
                        subtitle = "${likedIds.size} tracks",
                        icon = Icons.Default.Favorite,
                        iconTint = SoundCloudNeonOrange,
                        isSelected = activeTab == "liked",
                        onClick = { activeTab = if (activeTab == "liked") "all" else "liked" },
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))
            }

            // 1. Offline Downloads Section
            if (activeTab == "all" || activeTab == "downloads") {
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.DownloadDone,
                            contentDescription = "Downloads",
                            tint = Color(0xFF2ECC71),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "APP DOWNLOADS & OFFLINE MUSIC (${downloadedIds.size})",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                letterSpacing = 1.sp
                            ),
                            color = TextElectricWhite
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                }

                if (downloadedTracks.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No downloaded tracks yet. Tap the Download icon in Main Player to save music into the app!",
                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
                                color = TextLightGray
                            )
                        }
                    }
                } else {
                    items(downloadedTracks) { track ->
                        SoundCloudTrackCard(
                            track = track,
                            queue = downloadedTracks
                        )
                    }
                }
            }

            // 2. Recently Played History Stream
            if (activeTab == "all" || activeTab == "history") {
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = "Recently Played",
                            tint = Color(0xFF00A8FF),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "RECENTLY PLAYED HISTORY (${historyTracks.size})",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                letterSpacing = 1.sp
                            ),
                            color = TextElectricWhite
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                }

                if (historyTracks.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No history yet. Tap any song on Home or Search to start playing!",
                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
                                color = TextLightGray
                            )
                        }
                    }
                } else {
                    items(historyTracks) { track ->
                        SoundCloudTrackCard(
                            track = track,
                            queue = historyTracks
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LibraryTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconTint: Color,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .border(
                width = 1.dp,
                color = if (isSelected) iconTint else GlassCardBorder,
                shape = RoundedCornerShape(14.dp)
            )
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = if (isSelected) GlassSurfaceDark else GlassCardDark)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = iconTint,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                ),
                color = TextElectricWhite
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 10.sp),
                color = TextLightGray
            )
        }
    }
}
