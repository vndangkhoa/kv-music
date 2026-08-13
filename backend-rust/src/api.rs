use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::auth::AuthStore;
use crate::spotdl::SpotdlService;
use crate::ytm::YtmBridge;

pub struct AppState {
    pub spotdl: SpotdlService,
    pub auth: AuthStore,
    pub ytm: YtmBridge,
    pub index_html: Arc<Vec<u8>>,
}

// ── Auth handlers ────────────────────────────────────────────────────────────

pub async fn register_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::auth::RegisterPayload>,
) -> impl IntoResponse {
    let avatar_color = if payload.avatar_color.is_empty() {
        serde_json::json!({"from": "#00a8ff", "to": "#2e86de"}).to_string()
    } else {
        payload.avatar_color
    };
    match state.auth.register(&payload.name, &payload.email, &payload.password, &avatar_color).await {
        Ok((user, token)) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "user": crate::auth::public_user(&user),
                "token": token,
            })),
        ),
        Err(e) => (StatusCode::CONFLICT, Json(serde_json::json!({"error": e}))),
    }
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::auth::LoginPayload>,
) -> impl IntoResponse {
    match state.auth.login(&payload.email, &payload.password).await {
        Ok((user, token)) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "user": crate::auth::public_user(&user),
                "token": token,
            })),
        ),
        Err(e) => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e}))),
    }
}

pub async fn logout_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::auth::AuthToken>,
) -> impl IntoResponse {
    state.auth.logout(&payload.token).await;
    (StatusCode::OK, Json(serde_json::json!({"ok": true})))
}

pub async fn me_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::auth::AuthToken>,
) -> impl IntoResponse {
    match state.auth.me(&payload.token).await {
        Some(user) => (StatusCode::OK, Json(serde_json::json!({"user": crate::auth::public_user(&user)}))),
        None => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Phiên đăng nhập hết hạn"}))),
    }
}

pub async fn pair_generate_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::auth::AuthToken>,
) -> impl IntoResponse {
    match state.auth.generate_pair_code_for(&payload.token).await {
        Ok(code) => (StatusCode::OK, Json(serde_json::json!({"pair_code": code}))),
        Err(e) => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": e}))),
    }
}

pub async fn pair_link_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::auth::PairLinkPayload>,
) -> impl IntoResponse {
    match state.auth.link_pair_code(&payload.code).await {
        Some((user, token)) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "user": crate::auth::public_user(&user),
                "token": token,
            })),
        ),
        None => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Mã Pair Code không hợp lệ"}))),
    }
}

pub async fn update_ytdlp_handler() -> impl IntoResponse {
    // Run yt-dlp self-update (writes /tmp/yt-dlp which SpotdlService prefers)
    let output = std::process::Command::new("yt-dlp")
        .arg("-U")
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stderr = String::from_utf8_lossy(&o.stderr);
            let combined = format!("{}{}", stdout, stderr);
            if o.status.success() {
                (StatusCode::OK, Json(serde_json::json!({"output": combined})))
            } else {
                println!("[yt-dlp] update failed: {}", combined);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": combined})))
            }
        }
        Err(e) => {
            println!("[yt-dlp] update spawn error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("Failed to run yt-dlp: {}", e)})))
        }
    }
}

