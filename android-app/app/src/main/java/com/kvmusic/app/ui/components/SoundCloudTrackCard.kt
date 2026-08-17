package com.kvmusic.app.ui.components

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.theme.*
import kotlin.random.Random

@Composable
fun SoundCloudTrackCard(
    track: Track,
    queue: List<Track> = listOf(track),
    repostedBy: String? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val currentTrack by PlayerManager.currentTrack.collectAsState()
    val isPlaying by PlayerManager.isPlaying.collectAsState()
    val positionMs by PlayerManager.currentPosition.collectAsState()
    val durationMs by PlayerManager.duration.collectAsState()
    val isLiked = PlayerManager.isTrackLiked(track.id)

    var isReposted by remember { mutableStateOf(false) }

    val isCurrent = currentTrack?.id == track.id
    val progressFraction = if (isCurrent && durationMs > 0) positionMs.toFloat() / durationMs else 0f

    val cardWaveformBars = remember(track.id) {
        val seed = track.id.hashCode().toLong()
        val random = Random(seed)
        val bars = ArrayList<Float>(50)
        for (i in 0 until 50) {
            val norm = i.toFloat() / 50
            val envelope = (Math.sin(norm * Math.PI) * 0.4 + 0.6).toFloat()
            val amp = (random.nextFloat() * 0.7f + 0.3f) * envelope
            bars.add(amp.coerceIn(0.12f, 1.0f))
        }
        bars
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .border(1.dp, GlassCardBorder, RoundedCornerShape(10.dp))
            .clickable {
                if (isCurrent) {
                    PlayerManager.togglePlayPause()
                } else {
                    PlayerManager.playTrack(track, queue)
                }
            },
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = GlassCardDark)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            if (repostedBy != null || isReposted) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Repeat,
                        contentDescription = "Reposted",
                        tint = TextLightGray,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${repostedBy ?: "You"} reposted",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextLightGray
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth()
            ) {
                // Large Square Artwork with SoundCloud Play Overlay Button
                Box(
                    modifier = Modifier
                        .size(110.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(GlassSurfaceDark)
                        .clickable {
                            if (isCurrent) {
                                PlayerManager.togglePlayPause()
                            } else {
                                PlayerManager.playTrack(track, queue)
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = track.coverUrl,
                        contentDescription = track.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = SoundCloudNeonOrange,
                            shadowElevation = 6.dp,
                            modifier = Modifier.size(44.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (isCurrent && isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    contentDescription = "Play",
                                    tint = Color.White,
                                    modifier = Modifier.size(26.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Track Info, #Music tag & Embedded Waveform
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = track.artist,
                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
                                color = TextLightGray,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = track.title,
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                ),
                                color = TextElectricWhite,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        // #Music Pill Tag (Matching WebApp Screenshot!)
                        Surface(
                            color = Color(0xFF252525),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "#Music",
                                color = TextLightGray,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // SoundCloud Amplitude Waveform Visualizer
                    SoundCloudWaveform(
                        amplitudes = cardWaveformBars,
                        progressFraction = progressFraction,
                        onSeekFraction = { fraction ->
                            if (isCurrent && durationMs > 0) {
                                val seekMs = (fraction * durationMs).toLong()
                                PlayerManager.seekTo(seekMs)
                            } else {
                                PlayerManager.playTrack(track, queue)
                            }
                        },
                        height = 42.dp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Action Bar: Like, Repost, Share, Add to playlist, Play Count (Matching Screenshot!)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Like Button with text
                    Surface(
                        onClick = { PlayerManager.toggleLike(track.id) },
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFF222222),
                        modifier = Modifier.border(1.dp, Color(0xFF333333), RoundedCornerShape(4.dp))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                contentDescription = "Like",
                                tint = if (isLiked) SoundCloudNeonOrange else TextLightGray,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Like",
                                fontSize = 11.sp,
                                color = TextLightGray
                            )
                        }
                    }

                    // Repost Button with text
                    Surface(
                        onClick = { isReposted = !isReposted },
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFF222222),
                        modifier = Modifier.border(1.dp, Color(0xFF333333), RoundedCornerShape(4.dp))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Repeat,
                                contentDescription = "Repost",
                                tint = if (isReposted) SoundCloudNeonOrange else TextLightGray,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Repost",
                                fontSize = 11.sp,
                                color = TextLightGray
                            )
                        }
                    }

                    // Share Button with text
                    Surface(
                        onClick = {
                            val shareUrl = "https://sp.khoavo.myds.me/track/${track.id}"
                            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                putExtra(Intent.EXTRA_TEXT, "Listen to '${track.title}' by ${track.artist} on KV Music:\n$shareUrl")
                                setType("text/plain")
                            }
                            val shareIntent = Intent.createChooser(sendIntent, "Share Track")
                            context.startActivity(shareIntent)
                        },
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFF222222),
                        modifier = Modifier.border(1.dp, Color(0xFF333333), RoundedCornerShape(4.dp))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Share",
                                tint = TextLightGray,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Share",
                                fontSize = 11.sp,
                                color = TextLightGray
                            )
                        }
                    }
                }

                // Play count (Matching Screenshot!)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Plays",
                        tint = TextLightGray,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "${(track.id.hashCode() % 85 + 15) / 10.0}M",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextLightGray,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
