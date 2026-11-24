package com.kvmusic.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.AuthResponse
import com.kvmusic.app.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import org.json.JSONObject

class AuthRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("kv_music_auth", Context.MODE_PRIVATE)
    private val api get() = RetrofitClient.getApi()

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser

    private val _authToken = MutableStateFlow<String?>(null)
    val authToken: StateFlow<String?> = _authToken

    init {
        val savedToken = prefs.getString("auth_token", null)
        if (!savedToken.isNullOrEmpty()) {
            _authToken.value = savedToken
        }
    }

    fun getSavedToken(): String? = _authToken.value

    private fun parseServerError(errorBody: String?, fallback: String): String {
        if (errorBody.isNullOrBlank()) return fallback
        return runCatching {
            JSONObject(errorBody).optString("error").trim().ifBlank { fallback }
        }.getOrDefault(fallback)
    }

    suspend fun restoreSession(): Boolean = withContext(Dispatchers.IO) {
        val token = _authToken.value
        if (token.isNullOrBlank()) return@withContext false
        try {
            val response = api.getMe(mapOf("token" to token))
            if (response.isSuccessful && response.body()?.user != null) {
                _currentUser.value = response.body()!!.user
                true
            } else if (response.code() == 401) {
                handleUnauthorized()
                false
            } else {
                true
            }
        } catch (_: Exception) {
            // Keep existing token offline-tolerant on transient network errors
            true
        }
    }

    fun handleUnauthorized() {
        prefs.edit().remove("auth_token").apply()
        _authToken.value = null
        _currentUser.value = null
    }

    suspend fun login(email: String, pass: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.login(mapOf("email" to email, "password" to pass))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.token != null) {
                    _currentUser.value = body.user
                    saveToken(body.token, body.user?.id)
                }
                Result.success(body)
            } else {
                val msg = parseServerError(response.errorBody()?.string(), "Login failed")
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(name: String, email: String, pass: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.register(mapOf("name" to name, "email" to email, "password" to pass))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.token != null) {
                    _currentUser.value = body.user
                    saveToken(body.token, body.user?.id)
                }
                Result.success(body)
            } else {
                val msg = parseServerError(response.errorBody()?.string(), "Registration failed")
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun generatePairCode(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val token = _authToken.value ?: return@withContext Result.failure(Exception("Not logged in"))
            val response = api.generatePairCode(mapOf("token" to token))
            if (response.code() == 401) {
                handleUnauthorized()
                return@withContext Result.failure(Exception("Session expired"))
            }
            if (response.isSuccessful && response.body()?.pairCode != null) {
                Result.success(response.body()!!.pairCode!!)
            } else {
                val msg = parseServerError(response.errorBody()?.string(), "Failed to generate pair code")
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun linkPairCode(code: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.linkPairCode(mapOf("code" to code))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val resToken = body.token
                if (resToken != null) {
                    _currentUser.value = body.user
                    saveToken(resToken, body.user?.id)
                }
                Result.success(AuthResponse(user = body.user, token = resToken))
            } else {
                val msg = parseServerError(response.errorBody()?.string(), "Invalid pair code")
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        prefs.edit().clear().apply()
        _authToken.value = null
        _currentUser.value = null
        PlaylistManager.clearForLogout()
        com.kvmusic.app.player.PlayerManager.clearAllUserData()
    }

    private fun saveToken(token: String, userId: String? = null) {
        prefs.edit().putString("auth_token", token).apply()
        _authToken.value = token
        PlaylistManager.syncWithServer(token, userId)
    }
}
