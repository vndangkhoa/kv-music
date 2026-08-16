package com.kvmusic.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.kvmusic.app.data.model.User
import com.kvmusic.app.data.remote.JsonProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString

private val Context.dataStore by preferencesDataStore(name = "server_config")

class ServerConfigStore(private val context: Context) {

    private object Keys {
        val HOST = stringPreferencesKey("host")
        val QUALITY = stringPreferencesKey("quality")
        val COUNTRY = stringPreferencesKey("country")
        val TOKEN = stringPreferencesKey("token")
        val USER = stringPreferencesKey("user")
        val SEEDED = booleanPreferencesKey("seeded")
    }

    val host: Flow<String> = context.dataStore.data.map { it[Keys.HOST] ?: "" }

    val quality: Flow<String> = context.dataStore.data.map { it[Keys.QUALITY] ?: "auto" }

    val country: Flow<String> = context.dataStore.data.map { it[Keys.COUNTRY] ?: "VN" }

    @Volatile
    private var cachedHost: String = ""

    @Volatile
    private var cachedQuality: String = "auto"

    @Volatile
    private var cachedCountry: String = "VN"

    @Volatile
    private var cachedToken: String = ""

    @Volatile
    private var cachedUser: User? = null

    @Volatile
    private var cachedSeeded: Boolean = false

    @Volatile
    private var loaded: Boolean = false

    suspend fun warmUp() {
        val prefs = context.dataStore.data.first()
        cachedHost = prefs[Keys.HOST] ?: ""
        cachedQuality = prefs[Keys.QUALITY] ?: "auto"
        cachedCountry = prefs[Keys.COUNTRY] ?: "VN"
        cachedToken = prefs[Keys.TOKEN] ?: ""
        cachedUser = prefs[Keys.USER]?.let { raw ->
            runCatching { JsonProvider.json.decodeFromString<User>(raw) }.getOrNull()
        }
        cachedSeeded = prefs[Keys.SEEDED] ?: false
        loaded = true
    }

    fun currentHost(): String = cachedHost

    suspend fun setHost(value: String) {
        val trimmed = value.trim()
        cachedHost = trimmed
        context.dataStore.edit { it[Keys.HOST] = trimmed }
    }

    suspend fun setQuality(value: String) {
        cachedQuality = value
        context.dataStore.edit { it[Keys.QUALITY] = value }
    }

    suspend fun setCountry(value: String) {
        cachedCountry = value
        context.dataStore.edit { it[Keys.COUNTRY] = value }
    }

    suspend fun token(): String = context.dataStore.data.first()[Keys.TOKEN] ?: ""

    suspend fun setToken(value: String) {
        cachedToken = value
        context.dataStore.edit { it[Keys.TOKEN] = value }
    }

    suspend fun user(): User? {
        val raw = context.dataStore.data.first()[Keys.USER] ?: return null
        return runCatching { JsonProvider.json.decodeFromString<User>(raw) }.getOrNull()
    }

    suspend fun setUser(user: User) {
        cachedUser = user
        context.dataStore.edit { it[Keys.USER] = JsonProvider.json.encodeToString(user) }
    }

    suspend fun clearAuth() {
        cachedToken = ""
        cachedUser = null
        context.dataStore.edit {
            it.remove(Keys.TOKEN)
            it.remove(Keys.USER)
        }
    }

    suspend fun getSeeded(): Boolean =
        if (loaded) cachedSeeded else context.dataStore.data.first()[Keys.SEEDED] ?: false

    suspend fun setSeeded(value: Boolean) {
        cachedSeeded = value
        context.dataStore.edit { it[Keys.SEEDED] = value }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
        cachedHost = ""
        cachedQuality = "auto"
        cachedCountry = "VN"
        cachedToken = ""
        cachedUser = null
        cachedSeeded = false
        loaded = false
    }
}
