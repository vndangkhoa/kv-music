package com.kvmusic.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.kvmusic.app.data.api.RetrofitClient
import com.kvmusic.app.data.model.AuthResponse
import com.kvmusic.app.data.model.PairResponse
import com.kvmusic.app.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext

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

    suspend fun login(email: String, pass: String): Result<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.login(mapOf("email" to email, "password" to pass))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.token != null) {
                    saveToken(body.token)
                    _currentUser.value = body.user
                }
                Result.success(body)
            } else {
                Result.failure(Exception("Login failed"))
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
                    saveToken(body.token)
                    _currentUser.value = body.user
                }
                Result.success(body)
            } else {
                Result.failure(Exception("Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun generatePairCode(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val token = _authToken.value ?: return@withContext Result.failure(Exception("Not logged in"))
            val response = api.generatePairCode(mapOf("token" to token))
            if (response.isSuccessful && response.body()?.pairCode != null) {
                Result.success(response.body()!!.pairCode!!)
            } else {
                Result.failure(Exception("Failed to generate pair code"))
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
                    saveToken(resToken)
                    _currentUser.value = body.user
                }
                Result.success(AuthResponse(user = body.user, token = resToken))
            } else {
                Result.failure(Exception("Invalid pair code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        prefs.edit().clear().apply()
        _authToken.value = null
        _currentUser.value = null
        com.kvmusic.app.player.PlayerManager.clearAllUserData()
    }

    private fun saveToken(token: String) {
        prefs.edit().putString("auth_token", token).apply()
        _authToken.value = token
    }
}
