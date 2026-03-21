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

#[derive(Deserialize)]
pub struct LyricsQuery {
    pub track: String,
    pub artist: String,
}

pub async fn lyrics_handler(
    Query(params): Query<LyricsQuery>,
) -> impl IntoResponse {
    let track = params.track.trim();
    let artist = params.artist.trim();
    
    if track.is_empty() || artist.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Track and artist required"})));
    }

    // Try multiple lyrics APIs in sequence for better coverage
    let apis = [
        format!("https://api.lyrics.ovh/v1/{}/{}", 
                urlencoding::encode(artist), 
                urlencoding::encode(track)),
        format!("https://lrclib.net/api/search?artist_name={}&track_name={}", 
                urlencoding::encode(artist), 
                urlencoding::encode(track)),
    ];

    for api_url in &apis {
        match reqwest::get(api_url).await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.text().await {
                        Ok(text) => {
                            // Parse response based on API
                            if api_url.contains("lyrics.ovh") {
                                // lyrics.ovh returns { "lyrics": "..." }
                                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                    if let Some(lyrics) = json.get("lyrics").and_then(|l| l.as_str()) {
                                        return (StatusCode::OK, Json(serde_json::json!({
                                            "plainLyrics": lyrics
                                        })));
                                    }
                                }
                            } else if api_url.contains("lrclib.net") {
                                // LRCLIB returns array of results
                                if let Ok(results) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                                    if let Some(first) = results.first() {
                                        let plain = first.get("plainLyrics").and_then(|l| l.as_str());
                                        let synced = first.get("syncedLyrics").and_then(|l| l.as_str());
                                        return (StatusCode::OK, Json(serde_json::json!({
                                            "plainLyrics": plain,
                                            "syncedLyrics": synced
                                        })));
                                    }
                                }
                            }
                        }
                        Err(_) => continue,
                    }
                }
            }
            Err(_) => continue,
        }
    }

    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Lyrics not found"})))
}

pub async fn zingmp3_lyrics_handler(
    Query(params): Query<LyricsQuery>,
) -> impl IntoResponse {
    let track = params.track.trim();
    let artist = params.artist.trim();
    
    if track.is_empty() || artist.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Track and artist required"})));
    }

    // Clean up track name for better search
    let clean_track = track
        .replace(r"(?i)\s*\(.*?\)", "")
        .replace(r"(?i)\s*\[.*?\]", "")
        .replace(r"(?i)\s*-\s*Official Audio", "")
        .replace(r"(?i)\s*-\s*Lyrics Video", "")
        .replace(r"(?i)\s*-\s*MV", "")
        .replace(r"(?i)\s*-\s*Audio", "")
        .replace(r"(?i)\s*-\s*Video", "")
        .trim()
        .to_string();

    let clean_artist = artist
        .replace(r"(?i)\s*\(.*?\)", "")
        .replace(r"(?i)\s*\[.*?\]", "")
        .replace(r"(?i)\s*-\s*Official", "")
        .replace(r"(?i)\s*-\s*Topic", "")
        .trim()
        .to_string();

    // Try ZingMP3 API for Vietnamese lyrics
    // Search for the song
    let search_query = format!("{} {}", clean_artist, clean_track);
    let search_url = format!("https://zingmp3.vn/api/v2/search?query={}&type=song&limit=5", 
                            urlencoding::encode(&search_query));

    match reqwest::get(&search_url).await {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(text) = response.text().await {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(songs) = json.get("data").and_then(|d| d.as_array()) {
                            for song in songs {
                                if let Some(song_id) = song.get("id").and_then(|id| id.as_str()) {
                                    // Try to get lyrics for this song
                                    let lyrics_url = format!("https://zingmp3.vn/api/v2/song/get/lyrics?id={}", song_id);
                                    
                                    if let Ok(lyrics_response) = reqwest::get(&lyrics_url).await {
                                        if lyrics_response.status().is_success() {
                                            if let Ok(lyrics_text) = lyrics_response.text().await {
                                                if let Ok(lyrics_json) = serde_json::from_str::<serde_json::Value>(&lyrics_text) {
                                                    if let Some(data) = lyrics_json.get("data") {
                                                        if let Some(lyrics) = data.get("lyrics").and_then(|l| l.as_str()) {
                                                            return (StatusCode::OK, Json(serde_json::json!({
                                                                "plainLyrics": lyrics
                                                            })));
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(_) => {
            // ZingMP3 API might have CORS issues, try alternative
        }
    }

    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Lyrics not found on ZingMP3"})))
}