pub async fn fetch_cookies_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.spotdl.refresh_cookies().await {
        Ok(message) => {
            // Fresh cookies - drop caches so every fetch re-queries YouTube with them
            state.spotdl.clear_caches().await;
            (StatusCode::OK, Json(serde_json::json!({"output": message, "success": true})))
        }
        Err(e) => {
            println!("[Cookies] refresh failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e})))
        }
    }
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

#[derive(Deserialize, Default)]
pub struct StreamQuery {
    pub fmt: Option<String>,
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

/// Live search suggestions from YouTube Music (ytmusicapi bridge).
pub async fn suggestions_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchQuery>,
) -> impl IntoResponse {
    let query = params.q.trim().to_string();
    if query.is_empty() {
        return (StatusCode::OK, Json(serde_json::json!([])));
    }
    let out = state.ytm.suggestions(&query).await;
    match serde_json::from_str::<serde_json::Value>(&out) {
        Ok(v) => (StatusCode::OK, Json(v)),
        Err(_) => (StatusCode::OK, Json(serde_json::json!([]))),
    }
}

/// YouTube Music home feed sections (mixes / quick picks / made for you).
pub async fn feed_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let out = state.ytm.home().await;
    match serde_json::from_str::<serde_json::Value>(&out) {
        Ok(v) => (StatusCode::OK, Json(v)),
        Err(_) => (StatusCode::OK, Json(serde_json::json!([]))),
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
     .replace('\'', "&#39;")
}

/// Facebook/Messenger link previews do not reliably render WebP images. YouTube
/// serves covers as WebP (i.ytimg.com/vi_webp/.../maxresdefault.webp); convert
/// any such URL to the equivalent JPG so the shared thumbnail always displays.
fn og_image_rewrite(cover_url: &str) -> String {
    if !cover_url.contains("i.ytimg.com") {
        return cover_url.to_string();
    }
    let idx = match cover_url.find("/vi_") {
        Some(i) => i,
        None => return cover_url.to_string(),
    };
    let rest = &cover_url[idx..];
    let after = rest
        .trim_start_matches("/vi_webp/")
        .trim_start_matches("/vi/");
    let (vid, name) = match after.split_once('/') {
        Some((v, n)) => (v, n),
        None => return cover_url.to_string(),
    };
    let name = name.strip_suffix(".webp").unwrap_or(name);
    format!("https://i.ytimg.com/vi/{}/{}.jpg", vid, name)
}

/// JSON metadata for a single track by YouTube id (used by the SPA's /track/:id page).
pub async fn track_info_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.spotdl.get_track_info(&id).await {
        Ok(track) => (StatusCode::OK, Json(track)).into_response(),
        Err(e) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": e}))).into_response(),
    }
}

/// Detect link-preview crawlers (Facebook/Messenger, Twitter, WhatsApp, Telegram,
/// iMessage, etc.). Everything else is a human clicking the link and should be
/// redirected straight into the app instead of waiting on a meta-refresh, which
/// some in-app browsers (e.g. Messenger's WebView) ignore - that was causing
/// shared links to hang on a dark blue page.
fn is_link_preview_bot(user_agent: &str) -> bool {
    let ua = user_agent.to_lowercase();
    [
        "facebookexternalhit",
        "facebookcatalog",
        "facebot",
        "meta-externalagent",
        "meta-externalfetcher",
        "messenger",
        "twitterbot",
        "linkedinbot",
        "slackbot",
        "discordbot",
        "telegrambot",
        "whatsapp",
        "viber",
        "pinterest",
        "skypeuripreview",
        "line",
        "snapchat",
        "tumblr",
        "redditbot",
        "embedly",
        "quora",
        "applebot",
        "googlebot",
        "bingbot",
        "baiduspider",
        "yandex",
        "duckduckbot",
        "sogou",
        "exabot",
        "bingpreview",
        "adidxbot",
        "slurp",
        "curl",
        "wget",
        "python-requests",
        "python-urllib",
        "java/",
        "httpclient",
        "okhttp",
        "go-http-client",
        "zalo",
        "zalobot",
        "micromessenger",
    ]
    .iter()
    .any(|bot| ua.contains(bot))
}

