pub mod api;
pub mod models;
mod spotdl;

use axum::{
    routing::get,
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
use crate::spotdl::SpotdlService;

#[tokio::main]
async fn main() {
    println!("SERVER STARTING UP...");
    std::io::stdout().flush().unwrap();
    
    let spotdl = SpotdlService::new();
    spotdl.start_background_preload();
    
    let app_state = Arc::new(AppState { spotdl });

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
