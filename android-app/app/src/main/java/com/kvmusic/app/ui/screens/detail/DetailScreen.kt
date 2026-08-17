package com.kvmusic.app.ui.screens.detail

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.TrackListItem
import com.kvmusic.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun DetailScreen(
    id: String,
    title: String,
    coverUrl: String,
    subtitle: String,
    type: String, // "album", "playlist", "artist"
    musicRepo: MusicRepository,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var tracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(id, queryKey(id, type)) {
        isLoading = true
        val res = musicRepo.search(title.ifEmpty { id })
        if (res.isSuccess) {
            tracks = res.getOrDefault(emptyList())
        }
        isLoading = false
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightBlack)
    ) {
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = SoundCloudNeonOrange)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 120.dp)
            ) {
                // Hero Header
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp)
                    ) {
                        AsyncImage(
                            model = coverUrl,
                            contentDescription = title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )

                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.Black.copy(alpha = 0.5f),
                                            MidnightBlack.copy(alpha = 0.85f),
                                            MidnightBlack
                                        )
                                    )
                                )
                        )

                        // Top Navigation Back Bar
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 16.dp, start = 12.dp, end = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = onBack) {
                                Icon(
                                    imageVector = Icons.Default.ArrowBack,
                                    contentDescription = "Back",
                                    tint = TextElectricWhite
                                )
                            }

                            Surface(
                                color = SoundCloudNeonOrange,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = type.uppercase(),
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        // Hero Meta Info & Play All Button
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(20.dp)
                        ) {
                            Text(
                                text = title,
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Black,
                                    fontSize = 24.sp
                                ),
                                color = TextElectricWhite,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = subtitle.ifEmpty { "${tracks.size} songs" },
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextLightGray
                            )
                            Spacer(modifier = Modifier.height(14.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Button(
                                     onClick = {
                                         val track = tracks.firstOrNull()
                                         if (track != null) {
                                             PlayerManager.playTrack(track, tracks)
                                         }
                                     },
                                    colors = ButtonDefaults.buttonColors(containerColor = SoundCloudNeonOrange),
                                    shape = RoundedCornerShape(24.dp),
                                    modifier = Modifier.height(44.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = "Play All",
                                        tint = Color.White
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "PLAY ALL",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                IconButton(onClick = {
                                    val shareUrl = "https://sp.khoavo.myds.me/track/${id}"
                                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                        putExtra(Intent.EXTRA_TEXT, "Check out '$title' on KV Music:\n$shareUrl")
                                        setType("text/plain")
                                    }
                                    val shareIntent = Intent.createChooser(sendIntent, "Share $type")
                                    context.startActivity(shareIntent)
                                }) {
                                    Icon(
                                        imageVector = Icons.Default.Share,
                                        contentDescription = "Share",
                                        tint = TextElectricWhite
                                    )
                                }
                            }
                        }
                    }
                }

                // Tracklist Section Header
                item {
                    PaddingValues(horizontal = 20.dp, vertical = 12.dp)
                    Text(
                        text = "Tracks (${tracks.size})",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp
                        ),
                        color = TextElectricWhite,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                    )
                }

                itemsIndexed(tracks) { index, track ->
                    TrackListItem(
                        track = track,
                        rankNumber = index + 1,
                        onTrackClick = { PlayerManager.playTrack(track, tracks) },
                        isLiked = PlayerManager.isTrackLiked(track.id),
                        onLikeClick = { PlayerManager.toggleLike(track.id) }
                    )
                }
            }
        }
    }
}

private fun queryKey(id: String, type: String): String = "$type-$id"