pub async fn build_og_response(
    state: &AppState,
    id: &str,
    headers: &axum::http::HeaderMap,
) -> Response {
    let host = headers
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost:8080")
        .to_string();
    let scheme = if headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .map(|s| s == "https")
        .unwrap_or(false)
    {
        "https"
    } else {
        "http"
    };
    let base = format!("{}://{}", scheme, host);
    let share_url = format!("{}/share/track/{}", base, id);
    let app_url = format!("{}/track/{}", base, id);

    let (title, artist, cover_url) = state.spotdl.resolve_share_preview(id).await;

    let e_title = html_escape(&title);
    let e_artist = html_escape(&artist);
    let e_cover = html_escape(&og_image_rewrite(&cover_url));
    let e_share_url = html_escape(&share_url);
    let e_app_url = html_escape(&app_url);
    let description = format!("{} - {}", title, artist);
    let e_desc = html_escape(&description);

    let html = format!(
        r#"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{e_title} - {e_artist} | kv-music</title>
  <meta name="description" content="{e_desc}" />

  <!-- Open Graph (Messenger / Facebook / Social) -->
  <meta property="og:type" content="music.song" />
  <meta property="og:site_name" content="kv-music" />
  <meta property="og:title" content="{e_title}" />
  <meta property="og:description" content="{e_desc}" />
  <meta property="og:url" content="{e_share_url}" />
  <meta property="og:image" content="{e_cover}" />
  <meta property="og:image:secure_url" content="{e_cover}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="500" />
  <meta property="og:image:height" content="500" />
  <meta property="og:image:alt" content="{e_title} by {e_artist}" />
  <meta property="music:musician" content="{e_artist}" />
  <meta property="music:duration" content="0" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{e_title}" />
  <meta name="twitter:description" content="{e_desc}" />
  <meta name="twitter:image" content="{e_cover}" />

  <meta http-equiv="refresh" content="0;url={e_app_url}" />
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: radial-gradient(1200px 600px at 20% -10%, #142044, #0b132d 60%); min-height:100vh; display:flex; align-items:center; justify-content:center; color:#fff; }}
    .card {{ background: rgba(20,32,68,.7); border:1px solid rgba(0,168,255,.25); border-radius:20px; padding:28px; max-width:380px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.5); }}
    img {{ width:180px; height:180px; object-fit:cover; border-radius:16px; margin-bottom:16px; box-shadow:0 10px 30px rgba(0,0,0,.5); }}
    h1 {{ font-size:18px; font-weight:700; }}
    p {{ color:#9fb2d9; margin-top:6px; font-size:14px; }}
    a {{ display:inline-block; margin-top:18px; padding:10px 22px; border-radius:999px; background:linear-gradient(90deg,#00a8ff,#00d2d3); color:#fff; font-weight:700; text-decoration:none; font-size:14px; }}
    .brand {{ margin-top:14px; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#5b6fa8; }}
  </style>
</head>
<body>
  <div class="card">
    <img src="{e_cover}" alt="{e_title}" />
    <h1>{e_title}</h1>
    <p>{e_artist}</p>
    <a href="{e_app_url}">▶ Open in kv-music</a>
    <div class="brand">kv-music · listen in high quality</div>
  </div>
</body>
</html>"#
    );

    (
        StatusCode::OK,
        [
            (
                axum::http::header::CONTENT_TYPE,
                axum::http::HeaderValue::from_static("text/html; charset=utf-8"),
            ),
            (
                axum::http::header::CACHE_CONTROL,
                axum::http::HeaderValue::from_static("no-cache, no-store, must-revalidate"),
            ),
        ],
        html,
    )
        .into_response()
}

pub async fn share_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if is_link_preview_bot(user_agent) {
        return build_og_response(&state, &id, &headers).await;
    }

    let host = headers
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost:8080");
    let scheme = if headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .map(|s| s == "https")
        .unwrap_or(false)
    {
        "https"
    } else {
        "http"
    };
    let app_url = format!("{}://{}/track/{}", scheme, host, id);
    (StatusCode::FOUND, [(axum::http::header::LOCATION, app_url)], ()).into_response()
}

pub async fn track_page_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if is_link_preview_bot(user_agent) {
        return build_og_response(&state, &id, &headers).await;
    }

    Response::builder()
        .status(StatusCode::OK)
        .header(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")
        .header(axum::http::header::CACHE_CONTROL, "no-cache")
        .body(Body::from(state.index_html.as_ref().clone()))
        .unwrap()
        .into_response()
}

pub async fn stream_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Query(params): Query<StreamQuery>,
    req: axum::extract::Request,
) -> impl IntoResponse {
    // fmt=webm (default): open codec, plays in Chrome/Firefox/Edge and
    // codec-restricted clients like VS Code's webview (no AAC/MP3 decoder).
    // fmt=m4a: AAC - needed for Safari, which cannot play WebM/Opus.
    let prefer_m4a = params.fmt.as_deref() == Some("m4a");
    // This blocks the async executor slightly, ideally spawn_blocking but it's okay for now
    match state.spotdl.get_stream_url(&id, prefer_m4a) {
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

#[derive(Deserialize, Default)]
pub struct DownloadQuery {
    pub fmt: Option<String>,
}

pub async fn download_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Query(params): Query<DownloadQuery>,
    req: axum::extract::Request,
) -> impl IntoResponse {
    // fmt=video: best video+audio merged into a single .mp4 via ffmpeg.
    // fmt=m4a: AAC/MP4 audio (Safari). Anything else: default WebM/Opus audio.
    let is_video = params.fmt.as_deref() == Some("video");
    let result = if is_video {
        state.spotdl.get_video_url(&id)
    } else {
        let prefer_m4a = params.fmt.as_deref() == Some("m4a");
        state.spotdl.get_stream_url(&id, prefer_m4a)
    };

    match result {
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
    State(state): State<Arc<AppState>>,
    Query(params): Query<NewReleasesQuery>,
) -> impl IntoResponse {
    let gl = match params.region.as_str() {
        "us" => "US",
        _ => "VN",
    };

    let client = state.spotdl.yt_client();

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

// Real "Top Nghệ Sĩ Nổi Bật" (Top artists chart) from YouTube Music browse API
#[derive(Serialize)]
pub struct ArtistChartEntry {
    pub id: String,
    pub name: String,
    pub photo: String,
    pub followers: String,
}

#[derive(Deserialize)]
pub struct ArtistsQuery {
    pub region: String, // "vn" | "us" | "kr" | "cn"
}

fn chart_gl(region: &str) -> &'static str {
    match region {
        "us" => "US",
        "kr" => "KR",
        // China has no regional chart on YT Music - use Global (ZZ)
        "cn" => "ZZ",
        _ => "VN",
    }
}

pub async fn artists_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ArtistsQuery>,
) -> impl IntoResponse {
    let region = params.region.trim().to_lowercase();
    let gl = chart_gl(&region);

    let client = state.spotdl.yt_client();

    let body = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260808.01.00",
                "hl": "en"
            }
        },
        "browseId": "FEmusic_charts",
        "formData": {
            "selectedValues": [gl]
        }
    });

    let url = "https://music.youtube.com/youtubei/v1/browse";
    let res = match client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/charts")
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

    let artists = collect_artists_from_charts(&json);

    (StatusCode::OK, Json(serde_json::json!({"artists": artists})))
}

// Walk the charts browse response for the "Top artists" section items
fn collect_artists_from_charts(value: &serde_json::Value) -> Vec<ArtistChartEntry> {
    use serde_json::Value;
    let mut artists = Vec::new();

    fn walk(value: &Value, artists: &mut Vec<ArtistChartEntry>) {
        if artists.len() >= 50 { return; }

        match value {
            Value::Array(arr) => {
                for item in arr {
                    walk(item, artists);
                }
            }
            Value::Object(map) => {
                // musicResponsiveListItemRenderer: name in flexColumns[0], subs in flexColumns[1], photo in thumbnail
                let name = map.get("flexColumns")
                    .and_then(|fc| fc.as_array())
                    .and_then(|cols| cols.first())
                    .and_then(|c| c.get("musicResponsiveListItemFlexColumnRenderer"))
                    .and_then(|r| r.get("text"))
                    .and_then(|t| t.get("runs"))
                    .and_then(|runs| runs.as_array())
                    .and_then(|runs| runs.first())
                    .and_then(|r| r.get("text"))
                    .and_then(|t| t.as_str());

                let followers = map.get("flexColumns")
                    .and_then(|fc| fc.as_array())
                    .and_then(|cols| cols.get(1))
                    .and_then(|c| c.get("musicResponsiveListItemFlexColumnRenderer"))
                    .and_then(|r| r.get("text"))
                    .and_then(|t| t.get("runs"))
                    .and_then(|runs| runs.as_array())
                    .and_then(|runs| runs.first())
                    .and_then(|r| r.get("text"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("")
                    .to_string();

                let photo = map.get("thumbnail")
                    .and_then(|th| th.get("musicThumbnailRenderer"))
                    .and_then(|r| r.get("thumbnail"))
                    .and_then(|th| th.get("thumbnails"))
                    .and_then(|t| t.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|th| th.get("url"))
                    .and_then(|u| u.as_str())
                    .unwrap_or("")
                    .to_string();

                if let Some(n) = name {
                    if !n.is_empty() && !followers.is_empty() && photo.starts_with("http") && !n.starts_with("Top artists") {
                        artists.push(ArtistChartEntry {
                            id: format!("artist-{}", n.replace(|c: char| !c.is_alphanumeric() && c != ' ', "-").to_lowercase()),
                            name: n.to_string(),
                            photo,
                            followers,
                        });
                    }
                }
                for v in map.values() {
                    walk(v, artists);
                }
            }
            _ => {}
        }
    }

    walk(value, &mut artists);
    artists
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal Search (songs + albums + playlists + artists) via YT Music API
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UniversalSearchQuery {
    pub q: String,
}

#[derive(Serialize)]
pub struct AlbumHit {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub cover_url: String,
}

#[derive(Serialize)]
pub struct PlaylistHit {
    pub id: String,
    pub title: String,
    pub cover_url: String,
}

#[derive(Serialize)]
pub struct ArtistHit {
    pub id: String,
    pub name: String,
    pub photo: String,
}

fn ytm_search_params(filter: &str) -> &'static str {
    match filter {
        "songs" => "EgWKAQIIAWoMEA4QChADEAQQCRAF",
        "albums" => "EgWKAQIYAWoMEA4QChADEAQQCRAF",
        "artists" => "EgWKAQIgAWoMEA4QChADEAQQCRAF",
        "playlists" => "Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo=",
        _ => "EgWKAQIIAWoMEA4QChADEAQQCRAF",
    }
}

// Run one YT Music search request and return the raw response
async fn ytm_search(client: &reqwest::Client, query: &str, filter: &str) -> Option<serde_json::Value> {
    let body = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20260808.01.00",
                "hl": "en"
            }
        },
        "query": query,
        "params": ytm_search_params(filter)
    });

    let res = client
        .post("https://music.youtube.com/youtubei/v1/search")
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .json(&body)
        .send()
        .await
        .ok()?;

    res.json::<serde_json::Value>().await.ok()
}

