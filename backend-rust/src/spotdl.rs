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

/// Cookie jar shared between the reqwest client and Netscape file serialization.
/// Wraps `cookie_store::CookieStore` so we can both feed reqwest requests and
/// dump the fresh session to the yt-dlp cookies file.
pub struct SharedCookieStore {
    inner: std::sync::Mutex<cookie_store::CookieStore>,
}

impl SharedCookieStore {
    pub fn new() -> Self {
        Self {
            inner: std::sync::Mutex::new(cookie_store::CookieStore::new()),
        }
    }

    /// All unexpired cookies currently in the jar
    pub fn iter_unexpired(&self) -> Vec<cookie_store::Cookie<'static>> {
        if let Ok(inner) = self.inner.lock() {
            inner.iter_unexpired().cloned().collect()
        } else {
            Vec::new()
        }
    }
}

impl reqwest::cookie::CookieStore for SharedCookieStore {
    fn set_cookies(&self, cookie_headers: &mut dyn Iterator<Item = &reqwest::header::HeaderValue>, url: &reqwest::Url) {
        let cookies = cookie_headers
            .filter_map(|v| std::str::from_utf8(v.as_bytes()).ok())
            .filter_map(|s| cookie_store::RawCookie::parse(s).ok())
            .map(|c| c.into_owned());
        if let Ok(mut inner) = self.inner.lock() {
            inner.store_response_cookies(cookies, url);
        }
    }

    fn cookies(&self, url: &reqwest::Url) -> Option<reqwest::header::HeaderValue> {
        let inner = self.inner.lock().ok()?;
        let s = inner
            .get_request_values(url)
            .map(|(n, v)| format!("{n}={v}"))
            .collect::<Vec<_>>()
            .join("; ");
        if s.is_empty() {
            return None;
        }
        reqwest::header::HeaderValue::from_str(&s).ok()
    }
}

#[derive(Clone)]
pub struct SpotdlService {
    download_dir: PathBuf,
    yt_client: reqwest::Client,
    cookie_jar: Arc<SharedCookieStore>,
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

        // Shared cookie-aware client: keeps a persistent jar of fresh YouTube
        // session cookies so innerTube API calls avoid bot detection (429s).
        let cookie_jar = Arc::new(SharedCookieStore::new());
        let yt_client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .cookie_provider(cookie_jar.clone())
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_default();

