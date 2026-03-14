use std::process::Command;
use std::path::{Path, PathBuf};
use std::env;
use std::fs;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::{Instant, Duration};

use crate::models::{Track, YTResult, StaticPlaylist};

struct CacheItem {
    tracks: Vec<Track>,
    timestamp: Instant,
}

#[derive(Clone)]
pub struct SpotdlService {
    download_dir: PathBuf,
    search_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
    pub browse_cache: Arc<RwLock<HashMap<String, Vec<StaticPlaylist>>>>,
}

impl SpotdlService {
    pub fn new() -> Self {
        let temp_dir = env::temp_dir();
        let download_dir = temp_dir.join("spotify-clone-cache");
        let _ = fs::create_dir_all(&download_dir);

        Self {
            download_dir,
            search_cache: Arc::new(RwLock::new(HashMap::new())),
            browse_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn yt_dlp_path() -> String {
        // Try local
        if let Ok(exe_path) = env::current_exe() {
            if let Some(dir) = exe_path.parent() {
                let local = dir.join("yt-dlp.exe");
                if local.exists() {
                    return local.to_string_lossy().into_owned();
                }
            }
        }
        
        // Try working dir
        if Path::new("yt-dlp.exe").exists() {
            return "./yt-dlp.exe".to_string();
        }

        // Try Python
        if let Ok(home) = env::var("USERPROFILE") {
            let py_path = Path::new(&home).join("AppData").join("Local").join("Programs").join("Python").join("Python312").join("Scripts").join("yt-dlp.exe");
            if py_path.exists() {
                return py_path.to_string_lossy().into_owned();
            }
        }

        "yt-dlp".to_string()
    }

    pub fn start_background_preload(&self) {
        let cache_arc = self.browse_cache.clone();
        
        tokio::spawn(async move {
            println!("Background preloader started... fetching Top Albums & Playlists");
            let queries = vec![
                ("Top Albums", "ytsearch50:Top Albums Vietnam audio"),
                ("Viral Hits", "ytsearch30:Viral Hits Vietnam audio"),
                ("Lofi Chill", "ytsearch30:Lofi Chill Vietnam audio"),
                ("US UK Top Hits", "ytsearch30:US UK Billboard Hot 100 audio"),
                ("K-Pop", "ytsearch30:K-Pop Top Hits audio"),
            ];

            let path = Self::yt_dlp_path();
            let mut all_data: HashMap<String, Vec<StaticPlaylist>> = HashMap::new();

            for (category, search_query) in queries {
                let output = Command::new(&path)
                    .args(&[&search_query, "--dump-json", "--no-playlist", "--flat-playlist"])
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
            let artists_query = "ytsearch30:V-Pop Official Channel";
            if let Ok(o) = Command::new(&path)
                .args(&[&artists_query, "--dump-json", "--flat-playlist"])
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
        });
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
            .args(&[&search_query, "--dump-json", "--no-playlist", "--flat-playlist"])
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
            .args(&["-f", "bestaudio[ext=m4a]/bestaudio", "--output", &format!("{}.%(ext)s", video_id), &target_url])
            .output() {
            Ok(o) => o,
            Err(e) => return Err(format!("Download spawn failed: {}", e)),
        };

        if !output.status.success() {
             return Err(format!("Download failed. stderr: {}", String::from_utf8_lossy(&output.stderr)));
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

    pub fn search_artist(&self, query: &str) -> Result<String, String> {
        let path = Self::yt_dlp_path();
        
        // Search specifically for official channel to get the avatar
        let search_query = format!("ytsearch1:{} official channel", query);

        let output = match Command::new(&path)
            .args(&[&search_query, "--dump-json", "--flat-playlist"])
            .output() {
            Ok(o) => o,
            Err(_) => return Err("Search failed to execute".to_string()),
        };

        let stdout = String::from_utf8_lossy(&output.stdout);
        
        #[derive(serde::Deserialize)]
        struct SimpleYT {
            id: String,
            #[serde(default)]
            thumbnails: Vec<crate::models::YTThumbnail>,
        }

        for line in stdout.lines() {
            if let Ok(res) = serde_json::from_str::<SimpleYT>(line) {
                // If it's a channel (starts with UC), use its avatar
                if res.id.starts_with("UC") {
                    let best_thumb = res.thumbnails.iter().max_by_key(|t| {
                        let w = t.width.unwrap_or(0);
                        let h = t.height.unwrap_or(0);
                        w * h
                    });
                    
                    if let Some(thumb) = best_thumb {
                        return Ok(thumb.url.clone());
                    }
                }
            }
        }

        // Fallback: If no channel found, try searching normally but stay alert for channel icons
        Err("No authentic channel photo found for artist".to_string())
    }

    fn extract_id(url: &str) -> String {
        if url.contains("v=") {
            let parts: Vec<&str> = url.split("v=").collect();
            if parts.len() > 1 {
                let sub_parts: Vec<&str> = parts[1].split('&').collect();
                return sub_parts[0].to_string();
            }
        }
        url.to_string()
    }
}
