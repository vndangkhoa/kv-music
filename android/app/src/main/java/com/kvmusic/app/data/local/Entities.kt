package com.kvmusic.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val createdAt: Long,
)

@Entity(tableName = "playlist_tracks")
data class PlaylistTrackEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val playlistId: Long,
    val position: Int,
    val trackJson: String,
    @ColumnInfo(defaultValue = "") val trackId: String = "",
)

@Entity(tableName = "liked_tracks", indices = [Index(value = ["trackId"], unique = true)])
data class LikedTrackEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val trackId: String,
    val trackJson: String,
    val likedAt: Long,
)

@Entity(tableName = "followed_artists")
data class FollowedArtistEntity(
    @PrimaryKey val id: String,
    val name: String,
    val photo: String,
)

@Entity(tableName = "saved_albums")
data class SavedAlbumEntity(
    @PrimaryKey val id: String,
    val title: String,
    val artist: String,
    val coverUrl: String,
)

@Entity(tableName = "history")
data class HistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val trackJson: String,
    val playedAt: Long,
)
