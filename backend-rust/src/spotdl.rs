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
    pub browse_cache: Arc<RwLock<HashMap<String, HashMap<String, Vec<StaticPlaylist>>>>>,
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

    pub fn yt_dlp_path_static() -> String {
        Self::yt_dlp_path()
    }

    fn yt_dlp_path() -> String {
        // Use the updated binary we downloaded
        let updated_path = "/tmp/yt-dlp";
        if Path::new(updated_path).exists() {
            return updated_path.to_string();
        }
        
        // Windows: Check user Scripts folder
        if cfg!(windows) {
            // 1. Check LOCALAPPDATA (for Windows Store python and local installs)
            if let Ok(local_appdata) = env::var("LOCALAPPDATA") {
                let local_path = Path::new(&local_appdata);
                
                // Try scanning Packages for Windows Store python
                let packages_dir = local_path.join("Packages");
                if let Ok(entries) = fs::read_dir(&packages_dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().into_owned();
                        if name.starts_with("PythonSoftwareFoundation.Python.") {
                            let local_pkgs = entry.path().join("LocalCache").join("local-packages");
                            if let Ok(subentries) = fs::read_dir(&local_pkgs) {
                                for subentry in subentries.flatten() {
                                    let subname = subentry.file_name().to_string_lossy().into_owned();
                                    if subname.starts_with("Python") {
                                        let candidate = subentry.path().join("Scripts").join("yt-dlp.exe");
                                        if candidate.exists() {
                                            println!("Dynamic Path Resolution: Found yt-dlp.exe at {:?}", candidate);
                                            return candidate.to_string_lossy().into_owned();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Check classic Local AppData Programs path
                let programs_path = local_path.join("Programs").join("Python");
                if let Ok(entries) = fs::read_dir(&programs_path) {
                    for entry in entries.flatten() {
                        let candidate = entry.path().join("Scripts").join("yt-dlp.exe");
                        if candidate.exists() {
                            println!("Dynamic Path Resolution: Found local programs yt-dlp.exe at {:?}", candidate);
                            return candidate.to_string_lossy().into_owned();
                        }
                    }
                }
            }

            // 2. Check APPDATA (Roaming) scripts folder
            if let Ok(appdata) = env::var("APPDATA") {
                let roaming_path = Path::new(&appdata).join("Python");
                if let Ok(entries) = fs::read_dir(&roaming_path) {
                    for entry in entries.flatten() {
                        let candidate = entry.path().join("Scripts").join("yt-dlp.exe");
                        if candidate.exists() {
                            println!("Dynamic Path Resolution: Found roaming yt-dlp.exe at {:?}", candidate);
                            return candidate.to_string_lossy().into_owned();
                        }
                    }
                }
            }
        }
        
        "yt-dlp".to_string()
    }
    
    fn js_runtime_args() -> Vec<String> {
        vec!["--js-runtimes".to_string(), "nodejs".to_string()]
    }

    pub fn start_background_preload(&self) {
        // Preload is disabled to avoid blocking the server.
        // Browse content will be loaded on demand when first requested.
        println!("Background preload disabled. Content will load on demand.");
    }

    pub async fn ensure_country_cached(&self, country: &str) {
        let country = country.to_uppercase();
        let needs_fetch = {
            let cache = self.browse_cache.read().await;
            !cache.contains_key(&country)
        };

        if needs_fetch {
            println!("Country {} not cached. Triggering lazy preload.", country);
            
            // Check if we have VN cached to use as temporary placeholder
            let placeholder = {
                let cache = self.browse_cache.read().await;
                cache.get("VN").cloned()
            };

            if let Some(data) = placeholder {
                let mut cache = self.browse_cache.write().await;
                cache.insert(country.clone(), data);
            }

            // Spawn dynamic preload
            let cache_arc = self.browse_cache.clone();
            let country_task = country.clone();
            tokio::spawn(async move {
                Self::fetch_browse_content(&country_task, &cache_arc).await;
            });
        }
    }

    fn get_queries_for_country(country: &str) -> Vec<(&'static str, String)> {
        match country {
            "VN" => vec![
                ("Top Albums", "ytsearch50:Top Albums Vietnam audio".to_string()),
                ("Viral Hits Vietnam", "ytsearch30:Viral Hits Vietnam audio".to_string()),
                ("Lofi Chill Vietnam", "ytsearch30:Lofi Chill Vietnam audio".to_string()),
                ("US UK Top Hits", "ytsearch30:US UK Billboard Hot 100 audio".to_string()),
                ("K-Pop ON!", "ytsearch30:K-Pop Top Hits audio".to_string()),
                ("Rap Viet", "ytsearch30:Rap Viet Mix audio".to_string()),
                ("Indie Vietnam", "ytsearch30:Indie Vietnam audio".to_string()),
                ("V-Pop Rising", "ytsearch30:V-Pop Rising audio".to_string()),
                ("Trending Music", "ytsearch30:Trending Music Vietnam audio".to_string()),
                ("Acoustic Thu Gian", "ytsearch30:Acoustic Thu Gian audio".to_string()),
                ("Workout Energy", "ytsearch30:Workout Energy Mix audio".to_string()),
                ("Sleep Sounds", "ytsearch30:Sleep Sounds music audio".to_string()),
                ("Party Anthems", "ytsearch30:Party Anthems Mix audio".to_string()),
                ("Piano Focus", "ytsearch30:Piano Focus music audio".to_string()),
                ("Gaming Music", "ytsearch30:Gaming Music Mix audio".to_string()),
            ],
            "US" | "GB" | "CA" | "AU" => vec![
                ("Top Albums", "ytsearch50:Top Albums USA Billboard audio".to_string()),
                ("Viral Hits", "ytsearch30:Viral Hits USA audio".to_string()),
                ("Lofi Chill", "ytsearch30:Lofi Chill Beats audio".to_string()),
                ("US UK Top Hits", "ytsearch30:US UK Billboard Hot 100 audio".to_string()),
                ("K-Pop ON!", "ytsearch30:K-Pop Top Hits audio".to_string()),
                ("Trending Music", "ytsearch30:Trending Music USA audio".to_string()),
                ("Workout Energy", "ytsearch30:Workout Energy Mix audio".to_string()),
                ("Sleep Sounds", "ytsearch30:Sleep Sounds music audio".to_string()),
                ("Party Anthems", "ytsearch30:Party Anthems Mix audio".to_string()),
                ("Piano Focus", "ytsearch30:Piano Focus music audio".to_string()),
                ("Gaming Music", "ytsearch30:Gaming Music Mix audio".to_string()),
            ],
            _ => {
                let search_query = format!("ytsearch30:Trending Music {} audio", country);
                vec![
                    ("Top Albums", format!("ytsearch50:Top Albums {} audio", country)),
                    ("Viral Hits", format!("ytsearch30:Viral Hits {} audio", country)),
                    ("Lofi Chill", "ytsearch30:Lofi Chill Beats audio".to_string()),
                    ("US UK Top Hits", "ytsearch30:US UK Billboard Hot 100 audio".to_string()),
                    ("K-Pop ON!", "ytsearch30:K-Pop Top Hits audio".to_string()),
                    ("Trending Music", search_query),
                    ("Workout Energy", "ytsearch30:Workout Energy Mix audio".to_string()),
                    ("Sleep Sounds", "ytsearch30:Sleep Sounds music audio".to_string()),
                    ("Party Anthems", "ytsearch30:Party Anthems Mix audio".to_string()),
                    ("Piano Focus", "ytsearch30:Piano Focus music audio".to_string()),
                    ("Gaming Music", "ytsearch30:Gaming Music Mix audio".to_string()),
                ]
            }
        }
    }

    async fn fetch_browse_content(country: &str, cache_arc: &Arc<RwLock<HashMap<String, HashMap<String, Vec<StaticPlaylist>>>>>) {
        let country = country.to_uppercase();
        let queries = Self::get_queries_for_country(&country);

        let path = Self::yt_dlp_path();
        let mut all_data: HashMap<String, Vec<StaticPlaylist>> = HashMap::new();

        for (category, search_query) in queries {
            let mut cmd_args = Self::build_yt_dlp_base_args_vec();
            cmd_args.push(search_query);
            cmd_args.push("--dump-json".to_string());
            cmd_args.push("--no-playlist".to_string());
            cmd_args.push("--flat-playlist".to_string());
            
            let output = Command::new(&path)
                .args(&cmd_args)
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
                        
                        let is_album = category == "Top Albums";
                        let p_type = if is_album { "Album" } else { "Playlist" };
                        let title = if is_album { 
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
        let artists_query = match country.as_str() {
            "VN" => "ytmusicsearch30:V-Pop Official Channel",
            "US" | "GB" | "CA" | "AU" => "ytmusicsearch30:Pop Official Channel",
            _ => "ytmusicsearch30:Official Channel",
        };
        
        let mut artist_cmd_args = Self::build_yt_dlp_base_args_vec();
        artist_cmd_args.push(artists_query.to_string());
        artist_cmd_args.push("--dump-json".to_string());
        artist_cmd_args.push("--flat-playlist".to_string());
        
        if let Ok(o) = Command::new(&path)
            .args(&artist_cmd_args)
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

        println!("Background preloader finished loading {} categories for country {}!", all_data.len(), country);
        let mut cache = cache_arc.write().await;
        cache.insert(country.to_string(), all_data);
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
        let search_query = format!("ytsearch30:{} audio", query);

        let output_args = vec![
            search_query.as_str(), "--dump-json", "--no-playlist", "--flat-playlist",
        ];
        let all_args = self.yt_dlp_args_with_cookies_vec(&output_args);

        // Retry up to 2 times with backoff for transient 429 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let output = match Command::new(&path).args(&all_args).output() {
                Ok(o) => o,
                Err(e) => return Err(format!("Failed to execute yt-dlp: {}", e)),
            };

            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut tracks = Vec::new();

                for line in stdout.lines() {
                    if line.trim().is_empty() { continue; }
                    if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                        let duration = res.duration.unwrap_or(0.0);
                        if res.id.starts_with("UC") || res.id.starts_with("PL") || duration < 1.0 || duration > 1200.0 {
                            continue;
                        }
                        let artist = res.uploader.replace(" - Topic", "");
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
                                if diff < 0.1 { score *= 10.0; }
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
                            view_count: res.view_count,
                            like_count: res.like_count,
                            comment_count: res.comment_count,
                            bitrate: res.abr.map(|b| b as i32),
                            codec: res.acodec,
                        });
                    }
                }

                if !tracks.is_empty() {
                    let mut cache = self.search_cache.write().await;
                    cache.insert(query.to_string(), CacheItem {
                        tracks: tracks.clone(),
                        timestamp: Instant::now(),
                    });
                }
                return Ok(tracks);
            }

            let stderr = String::from_utf8_lossy(&output.stderr);
            last_err = stderr.to_string();
            let is_rate_limit = stderr.contains("429") || stderr.contains("Too Many Requests");
            if is_rate_limit && attempt < 2 {
                let delay_secs = (attempt + 1) * 3;
                println!("[Search] Rate limited on attempt {}, retrying in {}s...", attempt + 1, delay_secs);
                tokio::time::sleep(Duration::from_secs(delay_secs as u64)).await;
            } else {
                break;
            }
        }

        Err(format!("Search failed after retries. stderr: {}", last_err))
    }

    /// Fetch real YouTube Music chart tracks from a chart playlist URL.
    /// `chart_url` is a music.youtube.com playlist link (e.g. https://music.youtube.com/playlist?list=PL...)
    pub async fn fetch_chart_tracks(&self, chart_url: &str, limit: usize) -> Result<Vec<Track>, String> {
        let cache_key = chart_url.to_string();
        {
            let cache = self.search_cache.read().await;
            if let Some(item) = cache.get(&cache_key) {
                if item.timestamp.elapsed() < Duration::from_secs(1800) {
                    println!("Cache Hit (chart): {}", chart_url);
                    return Ok(item.tracks.clone());
                }
            }
        }

        let path = Self::yt_dlp_path();
        let output_args = vec![
            chart_url, "--dump-json", "--flat-playlist",
        ];
        let all_args = self.yt_dlp_args_with_cookies_vec(&output_args);

        let mut last_err = String::new();
        for attempt in 0..3 {
            let output = match Command::new(&path).args(&all_args).output() {
                Ok(o) => o,
                Err(e) => return Err(format!("Failed to execute yt-dlp: {}", e)),
            };

            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut tracks = Vec::new();

                for line in stdout.lines() {
                    if line.trim().is_empty() { continue; }
                    if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                        let duration = res.duration.unwrap_or(0.0);
                        // Skip channels/playlists and odd durations
                        if res.id.starts_with("UC") || res.id.starts_with("PL") || duration < 1.0 || duration > 1200.0 {
                            continue;
                        }
                        let artist = res.uploader.replace(" - Topic", "");
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
                                if diff < 0.1 { score *= 10.0; }
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
                            view_count: res.view_count,
                            like_count: res.like_count,
                            comment_count: res.comment_count,
                            bitrate: res.abr.map(|b| b as i32),
                            codec: res.acodec,
                        });
                        if tracks.len() >= limit { break; }
                    }
                }

                if !tracks.is_empty() {
                    let mut cache = self.search_cache.write().await;
                    cache.insert(cache_key, CacheItem {
                        tracks: tracks.clone(),
                        timestamp: Instant::now(),
                    });
                }
                return Ok(tracks);
            }

            let stderr = String::from_utf8_lossy(&output.stderr);
            last_err = stderr.to_string();
            let is_rate_limit = stderr.contains("429") || stderr.contains("Too Many Requests");
            if is_rate_limit && attempt < 2 {
                let delay_secs = (attempt + 1) * 3;
                println!("[Chart] Rate limited on attempt {}, retrying in {}s...", attempt + 1, delay_secs);
                tokio::time::sleep(Duration::from_secs(delay_secs as u64)).await;
            } else {
                break;
            }
        }

        Err(format!("Chart fetch failed after retries. stderr: {}", last_err))
    }

    /// Fetch tracks of a YouTube Music album/playlist by its browse ID.
    /// Handles: MPRE... (album -> music.youtube.com/browse/), VLPL... (strip VL -> youtube.com/playlist), PL... (direct).
    pub async fn fetch_collection_tracks(&self, id: &str, limit: usize) -> Result<Vec<Track>, String> {
        let collection_id = id.trim().to_string();
        if collection_id.is_empty() {
            return Err("Empty collection id".to_string());
        }

        // Resolve to a yt-dlp friendly URL
        let url = if collection_id.starts_with("MPRE") {
            format!("https://music.youtube.com/browse/{}", collection_id)
        } else if collection_id.starts_with("VLPL") {
            format!("https://www.youtube.com/playlist?list={}", collection_id.trim_start_matches("VL"))
        } else if collection_id.starts_with("PL") || collection_id.starts_with("OLAK") || collection_id.starts_with("RD") {
            format!("https://music.youtube.com/playlist?list={}", collection_id)
        } else {
            return Err(format!("Unsupported collection id: {}", collection_id));
        };

        // Reuse chart playlist fetching (same yt-dlp flow)
        self.fetch_chart_tracks(&url, limit).await
    }

    fn cookies_file_path() -> PathBuf {
        if let Ok(env_path) = env::var("COOKIE_FILE") {
            let p = PathBuf::from(&env_path);
            if p.exists() {
                return p;
            }
        }
        let docker_path = PathBuf::from("/app/cookies.txt");
        if docker_path.exists() {
            return docker_path;
        }
        PathBuf::from("cookies.txt")
    }

    pub fn build_yt_dlp_base_args_vec() -> Vec<String> {
        let mut args = vec![];

        args.push("--js-runtimes".to_string());
        args.push("nodejs".to_string());

        let cookie_path = Self::cookies_file_path();
        if cookie_path.exists() {
            args.push("--cookies".to_string());
            args.push(cookie_path.to_string_lossy().into_owned());
        }

        args
    }

    fn yt_dlp_args_with_cookies_vec(&self, extra_args: &[&str]) -> Vec<String> {
        let mut args = Self::build_yt_dlp_base_args_vec();
        for arg in extra_args {
            args.push(arg.to_string());
        }
        args
    }

    pub fn get_stream_url(&self, video_url: &str) -> Result<String, String> {
        let target_url = if video_url.starts_with("http") {
            video_url.to_string()
        } else {
            format!("https://www.youtube.com/watch?v={}", video_url)
        };
        
        let video_id = Self::extract_id(&target_url);
        
        if let Ok(entries) = fs::read_dir(&self.download_dir) {
            for entry in entries.flatten() {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.starts_with(&format!("{}.", video_id)) {
                        return Ok(entry.path().to_string_lossy().into_owned());
                    }
                }
            }
        }

        let output_pattern = format!("{}.%(ext)s", video_id);
        let output_args = vec![
            "-f", "bestaudio/best",
            "--output", &output_pattern,
            &target_url,
        ];
        let all_args = self.yt_dlp_args_with_cookies_vec(&output_args);
        
        // Retry up to 2 times with backoff for transient 429 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let output = match Command::new(Self::yt_dlp_path())
                .current_dir(&self.download_dir)
                .args(&all_args)
                .output() {
                Ok(o) => o,
                Err(e) => {
                    println!("[Stream] yt-dlp spawn error: {}", e);
                    return Err(format!("Download spawn failed: {}", e));
                }
            };
            
            if output.status.success() {
                if let Ok(entries) = fs::read_dir(&self.download_dir) {
                    for entry in entries.flatten() {
                        if let Some(file_name) = entry.file_name().to_str() {
                            if file_name.starts_with(&format!("{}.", video_id)) {
                                return Ok(entry.path().to_string_lossy().into_owned());
                            }
                        }
                    }
                }
                return Err("File not found after download".to_string());
            }
            
            let stderr = String::from_utf8_lossy(&output.stderr);
            last_err = stderr.to_string();
            println!("[Stream] yt-dlp download failed (attempt {}): {}", attempt + 1, stderr);
            
            let is_rate_limit = stderr.contains("429") || stderr.contains("Too Many Requests");
            if is_rate_limit && attempt < 2 {
                let delay_secs = (attempt + 1) * 5;
                println!("[Stream] Rate limited, retrying in {}s...", delay_secs);
                std::thread::sleep(Duration::from_secs(delay_secs as u64));
            } else {
                break;
            }
        }
        
        Err(format!("Download failed. stderr: {}", last_err))
    }
    
    pub async fn search_artist(&self, query: &str) -> Result<String, String> {
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

        let path = Self::yt_dlp_path();
        let search_query = format!("ytsearch5:{} artist", query);
        
        let artist_search_args = vec![
            search_query.as_str(), "--dump-json", "--flat-playlist",
        ];
        let all_args = self.yt_dlp_args_with_cookies_vec(&artist_search_args);
        
        let output = Command::new(&path)
            .args(&all_args)
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

        // Generate artist suggestions from track data with real photos
        let mut seen_artists = std::collections::HashSet::new();
        let mut unique_artist_names = Vec::new();
        for track in &tracks {
            if unique_artist_names.len() >= 10 {
                break;
            }
            if !seen_artists.contains(&track.artist) && !track.artist.is_empty() {
                seen_artists.insert(track.artist.clone());
                unique_artist_names.push(track.artist.clone());
            }
        }

        // Fetch real artist photos concurrently
        let photo_results = join_all(
            unique_artist_names.iter().map(|name| self.search_artist(name))
        ).await;

        for (name, photo_result) in unique_artist_names.iter().zip(photo_results) {
            let photo_url = photo_result.unwrap_or_else(|_| self.get_placeholder_image(name));
            artists.push(crate::api::ArtistSuggestion {
                id: format!("artist-{}", name.replace(|c: char| !c.is_alphanumeric() && c != ' ', "-")),
                name: name.clone(),
                photo_url,
            });
        }

        Ok(crate::api::Recommendations {
            tracks,
            albums,
            playlists,
            artists,
        })
    }
}
