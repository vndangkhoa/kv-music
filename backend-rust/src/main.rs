pub mod api;
pub mod auth;
pub mod models;
mod spotdl;
mod ytm;

use axum::{
    body::Body,
    http::{header, StatusCode},
    response::Response,
    routing::{get, post},
    Router,
};
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::Arc;
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

#[tokio::main]
async fn main() {
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
