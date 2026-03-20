pub mod api;
pub mod models;
mod spotdl;

use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::api::AppState;
use crate::spotdl::SpotdlService;

#[tokio::main]
async fn main() {
    let spotdl = SpotdlService::new();
    spotdl.start_background_preload();
    
    let app_state = Arc::new(AppState { spotdl });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/search", get(api::search_handler))
        .route("/api/stream/{id}", get(api::stream_handler))
        .route("/api/artist/info", get(api::artist_info_handler))
        .route("/api/browse", get(api::browse_handler))
        .route("/api/recommendations", get(api::recommendations_handler))
        .layer(cors)
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Backend running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
