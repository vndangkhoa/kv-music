package com.kvmusic.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Database(
    entities = [
        PlaylistEntity::class,
        PlaylistTrackEntity::class,
        LikedTrackEntity::class,
        FollowedArtistEntity::class,
        SavedAlbumEntity::class,
        HistoryEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class LibraryDb : RoomDatabase() {

    abstract fun playlistDao(): PlaylistDao
    abstract fun playlistTrackDao(): PlaylistTrackDao
    abstract fun likedTrackDao(): LikedTrackDao
    abstract fun followedArtistDao(): FollowedArtistDao
    abstract fun savedAlbumDao(): SavedAlbumDao
    abstract fun historyDao(): HistoryDao

    suspend fun clearAll() {
        withContext(Dispatchers.IO) { clearAllTables() }
    }

    companion object {
        @Volatile
        private var INSTANCE: LibraryDb? = null

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE playlist_tracks ADD COLUMN trackId TEXT NOT NULL DEFAULT ''")
                db.execSQL("DELETE FROM liked_tracks WHERE id NOT IN (SELECT MIN(id) FROM liked_tracks GROUP BY trackId)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_liked_tracks_trackId ON liked_tracks(trackId)")
            }
        }

        fun getInstance(context: Context): LibraryDb =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    LibraryDb::class.java,
                    "library.db",
                ).addMigrations(MIGRATION_1_2).build().also { INSTANCE = it }
            }
    }
}
