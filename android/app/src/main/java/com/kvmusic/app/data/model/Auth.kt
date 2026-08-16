package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val avatar_color: String = "",
    val pair_code: String = "",
    val created_at: Long? = null,
)

@Serializable
data class AuthResponse(
    val user: User,
    val token: String,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val avatar_color: String,
)

@Serializable
data class PairLinkRequest(
    val code: String,
)

@Serializable
data class PairGenerateResponse(
    val pair_code: String = "",
)

@Serializable
data class TokenRequest(
    val token: String,
)

@Serializable
data class ErrorResponse(
    val error: String = "",
)
