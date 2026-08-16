package com.kvmusic.app.data.remote

import kotlinx.serialization.json.Json

object JsonProvider {
    val json: Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }
}
