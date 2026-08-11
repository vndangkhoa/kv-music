pub mod api;
pub mod auth;
pub mod models;
mod spotdl;

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};
use std::io::Write;

use crate::api::AppState;
use crate::auth::AuthStore;
use crate::spotdl::SpotdlService;

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
    
    let app_state = Arc::new(AppState { spotdl, auth });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

let app = Router::new()
        .route("/api/search", get(api::search_handler))
        .route("/api/universal-search", get(api::universal_search_handler))
        .route("/api/collection", get(api::collection_handler))
        .route("/api/stream/{id}", get(api::stream_handler))
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
        .fallback_service(ServeDir::new("static"))
        .layer(cors)
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
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
