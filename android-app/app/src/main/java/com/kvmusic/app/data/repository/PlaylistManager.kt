package com.kvmusic.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.Track
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class UserPlaylist(
    val id: String,
    val name: String,
    val description: String = "",
    val coverUrl: String = "",
    val tracks: List<Track> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = createdAt
)

object PlaylistManager {

    private const val TAG = "PlaylistManager"
    private const val PREFS_NAME = "kv_music_playlists"
    private const val PREFS_KEY = "saved_playlists_json"
    private const val KEY_LAST_SYNCED_USER_ID = "last_synced_user_id"
    private const val KEY_PENDING_DELETED_IDS = "pending_deleted_ids"
    private const val KEY_HAS_PENDING_CHANGES = "has_pending_changes"

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var prefs: SharedPreferences? = null
    private var authRepository: AuthRepository? = null

    private val _playlists = MutableStateFlow<List<UserPlaylist>>(emptyList())
    val playlists: StateFlow<List<UserPlaylist>> = _playlists

    @Synchronized
    fun init(context: Context, authRepo: AuthRepository? = null) {
        if (authRepo != null) {
            authRepository = authRepo
        }
        if (prefs == null) {
            prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            _playlists.value = loadFromPrefs()
        }
    }

    @Synchronized
    fun attachAuth(authRepo: AuthRepository) {
        authRepository = authRepo
    }

    @Synchronized
    fun clearForLogout() {
        _playlists.value = emptyList()
        prefs?.edit()
            ?.remove(PREFS_KEY)
            ?.remove(KEY_LAST_SYNCED_USER_ID)
            ?.remove(KEY_PENDING_DELETED_IDS)
            ?.remove(KEY_HAS_PENDING_CHANGES)
            ?.apply()
    }

    private fun isLegacySystemPlaylistId(id: String): Boolean = id.startsWith("playlist-system-")

    private fun isDemoTrack(id: String, title: String): Boolean {
        return id.matches(Regex("^fb-\\d+$")) || title.trim().endsWith("(Demo)", ignoreCase = true)
    }

    private fun loadLastSyncedUserId(): String? {
        return prefs?.getString(KEY_LAST_SYNCED_USER_ID, null)?.takeIf { it.isNotBlank() }
    }

    private fun saveLastSyncedUserId(userId: String?) {
        val editor = prefs?.edit() ?: return
        if (userId.isNullOrBlank()) {
            editor.remove(KEY_LAST_SYNCED_USER_ID)
        } else {
            editor.putString(KEY_LAST_SYNCED_USER_ID, userId)
        }
        editor.apply()
    }

