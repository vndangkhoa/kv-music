pub mod api;
pub mod auth;
pub mod models;
mod spotdl;
mod ytm;

use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tower::service_fn;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};
use std::io::Write;

use crate::api::AppState;
use crate::auth::AuthStore;
use crate::spotdl::SpotdlService;
use crate::ytm::YtmBridge;

/// Locate the built frontend directory no matter which directory the server is
/// started from (repo root, backend-rust/, Docker /app).
fn resolve_static_dir() -> String {
    if let Ok(dir) = std::env::var("KV_MUSIC_STATIC") {
        if std::path::Path::new(&dir).join("index.html").exists() {
            return dir;
        }
    }
    for candidate in ["static", "../static", "frontend-vite/dist", "../frontend-vite/dist", "/app/static"] {
        if std::path::Path::new(candidate).join("index.html").exists() {
            return candidate.to_string();
        }
    }
    "static".to_string()
}

async fn robots_txt_handler() -> impl IntoResponse {
    const ROBOTS_TXT: &str = "\
User-agent: Reflectionbot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: *
Disallow: /api/
Disallow: /artist/
Disallow: /album/
Disallow: /playlist/
Disallow: /search
Allow: /$
Allow: /track/
Allow: /share/
";
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "text/plain; charset=utf-8"),
            (header::CACHE_CONTROL, "public, max-age=3600"),
        ],
        ROBOTS_TXT,
    )
}

fn rate_limit_store() -> &'static Mutex<HashMap<String, (Instant, u32)>> {
    static STORE: OnceLock<Mutex<HashMap<String, (Instant, u32)>>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn extract_client_ip(headers: &axum::http::HeaderMap) -> String {
    for h in ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"] {
        if let Some(val) = headers.get(h).and_then(|v| v.to_str().ok()) {
            let first = val.split(',').next().unwrap_or("").trim();
            if !first.is_empty() {
                return first.to_string();
            }
        }
    }
    "unknown".to_string()
}

fn forbidden_bot_response() -> Response {
    Response::builder()
        .status(StatusCode::FORBIDDEN)
        .header("X-Robots-Tag", "noindex, nofollow")
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Body::from("Forbidden"))
        .unwrap()
}

