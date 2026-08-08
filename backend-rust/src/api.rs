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

    // Clean track/artist for better lyrics search
    let clean_track = track
        .split('|').next().unwrap_or(track)
        .trim();
    let clean_artist = artist
        .trim_end_matches(" Official")
        .trim_end_matches(" VEVO")
        .trim_end_matches(" Topic")
        .trim();

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    // 1. Try SimpMusic by Video ID first (YouTube-based, best for Vietnamese)
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

    // 2. Try LRCLIB for synced + plain lyrics
    {
        let lrclib_url = format!(
            "https://lrclib.net/api/search?artist_name={}&track_name={}",
            clean_artist.replace(' ', "+"),
            clean_track.replace(' ', "+")
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
    }

    // 3. Try SimpMusic Search by Title
    {
        let simpmusic_search_url = format!(
            "https://api-lyrics.simpmusic.org/v1/search/title?title={}",
            clean_track.replace(' ', "+")
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
    }

    // 4. Try lyrics.ovh for plain lyrics (free API)
    let lyrics_ovh_url = format!(
        "https://api.lyrics.ovh/v1/{}/{}",
        urlencoding::encode(clean_artist),
        urlencoding::encode(clean_track)
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
    if let Some(lyrics) = get_zingmp3_lyrics(&client, clean_artist, clean_track).await {
        return (StatusCode::OK, Json(serde_json::json!({
            "plainLyrics": lyrics
        }))).into_response();
    }

    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Lyrics not found"}))).into_response()
}

#[derive(Deserialize)]
pub struct VideoStatsQuery {
    pub id: String,
}

#[derive(Serialize)]
pub struct VideoStatsResponse {
    pub view_count: Option<i64>,
    pub like_count: Option<i64>,
    pub comment_count: Option<i64>,
    pub bitrate: Option<i32>,
    pub codec: Option<String>,
}

pub async fn video_stats_handler(
    Query(params): Query<VideoStatsQuery>,
) -> impl IntoResponse {
    let video_id = params.id.trim();
    if video_id.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Video ID required"})));
    }

    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let path = crate::spotdl::SpotdlService::yt_dlp_path_static();
    let mut args = crate::spotdl::SpotdlService::build_yt_dlp_base_args_vec();
    args.push("--dump-json".to_string());
    args.push("--no-playlist".to_string());
    args.push("--flat-playlist".to_string());
    args.push(url);

    let output = std::process::Command::new(&path)
        .args(&args)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            if let Ok(res) = serde_json::from_str::<crate::models::YTResult>(&stdout) {
                return (StatusCode::OK, Json(serde_json::json!({
                    "view_count": res.view_count,
                    "like_count": res.like_count,
                    "comment_count": res.comment_count,
                    "bitrate": res.abr.map(|b| b as i32),
                    "codec": res.acodec,
                })));
            }
        }
        _ => {}
    }

    (StatusCode::OK, Json(serde_json::json!({
        "view_count": null,
        "like_count": null,
        "comment_count": null,
        "bitrate": null,
        "codec": null,
    })))
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

// Charts/Trending Handlers

#[derive(Deserialize)]
pub struct ChartsQuery {
    pub chart_type: String, // "top-hits", "trending", "top-albums", "hits-collection"
}

// Real YouTube Music chart playlists (verified via YT Music charts API)
fn chart_playlist_url(chart_type: &str) -> Option<&'static str> {
    match chart_type {
        // Main-page widget regions (Trending 20 chart per country)
        "vn" => Some("https://music.youtube.com/playlist?list=OLAK5uy_lEos0zuYBvGC9C0FSGG3pZ6gO4a82P6zg"),
        "kr" => Some("https://music.youtube.com/playlist?list=OLAK5uy_kdG4yl_RFDiVHXaqZaSFX1Gqenh8A98pM"),
        "us" => Some("https://music.youtube.com/playlist?list=OLAK5uy_kNWGJvgWVqlt5LsFDL9Sdluly4M8TvGkM"),
        // China has no regional chart - use Global Top 100
        "cn" => Some("https://music.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM"),
        // Charts page tabs
        // BXH REALTIME BÀI HÁT HOT - Trending 20 Vietnam
        "top-hits" => Some("https://music.youtube.com/playlist?list=OLAK5uy_lEos0zuYBvGC9C0FSGG3pZ6gO4a82P6zg"),
        // BXH NHẠC TRẺ VIỆT NAM - Daily Top Music Videos - Vietnam
        "trending" => Some("https://music.youtube.com/playlist?list=PL4fGSI1pDJn57DkisEwlIpcs9FAt5yudJ"),
        // BXH TOP 100 - Top 100 Music Videos Vietnam
        "top-albums" => Some("https://music.youtube.com/playlist?list=PL4fGSI1pDJn4FPCRZtojwqQro5GPY6cuV"),
        // Global chart - Top 100 Songs United States
        "hits-collection" => Some("https://music.youtube.com/playlist?list=PL4fGSI1pDJn6O1LS0XSdF3RyO0Rq_LDeI"),
        _ => None,
    }
}

