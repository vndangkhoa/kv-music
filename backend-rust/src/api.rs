use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::fs::File;
use tokio_util::io::ReaderStream;

use crate::spotdl::SpotdlService;
use crate::models::{Playlist, Track};

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

    match state.spotdl.search_artist(query) {
        Ok(img) => (StatusCode::OK, Json(serde_json::json!({"image": img}))),
        Err(e) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": e}))),
    }
}

pub async fn browse_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let cache = state.spotdl.browse_cache.read().await;
    
    // If the cache is still empty (e.g., still preloading in background),
    // we can return empty or a small default. The frontend will handle it.
    (StatusCode::OK, Json(cache.clone()))
}
