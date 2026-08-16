package com.kvmusic.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UpdateResult(
    val output: String? = null,
    val error: String? = null,
)

@Serializable
data class CookieResult(
    val output: String? = null,
    val error: String? = null,
)