fn too_many_requests_response() -> Response {
    Response::builder()
        .status(StatusCode::TOO_MANY_REQUESTS)
        .header("Retry-After", "30")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(r#"{"error":"Too Many Requests"}"#))
        .unwrap()
}

async fn bot_and_rate_guard(req: Request, next: Next) -> Response {
    let path = req.uri().path();
    let ua = req
        .headers()
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();

    const AI_SCRAPERS: &[&str] = &[
        "reflectionbot",
        "bytespider",
        "gptbot",
        "claudebot",
        "anthropic-ai",
        "ccbot",
        "amazonbot",
        "ahrefsbot",
        "semrushbot",
        "mj12bot",
        "dotbot",
        "petalbot",
        "scrapy",
        "meta-externalagent",
    ];
    if path != "/robots.txt" && AI_SCRAPERS.iter().any(|b| ua.contains(b)) {
        return forbidden_bot_response();
    }

    const SOCIAL_PREVIEW_BOTS: &[&str] = &[
        "facebookexternalhit",
        "facebot",
        "twitterbot",
        "discordbot",
        "telegrambot",
        "slackbot",
        "whatsapp",
        "zalo",
        "linkedinbot",
    ];
    if SOCIAL_PREVIEW_BOTS.iter().any(|b| ua.contains(b))
        && (path.starts_with("/track/")
            || path.starts_with("/share/")
            || path.starts_with("/api/track/")
            || path == "/robots.txt"
            || path.starts_with("/assets/")
            || path.ends_with(".svg")
            || path.ends_with(".png")
            || path.ends_with(".ico"))
    {
        return next.run(req).await;
    }

    const SEARCH_CRAWLERS: &[&str] = &[
        "googlebot",
        "googleother",
        "bingbot",
        "yandexbot",
        "baiduspider",
        "applebot",
        "crawler",
        "spider",
    ];
    if SEARCH_CRAWLERS.iter().any(|b| ua.contains(b))
        && (path.starts_with("/api/")
            || path.starts_with("/artist/")
            || path.starts_with("/album/")
            || path.starts_with("/playlist/")
            || path == "/search"
            || path.starts_with("/search/"))
    {
        return forbidden_bot_response();
    }

    let limit_bucket: Option<(&'static str, u32)> = if path == "/api/search"
        || path == "/api/universal-search"
        || path == "/api/recommendations"
        || path == "/api/artist/info"
    {
        Some(("disc", 60))
    } else if path.starts_with("/api/stream/") || path.starts_with("/api/download/") {
        Some(("media", 150))
    } else {
        None
    };

    if let Some((bucket, max_per_min)) = limit_bucket {
        let client_ip = extract_client_ip(req.headers());
        let key = format!("{}:{}", bucket, client_ip);
        let now = Instant::now();
        let window = Duration::from_secs(60);
        let mut exceeded = false;
        if let Ok(mut map) = rate_limit_store().lock() {
            if map.len() >= 4096 {
                map.retain(|_, (started, _)| now.duration_since(*started) < window);
                if map.len() >= 4096 {
                    map.clear();
                }
            }
            let entry = map.entry(key).or_insert((now, 0));
            if now.duration_since(entry.0) >= window {
                *entry = (now, 1);
            } else {
                entry.1 = entry.1.saturating_add(1);
                if entry.1 > max_per_min {
                    exceeded = true;
                }
            }
        }
        if exceeded {
            return too_many_requests_response();
        }
    }

    next.run(req).await
}

#[tokio::main]
async fn main() {
    std::panic::set_hook(Box::new(|info| {
        eprintln!("FATAL PANIC: {}", info);
        let _ = std::io::stderr().flush();
        std::process::abort();
    }));

    println!("SERVER STARTING UP...");
    std::io::stdout().flush().unwrap();
    
    let spotdl = SpotdlService::new();
    spotdl.start_background_preload();

    // Auto-fetch fresh YouTube cookies at startup when no cookie file exists,
    // so the server is protected from bot detection out of the box.
    if !SpotdlService::has_cookies_file() {
        let spotdl_clone = spotdl.clone();
        tokio::spawn(async move {
            match spotdl_clone.refresh_cookies().await {
                Ok(msg) => println!("[Cookies] Startup auto-refresh: {}", msg),
                Err(e) => println!("[Cookies] Startup auto-refresh failed: {}", e),
            }
        });
    }

    // Account store: Docker -> /app/data/users.json (mounted volume on NAS), local -> ./data/users.json
    let auth_file = if std::path::Path::new("/app/data").exists() {
        "/app/data/users.json".to_string()
    } else {
        "data/users.json".to_string()
    };
    let auth = AuthStore::new(auth_file.clone());
    println!("Auth store ready. Accounts persist at: {}", auth_file);
    std::io::stdout().flush().unwrap();
    
    let static_dir = resolve_static_dir();
    println!("Serving static files from: {}", static_dir);

    // Read the SPA shell once at startup and serve it with `Cache-Control:
    // no-cache`. The built JS/CSS assets carry content hashes (/assets/*.hash.js),
    // so if a browser ever holds onto a stale index.html it will request a
    // bundle that no longer exists and render a blank page - exactly what was
    // happening when shared links were opened from Messenger's in-app browser.
    let index_html: Arc<Vec<u8>> = Arc::new(
        std::fs::read(format!("{}/index.html", static_dir)).unwrap_or_else(|_| {
            eprintln!("WARNING: static/index.html not found - run the frontend build first.");
            Vec::new()
        }),
    );

    let app_state = Arc::new(AppState {
        spotdl,
        auth,
        ytm: YtmBridge::new(),
        index_html: index_html.clone(),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let spa_fallback = service_fn({
        let index_html = index_html.clone();
        move |_req: axum::http::Request<Body>| {
            let index_html = index_html.clone();
            async move {
                Ok::<_, Infallible>(
                    Response::builder()
                        .status(StatusCode::OK)
                        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                        .header(header::CACHE_CONTROL, "no-cache")
                        .body(Body::from(index_html.as_ref().clone()))
                        .unwrap(),
                )
            }
        }
    });

let app = Router::new()
        .route("/robots.txt", get(robots_txt_handler))
        .route("/api/search", get(api::search_handler))
        .route("/api/suggestions", get(api::suggestions_handler))
        .route("/api/feed", get(api::feed_handler))
        .route("/api/universal-search", get(api::universal_search_handler))
        .route("/api/collection", get(api::collection_handler))
        .route("/api/stream/{id}", get(api::stream_handler))
        .route("/api/track/{id}", get(api::track_info_handler))
        .route("/track/{id}", get(api::track_page_handler))
        .route("/share/track/{id}", get(api::share_handler))
        .route("/api/download/{id}", get(api::download_handler))
        .route("/api/artist/info", get(api::artist_info_handler))
        .route("/api/browse", get(api::browse_handler))
        .route("/api/recommendations", get(api::recommendations_handler))
        .route("/api/lyrics", get(api::lyrics_handler))
        .route("/api/lyrics/zingmp3", get(api::zingmp3_lyrics_handler))
        .route("/api/video-stats", get(api::video_stats_handler))
        .route("/api/charts", get(api::charts_handler))
        .route("/api/new-releases", get(api::new_releases_handler))
        .route("/api/artists", get(api::artists_handler))
        .route("/api/settings/update-ytdlp", post(api::update_ytdlp_handler))
        .route("/api/settings/fetch-cookies", post(api::fetch_cookies_handler))
        .route(
            "/api/settings/cookies",
            get(api::get_cookies_status_handler)
                .post(api::save_cookies_handler)
                .delete(api::delete_cookies_handler),
        )
        .route("/api/version", get(api::version_handler))
        .route("/api/update-check", get(api::update_check_handler))
        .route("/api/auth/register", post(api::register_handler))
        .route("/api/auth/login", post(api::login_handler))
        .route("/api/auth/logout", post(api::logout_handler))
        .route("/api/auth/me", post(api::me_handler))
        .route("/api/auth/pair/generate", post(api::pair_generate_handler))
        .route("/api/auth/pair/link", post(api::pair_link_handler))
        .fallback_service(
            ServeDir::new(&static_dir)
                .fallback(spa_fallback),
        )
        .layer(middleware::from_fn(bot_and_rate_guard))
        .layer(cors)
        .with_state(app_state);

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Backend running on http://{}", addr);

    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("CRITICAL ERROR: Failed to bind to {}: {}", addr, e);
            std::io::stderr().flush().unwrap();
            std::process::exit(1);
        }
    };
    
    println!("Server listener established. Serving app...");
    std::io::stdout().flush().unwrap();
    
    axum::serve(listener, app).await.unwrap();
}