// Extract a string from nested run objects
fn run_text(value: &serde_json::Value) -> Option<String> {
    value
        .get("text")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

// Parse a musicResponsiveListItemRenderer into a Track (songs search)
fn parse_song_item(item: &serde_json::Value) -> Option<crate::models::Track> {
    let col0 = item.get("flexColumns")?.as_array()?
        .first()?
        .get("musicResponsiveListItemFlexColumnRenderer")?;

    let title = col0.get("text")?
        .get("runs")?
        .as_array()?
        .first()
        .and_then(run_text)?;

    // videoId lives inside the first run's navigationEndpoint
    let video_id = col0.get("text")?
        .get("runs")?
        .as_array()?
        .first()?
        .get("navigationEndpoint")?
        .get("watchEndpoint")?
        .get("videoId")?
        .as_str()?;

    let artist = item.get("flexColumns").and_then(|c| c.as_array())
        .and_then(|cols| cols.get(1))
        .and_then(|c| c.get("musicResponsiveListItemFlexColumnRenderer"))
        .and_then(|r| r.get("text"))
        .and_then(|t| t.get("runs"))
        .and_then(|r| r.as_array())
        .and_then(|runs| runs.iter().find_map(|r| r.get("text").and_then(|t| t.as_str())))
        .unwrap_or("")
        .to_string();

    let cover_url = item.get("thumbnail")
        .and_then(|th| th.get("musicThumbnailRenderer"))
        .and_then(|r| r.get("thumbnail"))
        .and_then(|th| th.get("thumbnails"))
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.last())
        .and_then(|th| th.get("url"))
        .and_then(|u| u.as_str())
        .unwrap_or("")
        .to_string();

    if video_id.len() != 11 { return None; }

    Some(crate::models::Track {
        id: video_id.to_string(),
        title,
        artist,
        album: "YouTube Music".to_string(),
        duration: 0,
        cover_url,
        url: format!("/api/stream/{}", video_id),
        view_count: None,
        like_count: None,
        comment_count: None,
        bitrate: None,
        codec: None,
    })
}

