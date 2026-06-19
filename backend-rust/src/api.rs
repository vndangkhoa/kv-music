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

    // Check search_artist which queries YouTube or falls back to placeholder
    match state.spotdl.search_artist(query).await {
        Ok(image_url) => (StatusCode::OK, Json(serde_json::json!({"image": image_url}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

#[derive(Deserialize)]
pub struct BrowseQuery {
    pub country: Option<String>,
}

fn resolve_country(params: &BrowseQuery, headers: &axum::http::HeaderMap) -> String {
    // 1. Check query parameter
    if let Some(ref c) = params.country {
        let cleaned = c.trim().to_uppercase();
        if !cleaned.is_empty() && cleaned.len() == 2 {
            return cleaned;
        }
    }

    // 2. Check CF-IPCountry header
    if let Some(cf_country) = headers.get("cf-ipcountry").and_then(|v| v.to_str().ok()) {
        let cleaned = cf_country.trim().to_uppercase();
        if !cleaned.is_empty() && cleaned.len() == 2 {
            return cleaned;
        }
    }

    // 3. Fallback to Accept-Language
    if let Some(langs) = headers.get("accept-language").and_then(|v| v.to_str().ok()) {
        let langs_lower = langs.to_lowercase();
        if langs_lower.contains("vi") {
            return "VN".to_string();
        }
    }

    "VN".to_string()
}

pub async fn browse_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<BrowseQuery>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let country = resolve_country(&params, &headers);
    state.spotdl.ensure_country_cached(&country).await;

    let cache = state.spotdl.browse_cache.read().await;
    let country_data = cache.get(&country).cloned().unwrap_or_else(|| {
        cache.get("VN").cloned().unwrap_or_default()
    });
    
    (StatusCode::OK, Json(country_data))
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
    pub video_id: Option<String>,
}

fn is_restricted_lyrics(lyrics: &str) -> bool {
    let lower = lyrics.to_lowercase();
    lower.contains("musixmatch")
        || lower.contains("unfortunately we're not authorized")
        || lower.contains("this is a preview")
        || lower.contains("not licensed for use")
        || lower.contains("lyrics are not licensed")
        || lower.contains("cannot be shown")
        || lower.contains("restricted")
}

async fn get_zingmp3_lyrics(client: &reqwest::Client, artist: &str, track: &str) -> Option<String> {
    let clean_track = track
        .replace('(', "")
        .replace(')', "")
        .replace('[', "")
        .replace(']', "")
        .trim()
        .to_string();
    let clean_artist = artist
        .replace('(', "")
        .replace(')', "")
        .replace('[', "")
        .replace(']', "")
        .trim()
        .to_string();

    let search_query = format!("{} {}", clean_artist, clean_track);
    let search_url = format!(
        "https://zingmp3.vn/api/v2/search?query={}&type=song&limit=5",
        urlencoding::encode(&search_query)
    );

    if let Ok(res) = client.get(&search_url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(songs) = json.get("data").and_then(|d| d.as_array()) {
                    for song in songs {
                        if let Some(song_id) = song.get("id").and_then(|id| id.as_str()) {
                            let lyrics_url = format!("https://zingmp3.vn/api/v2/song/get/lyrics?id={}", song_id);
                            if let Ok(lyrics_res) = client.get(&lyrics_url).send().await {
                                if lyrics_res.status().is_success() {
                                    if let Ok(lyrics_json) = lyrics_res.json::<serde_json::Value>().await {
                                        if let Some(data) = lyrics_json.get("data") {
                                            if let Some(lyrics) = data.get("lyrics").and_then(|l| l.as_str()) {
                                                if !lyrics.trim().is_empty() && !is_restricted_lyrics(lyrics) {
                                                    return Some(lyrics.to_string());
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
    None
}

pub async fn lyrics_handler(
    Query(params): Query<LyricsQuery>,
) -> impl IntoResponse {
    let track = params.track.trim();
    let artist = params.artist.trim();
    
    if track.is_empty() || artist.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Track and artist required"}))).into_response();
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    // 1. Try LRCLIB for synced + plain lyrics (fully free and open-source database)
    let lrclib_url = format!(
        "https://lrclib.net/api/search?artist_name={}&track_name={}",
        urlencoding::encode(artist),
        urlencoding::encode(track)
    );
    if let Ok(res) = client.get(&lrclib_url).send().await {
        if res.status().is_success() {
            if let Ok(results) = res.json::<Vec<serde_json::Value>>().await {
                if let Some(first) = results.first() {
                    let plain = first.get("plainLyrics").and_then(|l| l.as_str());
                    let synced = first.get("syncedLyrics").and_then(|l| l.as_str());
                    
                    let has_lyrics = plain.is_some() || synced.is_some();
                    let plain_restricted = plain.map(is_restricted_lyrics).unwrap_or(false);
                    let synced_restricted = synced.map(is_restricted_lyrics).unwrap_or(false);
                    
                    if has_lyrics && !plain_restricted && !synced_restricted {
                        return (StatusCode::OK, Json(serde_json::json!({
                            "plainLyrics": plain,
                            "syncedLyrics": synced
                        }))).into_response();
                    }
                }
            }
        }
    }

    // 2. Try SimpMusic by Video ID if available
    if let Some(ref vid) = params.video_id {
        let simpmusic_url = format!("https://api-lyrics.simpmusic.org/v1/{}", vid);
        if let Ok(res) = client.get(&simpmusic_url).send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if json.get("type").and_then(|t| t.as_str()) == Some("success") {
                        if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                            if let Some(first) = data.first() {
                                let plain = first.get("lyrics").and_then(|l| l.as_str());
                                let synced = first.get("syncedLyrics").and_then(|l| l.as_str());
                                
                                let has_lyrics = plain.is_some() || synced.is_some();
                                let plain_restricted = plain.map(is_restricted_lyrics).unwrap_or(false);
                                let synced_restricted = synced.map(is_restricted_lyrics).unwrap_or(false);
                                
                                if has_lyrics && !plain_restricted && !synced_restricted {
                                    return (StatusCode::OK, Json(serde_json::json!({
                                        "plainLyrics": plain,
                                        "syncedLyrics": synced
                                    }))).into_response();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Try SimpMusic Search by Title
    let simpmusic_search_url = format!(
        "https://api-lyrics.simpmusic.org/v1/search/title?title={}",
        urlencoding::encode(track)
    );
    if let Ok(res) = client.get(&simpmusic_search_url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if json.get("type").and_then(|t| t.as_str()) == Some("success") {
                    if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                        if let Some(first) = data.first() {
                            let plain = first.get("lyrics").and_then(|l| l.as_str());
                            let synced = first.get("syncedLyrics").and_then(|l| l.as_str());
                            
                            let has_lyrics = plain.is_some() || synced.is_some();
                            let plain_restricted = plain.map(is_restricted_lyrics).unwrap_or(false);
                            let synced_restricted = synced.map(is_restricted_lyrics).unwrap_or(false);
                            
                            if has_lyrics && !plain_restricted && !synced_restricted {
                                return (StatusCode::OK, Json(serde_json::json!({
                                    "plainLyrics": plain,
                                    "syncedLyrics": synced
                                }))).into_response();
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Try lyrics.ovh for plain lyrics (free API)
    let lyrics_ovh_url = format!(
        "https://api.lyrics.ovh/v1/{}/{}",
        urlencoding::encode(artist),
        urlencoding::encode(track)
    );
    if let Ok(res) = client.get(&lyrics_ovh_url).send().await {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                if let Some(lyrics) = json.get("lyrics").and_then(|l| l.as_str()) {
                    if !is_restricted_lyrics(lyrics) {
                        return (StatusCode::OK, Json(serde_json::json!({
                            "plainLyrics": lyrics
                        }))).into_response();
                    }
                }
            }
        }
    }

    // 5. Try ZingMP3 for Vietnamese songs (free fallback)
    if let Some(lyrics) = get_zingmp3_lyrics(&client, artist, track).await {
        return (StatusCode::OK, Json(serde_json::json!({
            "plainLyrics": lyrics
        }))).into_response();
    }

    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Lyrics not found"}))).into_response()
}

pub async fn zingmp3_lyrics_handler(
    Query(params): Query<LyricsQuery>,
) -> impl IntoResponse {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_default();
    
    if let Some(lyrics) = get_zingmp3_lyrics(&client, &params.artist, &params.track).await {
        (StatusCode::OK, Json(serde_json::json!({
            "plainLyrics": lyrics
        }))).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Lyrics not found on ZingMP3"}))).into_response()
    }
}
