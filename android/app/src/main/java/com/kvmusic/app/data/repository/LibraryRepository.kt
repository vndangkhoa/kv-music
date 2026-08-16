package com.kvmusic.app.data.repository

import androidx.room.withTransaction
import com.kvmusic.app.data.local.FollowedArtistEntity
import com.kvmusic.app.data.local.HistoryEntity
import com.kvmusic.app.data.local.LibraryDb
import com.kvmusic.app.data.local.LikedTrackEntity
import com.kvmusic.app.data.local.PlaylistEntity
import com.kvmusic.app.data.local.PlaylistTrackEntity
import com.kvmusic.app.data.local.SavedAlbumEntity
import com.kvmusic.app.data.local.ServerConfigStore
import com.kvmusic.app.data.model.Track
import com.kvmusic.app.data.remote.JsonProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString

class LibraryRepository(
    private val database: LibraryDb,
    private val serverConfigStore: ServerConfigStore,
) {

    val playlists: Flow<List<PlaylistEntity>> = database.playlistDao().observeAll()

    val likedTracks: Flow<List<Track>> =
        database.likedTrackDao().observeAll().map { rows -> rows.map { decodeTrack(it.trackJson) } }

    val followedArtists: Flow<List<FollowedArtistEntity>> = database.followedArtistDao().observeAll()

    val savedAlbums: Flow<List<SavedAlbumEntity>> = database.savedAlbumDao().observeAll()

    val history: Flow<List<Track>> =
        database.historyDao().observeAll().map { rows -> rows.map { decodeTrack(it.trackJson) } }

    suspend fun ensureSeeded() {
        if (serverConfigStore.getSeeded()) return
        if (database.playlistDao().count() == 0) {
            val now = System.currentTimeMillis()
            for (title in SEED_PLAYLISTS) {
                database.playlistDao().insert(PlaylistEntity(title = title, createdAt = now))
            }
        }
        serverConfigStore.setSeeded(true)
    }

    suspend fun createPlaylist(title: String): Long {
        val clean = title.trim().ifEmpty { "Playlist mới" }
        return database.playlistDao().insert(
            PlaylistEntity(title = clean, createdAt = System.currentTimeMillis()),
        )
    }

    suspend fun addToPlaylist(playlistId: Long, track: Track) {
        val nextPosition = (database.playlistTrackDao().maxPosition(playlistId) ?: -1) + 1
        database.playlistTrackDao().insert(
            PlaylistTrackEntity(
                playlistId = playlistId,
                position = nextPosition,
                trackJson = encodeTrack(track),
                trackId = track.id,
            ),
        )
    }

    suspend fun removeFromPlaylist(playlistId: Long, trackId: String) {
        database.playlistTrackDao().deleteByTrackId(playlistId, trackId)
    }

    fun playlistTracks(playlistId: Long): Flow<List<Track>> =
        database.playlistTrackDao().observeByPlaylist(playlistId)
            .map { rows -> rows.map { decodeTrack(it.trackJson) } }

    fun playlistCounts(): Flow<Map<Long, Int>> =
        database.playlistTrackDao().countsByPlaylist()
            .map { rows -> rows.associate { it.playlistId to it.cnt } }

    suspend fun isTrackInPlaylist(playlistId: Long, trackId: String): Boolean =
        database.playlistTrackDao().countByTrackId(playlistId, trackId) > 0

    suspend fun toggleLiked(track: Track) {
        database.withTransaction {
            val count = database.likedTrackDao().countByTrackId(track.id)
            if (count > 0) {
                database.likedTrackDao().deleteByTrackId(track.id)
            } else {
                database.likedTrackDao().insert(
                    LikedTrackEntity(
                        trackId = track.id,
                        trackJson = encodeTrack(track),
                        likedAt = System.currentTimeMillis(),
                    ),
                )
            }
        }
    }

    suspend fun isLiked(trackId: String): Boolean =
        database.likedTrackDao().findByTrackId(trackId) != null

    suspend fun toggleSavedAlbum(id: String, title: String, artist: String, coverUrl: String) {
        val existing = database.savedAlbumDao().findById(id)
        if (existing != null) {
            database.savedAlbumDao().delete(existing)
        } else {
            database.savedAlbumDao().insert(
                SavedAlbumEntity(id = id, title = title, artist = artist, coverUrl = coverUrl),
            )
        }
    }

    suspend fun toggleFollowArtist(id: String, name: String, photo: String) {
        val existing = database.followedArtistDao().findById(id)
        if (existing != null) {
            database.followedArtistDao().delete(existing)
        } else {
            database.followedArtistDao().insert(
                FollowedArtistEntity(id = id, name = name, photo = photo),
            )
        }
    }

    suspend fun clearHistory() {
        database.historyDao().deleteAll()
    }

    suspend fun recordPlayed(track: Track) {
        database.historyDao().insert(
            HistoryEntity(trackJson = encodeTrack(track), playedAt = System.currentTimeMillis()),
        )
        database.historyDao().deleteOlderThan(MAX_HISTORY)
    }

    private fun encodeTrack(track: Track): String = JsonProvider.json.encodeToString(track)

    private fun decodeTrack(json: String): Track =
        runCatching { JsonProvider.json.decodeFromString<Track>(json) }.getOrElse { Track() }

    private companion object {
        val SEED_PLAYLISTS = listOf("Nhạc Việt Hay Nhất", "US Top Hits", "Lo-fi Focus", "Workout Energy")
        const val MAX_HISTORY = 200
    }
}