    private fun loadPendingDeletedIds(): List<String> {
        val raw = prefs?.getString(KEY_PENDING_DELETED_IDS, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val v = arr.optString(i).trim()
                    if (v.isNotEmpty() && !contains(v)) add(v)
                }
            }
        }.getOrElse { emptyList() }
    }

    private fun savePendingDeletedIds(ids: List<String>) {
        val arr = JSONArray()
        ids.distinct().forEach { if (it.isNotBlank()) arr.put(it) }
        prefs?.edit()?.putString(KEY_PENDING_DELETED_IDS, arr.toString())?.apply()
    }

    private fun hasPendingChanges(): Boolean {
        return prefs?.getBoolean(KEY_HAS_PENDING_CHANGES, false) ?: false
    }

    private fun setHasPendingChanges(value: Boolean) {
        prefs?.edit()?.putBoolean(KEY_HAS_PENDING_CHANGES, value)?.apply()
    }

    private fun loadFromPrefs(): List<UserPlaylist> {
        val raw = prefs?.getString(PREFS_KEY, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            parsePlaylistJsonArray(arr)
        }.getOrElse { emptyList() }
    }

    private fun saveToPrefs(list: List<UserPlaylist>) {
        val arr = JSONArray()
        list.forEach { pl ->
            arr.put(playlistToJson(pl, snakeCaseForServer = false))
        }
        prefs?.edit()?.putString(PREFS_KEY, arr.toString())?.apply()
    }

    private fun playlistToJson(pl: UserPlaylist, snakeCaseForServer: Boolean): JSONObject {
        val tArr = JSONArray()
        pl.tracks.forEach { tr ->
            tArr.put(
                JSONObject().apply {
                    put("id", tr.id)
                    put("title", tr.title)
                    put("artist", tr.artist)
                    put("album", tr.album)
                    put("duration", tr.duration)
                    put("cover_url", tr.coverUrl)
                    put("url", tr.url)
                }
            )
        }
        return JSONObject().apply {
            put("id", pl.id)
            if (snakeCaseForServer) {
                put("title", pl.name)
                if (pl.description.isNotBlank()) put("description", pl.description)
                put("cover_url", pl.coverUrl)
                put("created_at", pl.createdAt)
                put("updated_at", pl.updatedAt)
            } else {
                put("name", pl.name)
                put("description", pl.description)
                put("cover_url", pl.coverUrl)
                put("created_at", pl.createdAt)
                put("updated_at", pl.updatedAt)
            }
            put("tracks", tArr)
        }
    }

    private fun parsePlaylistJsonArray(arr: JSONArray): List<UserPlaylist> {
        return buildList {
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val id = obj.optString("id").trim()
                val name = obj.optString("name").ifBlank { obj.optString("title") }.trim()
                if (id.isEmpty() || name.isEmpty() || isLegacySystemPlaylistId(id)) continue
                val tracksArr = obj.optJSONArray("tracks") ?: JSONArray()
                val tracks = buildList {
                    for (j in 0 until tracksArr.length()) {
                        val t = tracksArr.optJSONObject(j) ?: continue
                        val tid = t.optString("id").trim()
                        val title = t.optString("title")
                        if (tid.isEmpty() || isDemoTrack(tid, title)) continue
                        add(
                            Track(
                                id = tid,
                                title = title,
                                artist = t.optString("artist"),
                                album = t.optString("album"),
                                duration = t.optInt("duration", 0),
                                coverUrl = t.optString("cover_url").ifBlank { t.optString("coverUrl") },
                                url = t.optString("url")
                            )
                        )
                    }
                }
                val now = System.currentTimeMillis()
                val createdAt = obj.optLong("created_at", obj.optLong("createdAt", now)).let {
                    if (it > 0L) it else now
                }
                val updatedAt = obj.optLong("updated_at", obj.optLong("updatedAt", createdAt)).let {
                    if (it > 0L) it else createdAt
                }
                add(
                    UserPlaylist(
                        id = id,
                        name = name,
                        description = obj.optString("description").takeIf { it != "null" }.orEmpty(),
                        coverUrl = obj.optString("cover_url").ifBlank { obj.optString("coverUrl") }
                            .takeIf { it != "null" }
                            ?: tracks.firstOrNull()?.coverUrl.orEmpty(),
                        tracks = tracks,
                        createdAt = createdAt,
                        updatedAt = updatedAt
                    )
                )
            }
        }.sortedByDescending { it.createdAt }
    }

    @Synchronized
    private fun commit(list: List<UserPlaylist>, pushToServer: Boolean = true) {
        val normalized = list.sortedByDescending { it.createdAt }
        _playlists.value = normalized
        saveToPrefs(normalized)
        if (pushToServer) {
            val token = authRepository?.getSavedToken()
            if (!token.isNullOrBlank()) {
                scope.launch { pushPlaylistsInternal(token, normalized) }
            }
        }
    }

    fun getPlaylist(id: String): UserPlaylist? = _playlists.value.firstOrNull { it.id == id }

    fun isTrackInAnyPlaylist(trackId: String): Boolean {
        return _playlists.value.any { pl -> pl.tracks.any { it.id == trackId } }
    }

    @Synchronized
    fun createPlaylist(
        name: String,
        description: String = "",
        initialTrack: Track? = null
    ): UserPlaylist {
        val trimmed = name.trim().ifEmpty { "My Playlist" }
        val now = System.currentTimeMillis()
        val initialTracks = initialTrack?.let { listOf(it) } ?: emptyList()
        val created = UserPlaylist(
            id = "user-pl-${UUID.randomUUID()}",
            name = trimmed,
            description = description.trim(),
            coverUrl = initialTrack?.coverUrl.orEmpty(),
            tracks = initialTracks,
            createdAt = now,
            updatedAt = now
        )
        setHasPendingChanges(true)
        savePendingDeletedIds(loadPendingDeletedIds().filterNot { it == created.id })
        commit(listOf(created) + _playlists.value)
        return created
    }

    @Synchronized
    fun renamePlaylist(id: String, newName: String, newDescription: String? = null) {
        val trimmed = newName.trim()
        if (trimmed.isEmpty()) return
        val now = System.currentTimeMillis()
        val updated = _playlists.value.map { pl ->
            if (pl.id == id) {
                pl.copy(
                    name = trimmed,
                    description = newDescription?.trim() ?: pl.description,
                    updatedAt = now
                )
            } else {
                pl
            }
        }
        setHasPendingChanges(true)
        commit(updated)
    }

    @Synchronized
    fun deletePlaylist(id: String) {
        savePendingDeletedIds(loadPendingDeletedIds() + id)
        setHasPendingChanges(true)
        commit(_playlists.value.filterNot { it.id == id })
    }

    @Synchronized
    fun addTrack(playlistId: String, track: Track): Boolean {
        var added = false
        val now = System.currentTimeMillis()
        val updated = _playlists.value.map { pl ->
            if (pl.id != playlistId) {
                pl
            } else if (pl.tracks.any { it.id == track.id }) {
                pl
            } else {
                added = true
                pl.copy(
                    coverUrl = pl.coverUrl.ifBlank { track.coverUrl },
                    tracks = pl.tracks + track,
                    updatedAt = now
                )
            }
        }
        if (added) {
            setHasPendingChanges(true)
            commit(updated)
        }
        return added
    }

    @Synchronized
    fun removeTrack(playlistId: String, trackId: String) {
        val now = System.currentTimeMillis()
        val updated = _playlists.value.map { pl ->
            if (pl.id == playlistId) {
                val removed = pl.tracks.firstOrNull { it.id == trackId }
                val remaining = pl.tracks.filterNot { it.id == trackId }
                val nextCover = if (remaining.isEmpty() || (removed != null && removed.coverUrl == pl.coverUrl)) {
                    remaining.firstOrNull()?.coverUrl.orEmpty()
                } else {
                    pl.coverUrl
                }
                pl.copy(
                    coverUrl = nextCover,
                    tracks = remaining,
                    updatedAt = now
                )
            } else {
                pl
            }
        }
        setHasPendingChanges(true)
        commit(updated)
    }

    @Synchronized
    fun toggleTrackInPlaylist(playlistId: String, track: Track): Boolean {
        val pl = getPlaylist(playlistId) ?: return false
        return if (pl.tracks.any { it.id == track.id }) {
            removeTrack(playlistId, track.id)
            false
        } else {
            addTrack(playlistId, track)
            true
        }
    }

    @Synchronized
    fun saveExternalPlaylist(
        id: String,
        name: String,
        coverUrl: String,
        tracks: List<Track>
    ): UserPlaylist {
        val trimmedName = name.trim().ifEmpty { "Saved Playlist" }
        val localId = if (id.startsWith("user-")) id else "user-saved-${id.ifBlank { UUID.randomUUID().toString() }}"
        val now = System.currentTimeMillis()
        val dedupedTracks = tracks.distinctBy { it.id }
        val existing = _playlists.value.firstOrNull { it.id == localId || it.name == trimmedName }
        val saved = if (existing != null) {
            existing.copy(
                coverUrl = coverUrl.ifBlank { existing.coverUrl },
                tracks = (existing.tracks + dedupedTracks).distinctBy { it.id },
                updatedAt = now
            )
        } else {
            UserPlaylist(
                id = localId,
                name = trimmedName,
                coverUrl = coverUrl.ifBlank { dedupedTracks.firstOrNull()?.coverUrl.orEmpty() },
                tracks = dedupedTracks,
                createdAt = now,
                updatedAt = now
            )
        }
        setHasPendingChanges(true)
        savePendingDeletedIds(loadPendingDeletedIds().filterNot { it == saved.id })
        val next = listOf(saved) + _playlists.value.filterNot { it.id == saved.id }
        commit(next)
        return saved
    }

    fun syncWithServer(token: String, userId: String? = null) {
        if (token.isBlank()) return
        scope.launch {
            runCatching {
                val baseUrl = RetrofitClient.getBaseUrl()
                val req = Request.Builder()
                    .url("$baseUrl/api/user/playlists")
                    .header("Authorization", "Bearer $token")
                    .get()
                    .build()

                val serverPlaylists = RetrofitClient.getMediaOkHttpClient().newCall(req).execute().use { resp ->
                    if (resp.code == 401) {
                        authRepository?.handleUnauthorized()
                        return@runCatching
                    }
                    if (!resp.isSuccessful) return@runCatching
                    val bodyStr = resp.body?.string().orEmpty()
                    val json = JSONObject(bodyStr)
                    val arr = json.optJSONArray("playlists") ?: JSONArray()
                    parsePlaylistJsonArray(arr)
                }

                var needsPush = false
                val merged: List<UserPlaylist>
                synchronized(this@PlaylistManager) {
                    val lastSyncedUserId = loadLastSyncedUserId()
                    val pendingDeleted = loadPendingDeletedIds().toSet()
                    val pendingChanges = hasPendingChanges()

                    if (lastSyncedUserId != null && userId != null && lastSyncedUserId != userId) {
                        // Different user: server is authoritative
                        merged = serverPlaylists.sortedByDescending { it.createdAt }
                    } else if (lastSyncedUserId == null || pendingChanges || pendingDeleted.isNotEmpty()) {
                        // Guest -> signed-in, or local changes/deletions pending
                        val map = LinkedHashMap<String, UserPlaylist>()
                        serverPlaylists.forEach { sp ->
                            if (pendingDeleted.contains(sp.id)) {
                                needsPush = true
                            } else {
                                map[sp.id] = sp
                            }
                        }
                        _playlists.value.forEach { local ->
                            if (pendingDeleted.contains(local.id)) return@forEach
                            val remote = map[local.id]
                            if (remote == null || local.updatedAt > remote.updatedAt) {
                                map[local.id] = local
                                needsPush = true
                            }
                        }
                        merged = map.values.sortedByDescending { it.createdAt }
                    } else {
                        // Same user with no pending local changes: server is authoritative
                        merged = serverPlaylists.sortedByDescending { it.createdAt }
                    }

                    savePendingDeletedIds(emptyList())
                    setHasPendingChanges(false)
                    saveLastSyncedUserId(userId ?: lastSyncedUserId)
                    commit(merged, pushToServer = false)
                }

                if (needsPush) {
                    pushPlaylistsInternal(token, merged)
                }
            }.onFailure { e ->
                Log.d(TAG, "Playlist sync skipped: ${e.message}")
            }
        }
    }

    private fun pushPlaylistsInternal(token: String, playlists: List<UserPlaylist>) {
        runCatching {
            val baseUrl = RetrofitClient.getBaseUrl()
            val arr = JSONArray()
            playlists.forEach { pl -> arr.put(playlistToJson(pl, snakeCaseForServer = true)) }
            val body = JSONObject().put("playlists", arr).toString()
            val req = Request.Builder()
                .url("$baseUrl/api/user/playlists")
                .header("Authorization", "Bearer $token")
                .put(body.toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()
            RetrofitClient.getMediaOkHttpClient().newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    synchronized(this@PlaylistManager) {
                        savePendingDeletedIds(emptyList())
                        setHasPendingChanges(false)
                    }
                } else if (resp.code == 401) {
                    authRepository?.handleUnauthorized()
                }
            }
        }.onFailure { e ->
            Log.d(TAG, "Playlist push failed: ${e.message}")
        }
    }
}
