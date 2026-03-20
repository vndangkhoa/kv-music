use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: i32,
    pub cover_url: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Playlist {
    pub id: String,
    pub title: String,
    pub cover_url: Option<String>,
    pub created_at: i64,
    pub tracks: Vec<Track>,

    #[serde(rename = "type")]
    pub playlist_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StaticPlaylist {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub creator: Option<String>,
    pub tracks: Vec<Track>,
    #[serde(rename = "type")]
    pub playlist_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YTResult {
    pub id: String,
    pub title: String,
    pub uploader: String,
    pub duration: Option<f64>,
    pub webpage_url: Option<String>,
    #[serde(default)]
    pub thumbnails: Vec<YTThumbnail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YTThumbnail {
    pub url: String,
    pub height: Option<i32>,
    pub width: Option<i32>,
}