        Self {
            download_dir,
            yt_client,
            cookie_jar,
            search_cache: Arc::new(RwLock::new(HashMap::new())),
            browse_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Shared cookie-aware HTTP client used for all direct YouTube innerTube calls.
    pub fn yt_client(&self) -> &reqwest::Client {
        &self.yt_client
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

    /// True if any cookie file (managed, COOKIE_FILE, docker, local) exists.
    pub fn has_cookies_file() -> bool {
        let managed = Self::managed_cookie_path();
        if managed.exists() {
            return true;
        }
        if let Ok(env_path) = env::var("COOKIE_FILE") {
            if PathBuf::from(&env_path).exists() {
                return true;
            }
        }
        Path::new("/app/cookies.txt").exists() || Path::new("cookies.txt").exists()
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
        vec!["--js-runtimes".to_string(), "node".to_string()]
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

        // Try IPv6 first when available; fall back to IPv4 on network errors
        let mut use_ipv6 = Self::ipv6_connectivity();

        // Retry up to 2 times with backoff for transient 429 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_flags_vec(use_ipv6, &output_args);
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
            } else if use_ipv6 && Self::is_network_error(&stderr) {
                // IPv6 unrouted/blocked - retry immediately on IPv4
                println!("[Search] IPv6 network error, falling back to IPv4: {}", stderr.trim().lines().last().unwrap_or(""));
                use_ipv6 = false;
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

        // Try IPv6 first when available; fall back to IPv4 on network errors
        let mut use_ipv6 = Self::ipv6_connectivity();

        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_flags_vec(use_ipv6, &output_args);
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
            } else if use_ipv6 && Self::is_network_error(&stderr) {
                // IPv6 unrouted/blocked - retry immediately on IPv4
                println!("[Chart] IPv6 network error, falling back to IPv4: {}", stderr.trim().lines().last().unwrap_or(""));
                use_ipv6 = false;
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

    /// Writable location for auto-refreshed cookies (persists next to users.json).
    /// Docker -> /app/data/cookies.txt (writable NAS volume), local -> data/cookies.txt.
    fn managed_cookie_path() -> PathBuf {
        if Path::new("/app/data").exists() {
            PathBuf::from("/app/data/cookies.txt")
        } else {
            PathBuf::from("data/cookies.txt")
        }
    }

    fn cookies_file_path() -> PathBuf {
        // Priority:
        // 1. Explicit COOKIE_FILE env (usually a mounted logged-in cookies.txt)
        // 2. /app/cookies.txt (docker-compose read-only mount, logged-in)
        // 3. Managed auto-refreshed file (anonymous fallback - never shadows
        //    a user-provided logged-in session)
        // 4. Local cookies.txt
        let chosen = if let Ok(env_path) = env::var("COOKIE_FILE") {
            let p = PathBuf::from(&env_path);
            if p.exists() {
                p
            } else {
                Self::cookies_file_path_fallback()
            }
        } else {
            Self::cookies_file_path_fallback()
        };
        Self::writable_cookie_copy(chosen)
    }

    fn cookies_file_path_fallback() -> PathBuf {
        let docker_path = PathBuf::from("/app/cookies.txt");
        if docker_path.exists() {
            return docker_path;
        }
        let managed = Self::managed_cookie_path();
        if managed.exists() {
            return managed;
        }
        PathBuf::from("cookies.txt")
    }

    /// yt-dlp opens the cookies file for writing (it updates session cookies).
    /// A read-only mount (docker-compose `:ro`) crashes it, so copy the file to
    /// a writable location when needed.
    fn writable_cookie_copy(path: PathBuf) -> PathBuf {
        if !path.exists() {
            return path;
        }
        let writable = std::fs::OpenOptions::new().append(true).open(&path).is_ok();
        if writable {
            return path;
        }
        let target = Self::managed_cookie_path();
        if let Some(parent) = target.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(content) = fs::read(&path) {
            if fs::write(&target, &content).is_ok() {
                println!("[Cookies] Copied read-only {} -> {} for yt-dlp", path.display(), target.display());
                return target;
            }
        }
        path
    }

    /// True when IPv6 is actually routable (not just an address assigned).
    /// Probes a well-known IPv6 endpoint with a short timeout. Override with
    /// FORCE_IPV6=1 (always) or FORCE_IPV6=0 (never).
    fn ipv6_connectivity() -> bool {
        use std::net::{SocketAddr, TcpStream};
        use std::str::FromStr;
        static IPV6_OK: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
        *IPV6_OK.get_or_init(|| {
            if let Ok(v) = env::var("FORCE_IPV6") {
                return v != "0";
            }
            // Probe: TCP connect to Google DNS over IPv6 (3s timeout). Some
            // networks assign IPv6 addresses without routing them (e.g. Synology
            // Docker), which would make --force-ipv6 hang every request.
            let Ok(addr) = SocketAddr::from_str("[2001:4860:4860::8888]:443") else {
                return false;
            };
            match TcpStream::connect_timeout(&addr, Duration::from_secs(3)) {
                Ok(_) => true,
                Err(_) => false,
            }
        })
    }

    /// True when yt-dlp stderr indicates a network-level failure (not a 429),
    /// meaning the current IP family (IPv6) is unrouted or blocked.
    fn is_network_error(stderr: &str) -> bool {
        let lower = stderr.to_lowercase();
        lower.contains("network is unreachable")
            || lower.contains("network unreachable")
            || lower.contains("cannot assign requested address")
            || lower.contains("no route to host")
            || lower.contains("connect() timed out")
            || lower.contains("connection timed out")
            || lower.contains("temporary failure in name resolution")
            || lower.contains("name or service not known")
            || lower.contains("failed to connect")
            || lower.contains("unable to connect")
            || lower.contains("error 101")
            || lower.contains("error 110")
            || lower.contains("error 111")
    }

    /// Build yt-dlp args with the IPv6 flag toggleable per attempt (for fallback).
    fn yt_dlp_args_with_flags_vec(use_ipv6: bool, extra_args: &[&str]) -> Vec<String> {
        let mut args = vec![];

        args.push("--js-runtimes".to_string());
        args.push("node".to_string());

        // Prefer IPv6 when it is actually routable - YouTube bot detection
        // blocks many IPv4 routes but allows IPv6.
        if use_ipv6 {
            args.push("--force-ipv6".to_string());
        }

        let cookie_path = Self::cookies_file_path();
        if cookie_path.exists() {
            args.push("--cookies".to_string());
            args.push(cookie_path.to_string_lossy().into_owned());
        }

        for arg in extra_args {
            args.push(arg.to_string());
        }

        args
    }

    pub fn build_yt_dlp_base_args_vec() -> Vec<String> {
        Self::yt_dlp_args_with_flags_vec(Self::ipv6_connectivity(), &[])
    }

    /// Visit YouTube anonymously through the shared cookie-aware client, collect the
    /// fresh session cookies (VISITOR_INFO1_LIVE, YSC, PREF, SOCS, ...) issued by
    /// YouTube, and persist them in Netscape format for yt-dlp.
    pub async fn refresh_cookies(&self) -> Result<String, String> {
        let urls = [
            "https://www.youtube.com/",
            "https://music.youtube.com/",
            "https://consent.youtube.com/",
        ];

        for url in urls {
            let res = self
                .yt_client
                .get(url)
                .send()
                .await
                .map_err(|e| format!("Cannot reach {}: {}", url, e))?;
            println!("[Cookies] GET {} -> HTTP {}", url, res.status().as_u16());
        }

        let cookies = self.cookie_jar.iter_unexpired();
        if cookies.is_empty() {
            return Err("YouTube did not return any cookies - possible bot detection. Try again later.".to_string());
        }

        let mut lines = vec![
            "# Netscape HTTP Cookie File".to_string(),
            "# Generated by KV Music automatic cookie refresh.".to_string(),
            "# This file is generated automatically - do not edit manually.".to_string(),
        ];

        let mut names: Vec<String> = Vec::new();
        for cookie in cookies {
            let include_sub = matches!(cookie.domain, cookie_store::CookieDomain::Suffix(_));
            let domain = match &cookie.domain {
                cookie_store::CookieDomain::HostOnly(d) => d.clone(),
                cookie_store::CookieDomain::Suffix(d) => {
                    // Netscape convention: domain cookies are written with a leading dot
                    format!(".{}", d)
                }
                _ => continue,
            };
            if domain.is_empty() {
                continue;
            }
            let path = cookie.path.as_ref().to_string();
            let secure = if cookie.secure().unwrap_or(false) { "TRUE" } else { "FALSE" };
            let expiry = match &cookie.expires {
                cookie_store::CookieExpiration::AtUtc(t) => t.unix_timestamp().to_string(),
                cookie_store::CookieExpiration::SessionEnd => "0".to_string(),
            };
            let name = cookie.name().to_string();
            let value = cookie.value().to_string();
            lines.push(format!(
                "{}\t{}\t{}\t{}\t{}\t{}\t{}",
                domain,
                if include_sub { "TRUE" } else { "FALSE" },
                path,
                secure,
                expiry,
                name,
                value
            ));
            names.push(name);
        }

        if names.is_empty() {
            return Err("YouTube did not return any usable cookies. Try again later.".to_string());
        }

        let path = Self::managed_cookie_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::write(&path, lines.join("\n")).map_err(|e| format!("Failed to write cookie file: {}", e))?;

        println!("[Cookies] Fetched {} fresh cookies -> {}", names.len(), path.display());
        Ok(format!("Đã lấy {} cookie mới từ YouTube và lưu vào {}", names.len(), path.display()))
    }

    /// Drop all in-memory caches so the next fetches re-query YouTube with the new cookies.
    pub async fn clear_caches(&self) {
        self.search_cache.write().await.clear();
        self.browse_cache.write().await.clear();
        println!("[Cookies] All caches cleared - next fetches will use fresh cookies.");
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

        // Try IPv6 first when available; fall back to IPv4 on network errors
        let mut use_ipv6 = Self::ipv6_connectivity();

        // Retry up to 2 times with backoff for transient 429 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_flags_vec(use_ipv6, &output_args);
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
            } else if use_ipv6 && Self::is_network_error(&stderr) {
                // IPv6 unrouted/blocked - retry immediately on IPv4
                println!("[Stream] IPv6 network error, falling back to IPv4: {}", stderr.trim().lines().last().unwrap_or(""));
                use_ipv6 = false;
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
        let all_args = Self::yt_dlp_args_with_flags_vec(Self::ipv6_connectivity(), &artist_search_args);
        
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
