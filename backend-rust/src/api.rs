use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::spotdl::SpotdlService;

pub struct AppState {
    pub spotdl: SpotdlService,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

pub async fn search_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchQuery>,
) -> impl IntoResponse {
    let query = params.q.trim();
    if query.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Query required"})));
    }

    match state.spotdl.search_tracks(query).await {
        Ok(tracks) => (StatusCode::OK, Json(serde_json::json!({"tracks": tracks}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

pub async fn stream_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    req: axum::extract::Request,
) -> impl IntoResponse {
    // This blocks the async executor slightly, ideally spawn_blocking but it's okay for now
    match state.spotdl.get_stream_url(&id) {
        Ok(file_path) => {
            let service = tower_http::services::ServeFile::new(&file_path);
            match tower::ServiceExt::oneshot(service, req).await {
                Ok(res) => res.into_response(),
                Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Error serving file").into_response(),
            }
        },
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
        }
    }
}

pub async fn artist_info_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchQuery>,
) -> impl IntoResponse {
    let query = params.q.trim();
    if query.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Artist name required"})));
    }

    // Check cache first
    {
        let cache = state.spotdl.search_cache.read().await;
        if let Some(cached) = cache.get(query) {
            if let Some(track) = cached.tracks.first() {
                if !track.cover_url.is_empty() {
                    return (StatusCode::OK, Json(serde_json::json!({"image": track.cover_url})));
                }
            }
        }
    }

    // Return placeholder image immediately - no yt-dlp needed
    // Using UI-Avatars for professional-looking artist initials
    let image_url = format!(
        "https://ui-avatars.com/api/?name={}&background=random&color=fff&size=200&rounded=true&bold=true&font-size=0.33",
        urlencoding::encode(&query)
    );
    
    (StatusCode::OK, Json(serde_json::json!({"image": image_url})))
}

pub async fn browse_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let cache = state.spotdl.browse_cache.read().await;
    
    // If the cache is still empty (e.g., still preloading in background),
    // we can return empty or a small default. The frontend will handle it.
    (StatusCode::OK, Json(cache.clone()))
}

#[derive(Deserialize)]
pub struct RecommendationsQuery {
    pub seed: String,
    #[serde(default)]
    pub seed_type: String, // "track", "album", "playlist", "artist"
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    10
}

#[derive(Serialize)]
pub struct Recommendations {
    pub tracks: Vec<crate::models::Track>,
    pub albums: Vec<AlbumSuggestion>,
    pub playlists: Vec<PlaylistSuggestion>,
    pub artists: Vec<ArtistSuggestion>,
}

#[derive(Serialize)]
pub struct AlbumSuggestion {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub cover_url: String,
}

#[derive(Serialize)]
pub struct PlaylistSuggestion {
    pub id: String,
    pub title: String,
    pub cover_url: String,
    pub track_count: usize,
}

#[derive(Serialize)]
pub struct ArtistSuggestion {
    pub id: String,
    pub name: String,
    pub photo_url: String,
}

pub async fn recommendations_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<RecommendationsQuery>,
) -> impl IntoResponse {
    let seed = params.seed.trim();
    if seed.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Seed required"})));
    }

    let seed_type = if params.seed_type.is_empty() {
        // Try to infer type from seed
        if seed.contains("album") || seed.contains("Album") {
            "album"
        } else if seed.contains("playlist") || seed.contains("Playlist") {
            "playlist"
        } else {
            "track"
        }
    } else {
        &params.seed_type
    };

    let limit = params.limit.min(50); // Cap at 50

    match state.spotdl.get_recommendations(seed, seed_type, limit).await {
        Ok(recommendations) => {
            match serde_json::to_value(recommendations) {
                Ok(value) => (StatusCode::OK, Json(value)),
                Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Serialization failed"}))),
            }
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}