pub async fn charts_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ChartsQuery>,
) -> impl IntoResponse {
    let chart_type = params.chart_type.trim();

    let Some(chart_url) = chart_playlist_url(chart_type) else {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invalid chart_type"})));
    };

    match state.spotdl.fetch_chart_tracks(chart_url, 100).await {
        Ok(tracks) => {
            let results: Vec<_> = tracks.into_iter().take(50).collect();
            (StatusCode::OK, Json(serde_json::json!({"tracks": results})))
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

// Real "MỚI PHÁT HÀNH" (New Releases) from YouTube Music browse API
#[derive(Deserialize)]
pub struct NewReleasesQuery {
    #[serde(default = "default_region")]
    pub region: String, // "vn" | "us"
}

fn default_region() -> String {
    "vn".to_string()
}

pub async fn new_releases_handler(
    Query(params): Query<NewReleasesQuery>,
) -> impl IntoResponse {
    let gl = match params.region.as_str() {
        "us" => "US",
        _ => "VN",
    };

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .unwrap_or_default();

    let body = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240701.01.00",
                "hl": "en",
                "gl": gl
            }
        },
        "browseId": "FEmusic_new_releases"
    });

    let url = "https://music.youtube.com/youtubei/v1/browse";
    let res = match client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("Request failed: {}", e)}))),
    };

    let json: serde_json::Value = match res.json().await {
        Ok(j) => j,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Invalid response"}))),
    };

    let mut tracks = Vec::new();
    collect_release_videos(&json, &mut tracks);

    if tracks.is_empty() {
        return (StatusCode::OK, Json(serde_json::json!({"tracks": []})));
    }

    (StatusCode::OK, Json(serde_json::json!({"tracks": tracks})))
}

// Walk the browse response for video renderers (title + videoId), skip section headers
fn collect_release_videos(value: &serde_json::Value, tracks: &mut Vec<crate::models::Track>) {
    use serde_json::Value;

    if tracks.len() >= 30 { return; }

    match value {
        Value::Array(arr) => {
            for item in arr {
                collect_release_videos(item, tracks);
            }
        }
        Value::Object(map) => {
            // musicTwoRowItemRenderer: title.runs[0].text, thumbnail in thumbnailRenderer, artist in subtitle
            let title = map.get("title")
                .and_then(|t| t.get("runs"))
                .and_then(|r| r.as_array())
                .and_then(|runs| runs.first())
                .and_then(|r| r.get("text"))
                .and_then(|t| t.as_str());

            let video_id = map.get("navigationEndpoint")
                .and_then(|ne| ne.get("watchEndpoint"))
                .and_then(|we| we.get("videoId"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            if let (Some(t), Some(vid)) = (title, video_id) {
                if vid.len() == 11 && !vid.starts_with("UC") && !vid.starts_with("PL") && !t.starts_with("Music videos") {
                    let artist = map.get("subtitle")
                        .and_then(|s| s.get("runs"))
                        .and_then(|r| r.as_array())
                        .and_then(|runs| runs.iter().find_map(|r| {
                            r.get("text").and_then(|t| t.as_str())
                        }))
                        .unwrap_or("")
                        .to_string();
                    let cover_url = format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", vid);
                    tracks.push(crate::models::Track {
                        id: vid.clone(),
                        title: t.to_string(),
                        artist,
                        album: "YouTube Music".to_string(),
                        duration: 0,
                        cover_url,
                        url: format!("/api/stream/{}", vid),
                        view_count: None,
                        like_count: None,
                        comment_count: None,
                        bitrate: None,
                        codec: None,
                    });
                }
            }
            for v in map.values() {
                collect_release_videos(v, tracks);
            }
        }
        _ => {}
    }
}
