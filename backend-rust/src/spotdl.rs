use std::process::Command;
use std::path::{Path, PathBuf};
use std::env;
use std::fs;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::{Instant, Duration};
use futures::future::join_all;

use crate::models::{Track, YTResult, StaticPlaylist};

pub struct CacheItem {
    pub tracks: Vec<Track>,
    pub timestamp: Instant,
}

#[derive(Clone)]
pub struct SpotdlService {
    download_dir: PathBuf,
    pub search_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
    pub browse_cache: Arc<RwLock<HashMap<String, Vec<StaticPlaylist>>>>,
}

impl SpotdlService {
    pub fn new() -> Self {
        let temp_dir = env::temp_dir();
        let download_dir = temp_dir.join("spotify-clone-cache");
        let _ = fs::create_dir_all(&download_dir);

        // Ensure node is in PATH for yt-dlp
        let _ = Self::js_runtime_args();

        Self {
            download_dir,
            search_cache: Arc::new(RwLock::new(HashMap::new())),
            browse_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn get_placeholder_image(&self, seed: &str) -> String {
        let initials = seed.chars().take(2).collect::<String>().to_uppercase();
        let colors = vec!["1DB954", "FF6B6B", "4ECDC4", "45B7D1", "6C5CE7", "FDCB6E"];

        let mut hash = 0u32;
        for c in seed.chars() {
            hash = c as u32 + hash.wrapping_shl(5).wrapping_sub(hash);
        }
        let color = colors[(hash as usize) % colors.len()];

        format!("https://placehold.co/400x400/{}/FFFFFF?text={}", color, initials)
    }

    fn yt_dlp_path() -> String {
        // Use the updated binary we downloaded
        let updated_path = "/tmp/yt-dlp";
        if Path::new(updated_path).exists() {
            return updated_path.to_string();
        }
        
        // Windows: Check user Scripts folder
        if cfg!(windows) {
            if let Ok(home) = env::var("APPDATA") {
                let win_path = Path::new(&home).join("Python").join("Python312").join("Scripts").join("yt-dlp.exe");
                if win_path.exists() {
                    return win_path.to_string_lossy().into_owned();
                }
            }
        }
        
        "yt-dlp".to_string()
    }
    
    fn js_runtime_args() -> Vec<String> {
        Vec::new()
    }

    pub fn start_background_preload(&self) {
        let cache_arc = self.browse_cache.clone();
        let refresh_cache = self.browse_cache.clone();
        
        tokio::spawn(async move {
            println!("Background preloader started... fetching Top Albums & Playlists");
            Self::fetch_browse_content(&cache_arc).await;
        });

        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(300)).await;
                println!("Periodic refresh: updating browse content...");
                Self::fetch_browse_content(&refresh_cache).await;
            }
        });
    }

    async fn fetch_browse_content(cache_arc: &Arc<RwLock<HashMap<String, Vec<StaticPlaylist>>>>) {
        let queries = vec![
            ("Top Albums", "ytsearch50:Top Albums Vietnam audio"),
            ("Viral Hits Vietnam", "ytsearch30:Viral Hits Vietnam audio"),
            ("Lofi Chill Vietnam", "ytsearch30:Lofi Chill Vietnam audio"),
            ("US UK Top Hits", "ytsearch30:US UK Billboard Hot 100 audio"),
            ("K-Pop ON!", "ytsearch30:K-Pop Top Hits audio"),
            ("Rap Viet", "ytsearch30:Rap Viet Mix audio"),
            ("Indie Vietnam", "ytsearch30:Indie Vietnam audio"),
            ("V-Pop Rising", "ytsearch30:V-Pop Rising audio"),
            ("Trending Music", "ytsearch30:Trending Music 2024 audio"),
            ("Acoustic Thu Gian", "ytsearch30:Acoustic Thu Gian audio"),
            ("Workout Energy", "ytsearch30:Workout Energy Mix audio"),
            ("Sleep Sounds", "ytsearch30:Sleep Sounds music audio"),
            ("Party Anthems", "ytsearch30:Party Anthems Mix audio"),
            ("Piano Focus", "ytsearch30:Piano Focus music audio"),
            ("Gaming Music", "ytsearch30:Gaming Music Mix audio"),
        ];

            let path = Self::yt_dlp_path();
            let mut all_data: HashMap<String, Vec<StaticPlaylist>> = HashMap::new();

            for (category, search_query) in queries {
                let output = Command::new(&path)
                    .args(&["--js-runtimes", "node", &search_query, "--dump-json", "--no-playlist", "--flat-playlist"])
                    .output();
                
                if let Ok(o) = output {
                    let stdout = String::from_utf8_lossy(&o.stdout);
                    let mut items = Vec::new();
                    
                    for line in stdout.lines() {
                        if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                            let duration = res.duration.unwrap_or(0.0);
                            if res.id.starts_with("UC") || duration < 60.0 { continue; }
                            
                            let cover_url = if let Some(t) = res.thumbnails.last() { t.url.clone() } else { format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", res.id) };
                            
                            let artist = res.uploader.replace(" - Topic", "");
                            
                            // Decide if it's treated as Album or Playlist
                            let is_album = category == "Top Albums";
                            let p_type = if is_album { "Album" } else { "Playlist" };
                            let title = if is_album { 
                                // Synthesize an album name or just use the title
                                res.title.clone()
                            } else {
                                format!("{} Mix", res.title.clone())
                            };
                            
                            let id_slug = res.title.replace(|c: char| !c.is_alphanumeric() && c != ' ', "").replace(' ', "-");
                            items.push(StaticPlaylist {
                                id: format!("discovery-{}-{}-{}", p_type.to_lowercase(), id_slug, res.id),
                                title,
                                description: Some(if is_album { "Album".to_string() } else { format!("Made for you • {}", artist) }),
                                cover_url: Some(cover_url),
                                creator: Some(artist),
                                tracks: Vec::new(),
                                playlist_type: p_type.to_string(),
                            });
                        }
                    }
                    
                    if !items.is_empty() {
                        all_data.insert(category.to_string(), items);
                    }
                }
            }

            // Also load artists
             let artists_query = "ytmusicsearch30:V-Pop Official Channel";
            if let Ok(o) = Command::new(&path)
                .args(&["--js-runtimes", "node", &artists_query, "--dump-json", "--flat-playlist"])
                .output() {
                let mut items = Vec::new();
                for line in String::from_utf8_lossy(&o.stdout).lines() {
                     if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                         if res.id.starts_with("UC") {
                             let cover_url = res.thumbnails.last().map(|t| t.url.clone()).unwrap_or_default();
                             let artist = res.title.replace(" - Topic", "");
                              let id_slug = artist.replace(|c: char| !c.is_alphanumeric() && c != ' ', "").replace(' ', "-");
                              items.push(StaticPlaylist {
                                 id: format!("discovery-artist-{}-{}", id_slug, res.id),
                                title: artist.clone(),
                                description: Some("Artist".to_string()),
                                cover_url: Some(cover_url),
                                creator: Some("Artist".to_string()),
                                tracks: Vec::new(),
                                playlist_type: "Artist".to_string(),
                            });
                         }
                     }
                }
                if !items.is_empty() {
                    all_data.insert("Popular Artists".to_string(), items);
                }
            }

            println!("Background preloader finished loading {} categories!", all_data.len());
            let mut cache = cache_arc.write().await;
            *cache = all_data;
    }

    pub async fn search_tracks(&self, query: &str) -> Result<Vec<Track>, String> {
        // 1. Check Cache
        {
            let cache = self.search_cache.read().await;
            if let Some(item) = cache.get(query) {
                if item.timestamp.elapsed() < Duration::from_secs(3600) {
                    println!("Cache Hit: {}", query);
                    return Ok(item.tracks.clone());
                }
            }
        }

        let path = Self::yt_dlp_path();
        let search_query = format!("ytsearch20:{} audio", query);

        let output = match Command::new(&path)
            .args(&["--js-runtimes", "node", &search_query, "--dump-json", "--no-playlist", "--flat-playlist"])
            .output() {
            Ok(o) => o,
            Err(e) => return Err(format!("Failed to execute yt-dlp: {}", e)),
        };

        if !output.status.success() {
            return Err(format!("Search failed. stderr: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut tracks = Vec::new();

        for line in stdout.lines() {
            if line.trim().is_empty() {
                continue;
            }

            if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                let duration = res.duration.unwrap_or(0.0);
                
                // FILTER: channel, playlist, short, long, or ZERO duration
                                if res.id.starts_with("UC") || res.id.starts_with("PL") || duration < 1.0 || duration > 1200.0 {
                                    continue;
                                }

                let artist = res.uploader.replace(" - Topic", "");
                
                // Select thumbnail
                let mut cover_url = String::new();
                if !res.thumbnails.is_empty() {
                    let mut best_score = -1.0;
                    
                    for thumb in &res.thumbnails {
                        let w = thumb.width.unwrap_or(0) as f64;
                        let h = thumb.height.unwrap_or(0) as f64;
                        
                        if w == 0.0 || h == 0.0 { continue; }
                        
                        let ratio = w / h;
                        let diff = (ratio - 1.0).abs();
                        let mut score = w * h;
                        
                        if diff < 0.1 {
                            score *= 10.0;
                        }
                        
                        if score > best_score {
                            best_score = score;
                            cover_url = thumb.url.clone();
                        }
                    }
                    
                    if cover_url.is_empty() {
                        cover_url = res.thumbnails.last().unwrap().url.clone();
                    }
                } else {
                    cover_url = format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", res.id);
                }

                tracks.push(Track {
                    id: res.id.clone(),
                    title: res.title.clone(),
                    artist,
                    album: "YouTube Music".to_string(),
                    duration: duration as i32,
                    cover_url,
                    url: format!("/api/stream/{}", res.id),
                });
            }
        }

        // 2. Save cache
        if !tracks.is_empty() {
            let mut cache = self.search_cache.write().await;
            cache.insert(query.to_string(), CacheItem {
                tracks: tracks.clone(),
                timestamp: Instant::now(),
            });
        }

        Ok(tracks)
    }

    pub fn get_stream_url(&self, video_url: &str) -> Result<String, String> {
        let target_url = if video_url.starts_with("http") {
            video_url.to_string()
        } else {
            format!("https://www.youtube.com/watch?v={}", video_url)
        };
        
        let video_id = Self::extract_id(&target_url);
        
        // Already downloaded? (just check if anything starts with id in temp dir)
        if let Ok(entries) = fs::read_dir(&self.download_dir) {
            for entry in entries.flatten() {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.starts_with(&format!("{}.", video_id)) {
                        return Ok(entry.path().to_string_lossy().into_owned());
                    }
                }
            }
        }
        
        let output = match Command::new(Self::yt_dlp_path())
            .current_dir(&self.download_dir)
            .args(&["--js-runtimes", "node", "-f", "bestaudio/best", "--output", &format!("{}.%(ext)s", video_id), &target_url])
            .output() {
            Ok(o) => o,
            Err(e) => {
                println!("[Stream] yt-dlp spawn error: {}", e);
                return Err(format!("Download spawn failed: {}", e));
            }
        };
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("[Stream] yt-dlp download failed: {}", stderr);
             return Err(format!("Download failed. stderr: {}", stderr));
        }
        
        // Find downloaded file again
        if let Ok(entries) = fs::read_dir(&self.download_dir) {
            for entry in entries.flatten() {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.starts_with(&format!("{}.", video_id)) {
                        return Ok(entry.path().to_string_lossy().into_owned());
                    }
                }
            }
        }
        
        Err("File not found after download".to_string())
    }
    
    pub async fn search_artist(&self, query: &str) -> Result<String, String> {
        // Check cache first for quick response
        {
            let cache = self.search_cache.read().await;
            if let Some(cached) = cache.get(query) {
                if let Some(track) = cached.tracks.first() {
                    if !track.cover_url.is_empty() {
                        return Ok(track.cover_url.clone());
                    }
                }
            }
        }

        // Try to fetch actual artist photo from YouTube
        let path = Self::yt_dlp_path();
        let search_query = format!("ytsearch5:{} artist", query);
        
        let output = Command::new(&path)
            .args(&[&search_query, "--dump-json", "--flat-playlist"])
            .output();
        
        if let Ok(o) = output {
            let stdout = String::from_utf8_lossy(&o.stdout);
            for line in stdout.lines() {
                if line.trim().is_empty() {
                    continue;
                }
                if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                    // Get the video thumbnail which often has the artist
                    if let Some(thumb) = res.thumbnails.last() {
                        if !thumb.url.is_empty() {
                            // Convert to higher quality thumbnail
                            let high_quality = thumb.url.replace("hqdefault", "maxresdefault");
                            return Ok(high_quality);
                        }
                    }
                }
            }
        }
        
        // Fallback to placeholder if no real photo found
        Ok(self.get_placeholder_image(query))
    }

    fn extract_id(url: &str) -> String {
        // If URL contains v= parameter, extract from there first
        if url.contains("v=") {
            let parts: Vec<&str> = url.split("v=").collect();
            if parts.len() > 1 {
                let video_part = parts[1].split('&').next().unwrap_or("");
                
                // Check if the extracted part is a discovery ID
                if video_part.starts_with("discovery-") || video_part.starts_with("artist-") {
                    // Extract actual video ID from the discovery ID
                    let sub_parts: Vec<&str> = video_part.split('-').collect();
                    
                    // Look for the last part that looks like a YouTube video ID (11 chars)
                    for part in sub_parts.iter().rev() {
                        if part.len() == 11 && part.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
                            return part.to_string();
                        }
                    }
                    
                    // If no 11-char ID found, return the last part
                    if let Some(last_part) = sub_parts.last() {
                        return last_part.to_string();
                    }
                }
                
                return video_part.to_string();
            }
        }
        
        // Handle discovery-album-* format IDs (frontend sends full ID, video ID is at end)
        if url.starts_with("discovery-") || url.starts_with("artist-") {
            // Video ID is the last segment that matches YouTube video ID format
            // It could be 11 chars (e.g., "abc123ABC45") or could be split
            let parts: Vec<&str> = url.split('-').collect();
            
            // First, try to find a single 11-char YouTube ID
            for part in parts.iter().rev() {
                if part.len() == 11 && part.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
                    return part.to_string();
                }
            }
            
            // If not found, try combining last two parts (in case ID was split)
            if parts.len() >= 2 {
                let last = parts.last().unwrap();
                let second_last = parts.get(parts.len() - 2).unwrap();
                let combined = format!("{}-{}", second_last, last);
                if combined.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
                    return combined;
                }
            }
            
            // Fallback: just use the last part
            if let Some(last_part) = parts.last() {
                return last_part.to_string();
            }
        }
        
        url.to_string()
    }

    pub async fn get_recommendations(
        &self,
        seed: &str,
        seed_type: &str,
        limit: usize,
    ) -> Result<crate::api::Recommendations, String> {
        // Generate recommendations based on seed type
        let mut tracks = Vec::new();
        let mut albums = Vec::new();
        let mut playlists = Vec::new();
        let mut artists = Vec::new();

        // Extract artist name from seed for related searches
        let artist_name = if seed_type == "track" {
            // Try to extract artist from track title (format: "Artist - Title")
            if seed.contains(" - ") {
                seed.split(" - ").next().unwrap_or(seed).to_string()
            } else {
                seed.to_string()
            }
        } else {
            seed.to_string()
        };

        // Search for related tracks
        let search_query = if seed_type == "track" {
            format!("{} similar", artist_name)
        } else if seed_type == "album" {
            format!("{} album similar", artist_name)
        } else if seed_type == "playlist" {
            format!("{} playlist mix", artist_name)
        } else {
            format!("{} music similar", artist_name)
        };

        // Get tracks from search - use more specific queries for similar artists
        let search_queries = if seed_type == "artist" {
            vec![
                format!("similar artists to {}", artist_name),
                format!("like {}", artist_name),
                format!("fans of {}", artist_name),
            ]
        } else {
            vec![search_query]
        };

        // PARALLEL SEARCH - Run all queries concurrently
        let search_results = join_all(
            search_queries.iter().map(|q| self.search_tracks(q))
        ).await;

        for result in search_results {
            if tracks.len() >= limit {
                break;
            }
            if let Ok(search_tracks) = result {
                for track in search_tracks {
                    if tracks.len() >= limit {
                        break;
                    }
                    // For artist type, skip tracks by the same artist
                    if seed_type == "artist" && 
                       track.artist.to_lowercase() == artist_name.to_lowercase() {
                        continue;
                    }
                    // Skip exact duplicates
                    if !tracks.iter().any(|t: &crate::models::Track| t.id == track.id) {
                        tracks.push(track);
                    }
                }
            }
        }

        // If still no tracks, try a broader search
        if tracks.is_empty() {
            if let Ok(search_tracks) = self.search_tracks(&artist_name).await {
                for track in search_tracks.iter().take(5) {
                    if !track.artist.to_lowercase().contains(&artist_name.to_lowercase()) {
                        tracks.push(track.clone());
                    }
                }
            }
        }

        // Generate album suggestions from track data
        let mut seen_albums = std::collections::HashSet::new();
        for track in &tracks {
            if albums.len() >= 10 {
                break;
            }
            let album_key = format!("{}:{}", track.artist, track.album);
            if !seen_albums.contains(&album_key) && !track.album.is_empty() {
                seen_albums.insert(album_key);
                albums.push(crate::api::AlbumSuggestion {
                    id: format!("discovery-album-{}-{}", 
                        track.album.replace(|c: char| !c.is_alphanumeric() && c != ' ', "-"),
                        track.id),
                    title: track.album.clone(),
                    artist: track.artist.clone(),
                    cover_url: track.cover_url.clone(),
                });
            }
        }

        // Generate playlist suggestions - PARALLEL
        let playlist_queries = vec![
            format!("{} Mix", artist_name),
            format!("{} Radio", artist_name),
            format!("{} Top Hits", artist_name),
        ];

        let playlist_results = join_all(
            playlist_queries.iter().map(|q| self.search_tracks(q))
        ).await;

        for (query, result) in playlist_queries.iter().zip(playlist_results) {
            if playlists.len() >= 10 {
                break;
            }
            if let Ok(results) = result {
                if let Some(track) = results.first() {
                    playlists.push(crate::api::PlaylistSuggestion {
                        id: format!("discovery-playlist-{}-{}", 
                            query.replace(|c: char| !c.is_alphanumeric() && c != ' ', "-"),
                            track.id),
                        title: query.clone(),
                        cover_url: track.cover_url.clone(),
                        track_count: results.len().min(20),
                    });
                }
            }
        }

        // Generate artist suggestions from track data
        // Use placeholder images directly - YouTube thumbnails are video covers, not artist photos
        let mut seen_artists = std::collections::HashSet::new();
        for track in &tracks {
            if artists.len() >= 10 {
                break;
            }
            if !seen_artists.contains(&track.artist) && !track.artist.is_empty() {
                seen_artists.insert(track.artist.clone());
                // Use placeholder image - instant and always works
                let photo_url = self.get_placeholder_image(&track.artist);
                artists.push(crate::api::ArtistSuggestion {
                    id: format!("artist-{}", track.artist.replace(|c: char| !c.is_alphanumeric() && c != ' ', "-")),
                    name: track.artist.clone(),
                    photo_url,
                });
            }
        }

        Ok(crate::api::Recommendations {
            tracks,
            albums,
            playlists,
            artists,
        })
    }
}
