package com.kvmusic.app.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PlaylistDao {
    @Insert
    suspend fun insert(playlist: PlaylistEntity): Long

    @Delete
    suspend fun delete(playlist: PlaylistEntity)

    @Query("SELECT * FROM playlists ORDER BY createdAt ASC")
    fun observeAll(): Flow<List<PlaylistEntity>>

    @Query("SELECT COUNT(*) FROM playlists")
    suspend fun count(): Int
}

@Dao
interface PlaylistTrackDao {
    @Insert
    suspend fun insert(track: PlaylistTrackEntity): Long

    @Query("DELETE FROM playlist_tracks WHERE id IN (SELECT id FROM playlist_tracks WHERE playlistId = :playlistId AND trackJson = :trackJson ORDER BY id DESC LIMIT 1)")
    suspend fun deleteByPlaylistAndTrackJson(playlistId: Long, trackJson: String)

    @Query("SELECT * FROM playlist_tracks WHERE playlistId = :playlistId ORDER BY position ASC")
    fun observeByPlaylist(playlistId: Long): Flow<List<PlaylistTrackEntity>>

    @Query("SELECT MAX(position) FROM playlist_tracks WHERE playlistId = :playlistId")
    suspend fun maxPosition(playlistId: Long): Int?

    @Query("SELECT COUNT(*) FROM playlist_tracks WHERE playlistId = :playlistId AND trackId = :trackId")
    suspend fun countByTrackId(playlistId: Long, trackId: String): Int

    @Query("DELETE FROM playlist_tracks WHERE playlistId = :playlistId AND trackId = :trackId")
    suspend fun deleteByTrackId(playlistId: Long, trackId: String)

    @Query("SELECT playlistId, COUNT(*) AS cnt FROM playlist_tracks GROUP BY playlistId")
    fun countsByPlaylist(): Flow<List<PlaylistCount>>
}

data class PlaylistCount(
    val playlistId: Long,
    val cnt: Int,
)

@Dao
interface LikedTrackDao {
    @Insert
    suspend fun insert(entity: LikedTrackEntity): Long

    @Query("DELETE FROM liked_tracks WHERE trackId = :trackId")
    suspend fun deleteByTrackId(trackId: String)

    @Query("SELECT * FROM liked_tracks ORDER BY likedAt DESC")
    fun observeAll(): Flow<List<LikedTrackEntity>>

    @Query("SELECT * FROM liked_tracks WHERE trackId = :trackId LIMIT 1")
    suspend fun findByTrackId(trackId: String): LikedTrackEntity?

    @Query("SELECT COUNT(*) FROM liked_tracks WHERE trackId = :trackId")
    suspend fun countByTrackId(trackId: String): Int
}

@Dao
interface FollowedArtistDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: FollowedArtistEntity)

    @Delete
    suspend fun delete(entity: FollowedArtistEntity)

    @Query("SELECT * FROM followed_artists ORDER BY id ASC")
    fun observeAll(): Flow<List<FollowedArtistEntity>>

    @Query("SELECT * FROM followed_artists WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): FollowedArtistEntity?
}

@Dao
interface SavedAlbumDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: SavedAlbumEntity)

    @Delete
    suspend fun delete(entity: SavedAlbumEntity)

    @Query("SELECT * FROM saved_albums ORDER BY id ASC")
    fun observeAll(): Flow<List<SavedAlbumEntity>>

    @Query("SELECT * FROM saved_albums WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): SavedAlbumEntity?
}

@Dao
interface HistoryDao {
    @Insert
    suspend fun insert(entity: HistoryEntity): Long

    @Query("DELETE FROM history")
    suspend fun deleteAll()

    @Query("SELECT * FROM history ORDER BY playedAt DESC")
    fun observeAll(): Flow<List<HistoryEntity>>

    @Query("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY playedAt DESC LIMIT :keep)")
    suspend fun deleteOlderThan(keep: Int)
}
