package com.kvmusic.app.data.repository

import com.kvmusic.app.data.local.ServerConfigStore
import com.kvmusic.app.data.model.AuthResponse
import com.kvmusic.app.data.model.ErrorResponse
import com.kvmusic.app.data.model.LoginRequest
import com.kvmusic.app.data.model.PairLinkRequest
import com.kvmusic.app.data.model.RegisterRequest
import com.kvmusic.app.data.model.TokenRequest
import com.kvmusic.app.data.model.User
import com.kvmusic.app.data.remote.ApiClient
import com.kvmusic.app.data.remote.JsonProvider
import java.io.IOException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import retrofit2.HttpException

data class AuthState(
    val isLoggedIn: Boolean = false,
    val user: User? = null,
)

class AuthRepository(
    private val apiClient: ApiClient,
    private val serverConfigStore: ServerConfigStore,
) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    init {
        scope.launch { warmUp() }
    }

    suspend fun warmUp() {
        serverConfigStore.warmUp()
        val token = serverConfigStore.token()
        if (token.isNotBlank()) {
            _state.value = AuthState(isLoggedIn = true, user = serverConfigStore.user())
        }
    }

    suspend fun login(email: String, password: String): Result<String> =
        try {
            val response = apiClient.service().login(LoginRequest(email = email.trim(), password = password))
            persist(response)
            Result.success(response.user.name)
        } catch (e: Exception) {
            Result.failure(Exception(e.toUserMessage()))
        }

    suspend fun register(name: String, email: String, password: String, avatarColor: String): Result<Unit> =
        try {
            val response = apiClient.service().register(
                RegisterRequest(name = name.trim(), email = email.trim(), password = password, avatar_color = avatarColor),
            )
            persist(response)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception(e.toUserMessage()))
        }

    suspend fun linkPairCode(code: String): Result<Unit> =
        try {
            val response = apiClient.service().pairLink(PairLinkRequest(code = code.trim()))
            persist(response)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception(e.toUserMessage()))
        }

    suspend fun generatePairCode(): Result<String> {
        return try {
            val token = serverConfigStore.token()
            if (token.isBlank()) return Result.failure(Exception("Chưa đăng nhập"))
            val response = apiClient.service().pairGenerate(TokenRequest(token))
            Result.success(response.pair_code)
        } catch (e: Exception) {
            Result.failure(Exception(e.toUserMessage()))
        }
    }

    suspend fun refreshMe(): Result<Unit> {
        return try {
            val token = serverConfigStore.token()
            if (token.isBlank()) return Result.failure(Exception("Chưa đăng nhập"))
            val response = apiClient.service().me(TokenRequest(token))
            serverConfigStore.setUser(response.user)
            _state.value = AuthState(isLoggedIn = true, user = response.user)
            Result.success(Unit)
        } catch (e: Exception) {
            clearSession()
            Result.failure(Exception(e.toUserMessage()))
        }
    }

    suspend fun logout() {
        val token = runCatching { serverConfigStore.token() }.getOrDefault("")
        if (token.isNotBlank()) {
            runCatching { apiClient.service().logout(TokenRequest(token)) }
        }
        clearSession()
    }

    private suspend fun persist(response: AuthResponse) {
        serverConfigStore.setToken(response.token)
        serverConfigStore.setUser(response.user)
        _state.value = AuthState(isLoggedIn = true, user = response.user)
    }

    private suspend fun clearSession() {
        serverConfigStore.clearAuth()
        _state.value = AuthState(isLoggedIn = false, user = null)
    }
}

private fun Exception.toUserMessage(): String = when (this) {
    is HttpException -> errorBodyMessage() ?: "Lỗi máy chủ (${code()})"
    is IOException -> "Không thể kết nối máy chủ"
    is SerializationException -> "Dữ liệu từ máy chủ không hợp lệ"
    is IllegalStateException -> message ?: "Chưa cấu hình máy chủ"
    else -> message ?: "Đã xảy ra lỗi"
}

private fun HttpException.errorBodyMessage(): String? =
    try {
        val raw = response()?.errorBody()?.string() ?: return null
        JsonProvider.json.decodeFromString<ErrorResponse>(raw).error.takeIf { it.isNotBlank() }
    } catch (_: Exception) {
        null
    }