// Parse album/playlist/artist hits (shared two-line renderer structure)
fn parse_hit(item: &serde_json::Value) -> Option<(String, String, String, String, String)> {
    // returns (title, artist_or_sub, browse_id, cover_url, page_type)
    let title = item.get("flexColumns")?
        .as_array()?
        .first()?
        .get("musicResponsiveListItemFlexColumnRenderer")?
        .get("text")?
        .get("runs")?
        .as_array()?
        .first()
        .and_then(run_text)?;

    let sub = item.get("flexColumns").and_then(|c| c.as_array())
        .and_then(|cols| cols.get(1))
        .and_then(|c| c.get("musicResponsiveListItemFlexColumnRenderer"))
        .and_then(|r| r.get("text"))
        .and_then(|t| t.get("runs"))
        .and_then(|r| r.as_array())
        .and_then(|runs| runs.iter().find_map(|r| r.get("text").and_then(|t| t.as_str())))
        .unwrap_or("")
        .to_string();

    let nav = item.get("navigationEndpoint")?;
    let browse = nav.get("browseEndpoint")?;
    let browse_id = browse.get("browseId")?.as_str()?.to_string();
    let page_type = browse.get("browseEndpointContextSupportedConfigs")
        .and_then(|c| c.get("browseEndpointContextMusicConfig"))
        .and_then(|c| c.get("pageType"))
        .and_then(|p| p.as_str())
        .unwrap_or("")
        .to_string();

    let cover_url = item.get("thumbnail")
        .and_then(|th| th.get("musicThumbnailRenderer"))
        .and_then(|r| r.get("thumbnail"))
        .and_then(|th| th.get("thumbnails"))
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.last())
        .and_then(|th| th.get("url"))
        .and_then(|u| u.as_str())
        .unwrap_or("")
        .to_string();

    Some((title, sub, browse_id, cover_url, page_type))
}

