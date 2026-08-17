package com.kvmusic.app.ui.screens.player

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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvmusic.app.data.model.LyricLine
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.repository.MusicRepository
import com.kvmusic.app.player.PlayerManager
import com.kvmusic.app.ui.components.LyricsSheet
import com.kvmusic.app.ui.components.SoundCloudWaveform
import com.kvmusic.app.ui.theme.*
import java.util.Locale

@Composable
fun FullPlayerScreen(
    musicRepo: MusicRepository,
    onMinimize: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val track by PlayerManager.currentTrack.collectAsState()
    val isPlaying by PlayerManager.isPlaying.collectAsState()
    val positionMs by PlayerManager.currentPosition.collectAsState()
    val durationMs by PlayerManager.duration.collectAsState()
    val waveformBars by PlayerManager.waveformBars.collectAsState()
    val isShuffle by PlayerManager.isShuffle.collectAsState()
    val isRepeat by PlayerManager.isRepeat.collectAsState()
    val isLiked = track?.let { PlayerManager.isTrackLiked(it.id) } ?: false
    val downloadedIds by PlayerManager.downloadedTrackIds.collectAsState()
    val isDownloaded = track?.let { downloadedIds.contains(it.id) } ?: false

    var showLyricsSheet by remember { mutableStateOf(false) }
    var lyrics by remember { mutableStateOf<List<LyricLine>>(emptyList()) }

    LaunchedEffect(track?.id) {
        val current = track
        if (current != null) {
            val res = musicRepo.getLyrics(current.id, current.title, current.artist)
            if (res.isSuccess) {
                lyrics = res.getOrDefault(com.kvmusic.app.data.model.SyncedLyricsResponse()).lyrics
            }
        }
    }

    if (track == null) return

    val currentTrack = track!!
    val progressFraction = if (durationMs > 0) positionMs.toFloat() / durationMs else 0f

    fun formatTime(ms: Long): String {
        val totalSec = (ms / 1000).toInt()
        val min = totalSec / 60
        val sec = totalSec % 60
        return String.format(Locale.getDefault(), "%02d:%02d", min, sec)
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightBlack)
    ) {
        // Ambient Cover Backdrop
        AsyncImage(
            model = currentTrack.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.85f))
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.65f),
                            MidnightBlack.copy(alpha = 0.95f),
                            MidnightBlack
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.systemBars)
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. Top Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onMinimize) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Minimize",
                        tint = TextElectricWhite,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "PLAYING FROM PLAYLIST",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 9.sp,
                            letterSpacing = 1.2.sp
                        ),
                        color = TextLightGray
                    )
                    Text(
                        text = "SOUNDCLOUD PRO",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp,
                            letterSpacing = 1.5.sp
                        ),
                        color = SoundCloudNeonOrange
                    )
                }

                IconButton(onClick = { showLyricsSheet = true }) {
                    Icon(
                        imageVector = Icons.Default.Subtitles,
                        contentDescription = "Lyrics",
                        tint = if (lyrics.isNotEmpty()) SoundCloudNeonOrange else TextElectricWhite
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 2. Large Hero Artwork Card (Responsive size to fit all displays)
            Card(
                modifier = Modifier
                    .sizeIn(maxWidth = 260.dp, maxHeight = 260.dp)
                    .aspectRatio(1f)
                    .border(1.dp, GlassCardBorder, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                AsyncImage(
                    model = currentTrack.coverUrl,
                    contentDescription = currentTrack.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3. Track Title, Artist, Share & Like Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = currentTrack.title,
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp
                        ),
                        color = TextElectricWhite,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = currentTrack.artist,
                        style = MaterialTheme.typography.bodyLarge.copy(fontSize = 14.sp),
                        color = TextLightGray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { PlayerManager.toggleDownload(context, currentTrack) }) {
                        Icon(
                            imageVector = if (isDownloaded) Icons.Default.DownloadDone else Icons.Default.Download,
                            contentDescription = "Download Offline",
                            tint = if (isDownloaded) SoundCloudNeonOrange else TextElectricWhite,
                            modifier = Modifier.size(26.dp)
                        )
                    }

                    IconButton(onClick = {
                        val shareUrl = "https://sp.khoavo.myds.me/track/${currentTrack.id}"
                        val sendIntent = Intent(Intent.ACTION_SEND).apply {
                            putExtra(Intent.EXTRA_TEXT, "Listen to '${currentTrack.title}' by ${currentTrack.artist} on KV Music:\n$shareUrl")
                            type = "text/plain"
                        }
                        val shareIntent = Intent.createChooser(sendIntent, "Share Track")
                        context.startActivity(shareIntent)
                    }) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            tint = TextElectricWhite,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    IconButton(onClick = { PlayerManager.toggleLike(currentTrack.id) }) {
                        Icon(
                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (isLiked) SoundCloudNeonOrange else TextElectricWhite,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 4. SoundCloud Interactive Amplitude Waveform Scrubber
            SoundCloudWaveform(
                amplitudes = waveformBars,
                progressFraction = progressFraction,
                onSeekFraction = { fraction ->
                    val seekMs = (fraction * durationMs).toLong()
                    PlayerManager.seekTo(seekMs)
                },
                height = 64.dp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // 5. Time Position Markers
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = formatTime(positionMs),
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = SoundCloudNeonOrange
                )
                Text(
                    text = formatTime(durationMs),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextLightGray
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 6. SoundCloud Playback Controls Row (Fully visible & un-blocked by Android navigation bar!)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { PlayerManager.toggleShuffle() }) {
                    Icon(
                        imageVector = Icons.Default.Shuffle,
                        contentDescription = "Shuffle",
                        tint = if (isShuffle) SoundCloudNeonOrange else TextLightGray
                    )
                }

                IconButton(onClick = { PlayerManager.playPrevious() }) {
                    Icon(
                        imageVector = Icons.Default.SkipPrevious,
                        contentDescription = "Previous",
                        tint = TextElectricWhite,
                        modifier = Modifier.size(38.dp)
                    )
                }

                // SoundCloud Neon Orange Glowing Play Button
                Surface(
                    onClick = { PlayerManager.togglePlayPause() },
                    shape = CircleShape,
                    color = SoundCloudNeonOrange,
                    shadowElevation = 12.dp,
                    modifier = Modifier.size(68.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = "Play/Pause",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }

                IconButton(onClick = { PlayerManager.playNext() }) {
                    Icon(
                        imageVector = Icons.Default.SkipNext,
                        contentDescription = "Next",
                        tint = TextElectricWhite,
                        modifier = Modifier.size(38.dp)
                    )
                }

                IconButton(onClick = { PlayerManager.toggleRepeat() }) {
                    Icon(
                        imageVector = Icons.Default.Repeat,
                        contentDescription = "Repeat",
                        tint = if (isRepeat) SoundCloudNeonOrange else TextLightGray
                    )
                }
            }
        }

        // Synced Lyrics Modal Sheet
        if (showLyricsSheet) {
            LyricsSheet(
                lyrics = lyrics,
                currentPositionMs = positionMs,
                onDismiss = { showLyricsSheet = false }
            )
        }
    }
}