// Walk search response for items of a specific renderer key, collecting hits
fn collect_hits(value: &serde_json::Value, renderer_key: &str, out: &mut Vec<(String, String, String, String, String)>) {
    use serde_json::Value;

    match value {
        Value::Array(arr) => {
            for item in arr {
                collect_hits(item, renderer_key, out);
            }
        }
        Value::Object(map) => {
            if let Some(renderer) = map.get(renderer_key) {
                if let Some(hit) = parse_hit(renderer) {
                    out.push(hit);
                }
            }
            for v in map.values() {
                collect_hits(v, renderer_key, out);
            }
        }
        _ => {}
    }
}

// Walk search response for song items
fn collect_songs(value: &serde_json::Value, out: &mut Vec<crate::models::Track>) {
    use serde_json::Value;

    match value {
        Value::Array(arr) => {
            for item in arr {
                collect_songs(item, out);
            }
        }
        Value::Object(map) => {
            if let Some(renderer) = map.get("musicResponsiveListItemRenderer") {
                if let Some(track) = parse_song_item(renderer) {
                    out.push(track);
                }
            }
            for v in map.values() {
                collect_songs(v, out);
            }
        }
        _ => {}
    }
}

pub async fn universal_search_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<UniversalSearchQuery>,
) -> impl IntoResponse {
    let query = params.q.trim();
    if query.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Query required"})));
    }

    let client = state.spotdl.yt_client();

    // Run all 4 category searches in parallel
    let (songs_res, albums_res, playlists_res, artists_res) = tokio::join!(
        ytm_search(client, query, "songs"),
        ytm_search(client, query, "albums"),
        ytm_search(client, query, "playlists"),
        ytm_search(client, query, "artists"),
    );

    // ── Songs ──
    let mut songs: Vec<crate::models::Track> = Vec::new();
    if let Some(resp) = songs_res {
        let mut collected = Vec::new();
        collect_songs(&resp, &mut collected);
        // dedupe by id
        let mut seen = std::collections::HashSet::new();
        for t in collected {
            if seen.insert(t.id.clone()) {
                songs.push(t);
            }
        }
    }
    songs.truncate(20);

    // ── Albums / Playlists / Artists ──
    let mut albums: Vec<AlbumHit> = Vec::new();
    let mut playlists: Vec<PlaylistHit> = Vec::new();
    let mut artists: Vec<ArtistHit> = Vec::new();

    if let Some(resp) = albums_res {
        let mut hits = Vec::new();
        collect_hits(&resp, "musicResponsiveListItemRenderer", &mut hits);
        let mut seen = std::collections::HashSet::new();
        for (title, sub, browse_id, cover_url, _page_type) in hits {
            if browse_id.starts_with("MPRE") && seen.insert(browse_id.clone()) {
                let artist = sub.split(" • ").next().unwrap_or(&sub).to_string();
                albums.push(AlbumHit { id: browse_id, title, artist, cover_url });
            }
        }
    }
    albums.truncate(10);

    if let Some(resp) = playlists_res {
        let mut hits = Vec::new();
        collect_hits(&resp, "musicResponsiveListItemRenderer", &mut hits);
        let mut seen = std::collections::HashSet::new();
        for (title, _sub, browse_id, cover_url, _page_type) in hits {
            if browse_id.starts_with("VLPL") && seen.insert(browse_id.clone()) {
                playlists.push(PlaylistHit { id: browse_id, title, cover_url });
            }
        }
    }
    playlists.truncate(10);

    if let Some(resp) = artists_res {
        let mut hits = Vec::new();
        collect_hits(&resp, "musicResponsiveListItemRenderer", &mut hits);
        let mut seen = std::collections::HashSet::new();
        for (name, _sub, browse_id, photo, _page_type) in hits {
            if browse_id.starts_with("UC") && seen.insert(browse_id.clone()) {
                artists.push(ArtistHit { id: browse_id, name, photo });
            }
        }
    }
    artists.truncate(10);

    (StatusCode::OK, Json(serde_json::json!({
        "songs": songs,
        "albums": albums,
        "playlists": playlists,
        "artists": artists,
    })))
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection (album/playlist) track listing
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CollectionQuery {
    pub id: String,
}

pub async fn collection_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CollectionQuery>,
) -> impl IntoResponse {
    let id = params.id.trim();
    if id.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "ID required"})));
    }

    match state.spotdl.fetch_collection_tracks(id, 100).await {
        Ok(tracks) => {
            let cover_url = tracks.first().map(|t| t.cover_url.clone()).unwrap_or_default();
            (StatusCode::OK, Json(serde_json::json!({
                "id": id,
                "title": "Collection",
                "cover_url": cover_url,
                "tracks": tracks
            })))
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}
