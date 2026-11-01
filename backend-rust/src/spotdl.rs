use std::process::Command;
use std::path::{Path, PathBuf};
use std::env;
use std::fs;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::{Instant, Duration};
use futures::future::join_all;

use crate::models::{Track, YTResult, StaticPlaylist};
use serde::Deserialize;

/// Set once a mounted/imported cookies.txt is rejected by YouTube
/// ("cookies are no longer valid" / "Sign in to confirm you're not a bot").
/// After this, user-provided cookie files are ignored in favour of the
/// auto-refreshed anonymous session (which is written to a writable path).
static USER_COOKIES_REJECTED: AtomicBool = AtomicBool::new(false);

pub struct CacheItem {
    pub tracks: Vec<Track>,
    pub timestamp: Instant,
}

/// Minimal YouTube oEmbed payload (fast, no-auth track metadata for link previews).
#[derive(Deserialize)]
struct OEmbedResponse {
    title: String,
    author_name: Option<String>,
    thumbnail_url: Option<String>,
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

    /// Clear all cookies in the jar
    pub fn clear(&self) {
        if let Ok(mut inner) = self.inner.lock() {
            *inner = cookie_store::CookieStore::new();
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
    oembed_client: reqwest::Client,
    cookie_jar: Arc<SharedCookieStore>,
    download_locks: Arc<std::sync::Mutex<HashMap<String, Arc<std::sync::Mutex<()>>>>>,
    pub search_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
    pub browse_cache: Arc<RwLock<HashMap<String, HashMap<String, Vec<StaticPlaylist>>>>>,
    /// Full yt-dlp metadata for single tracks (see get_track_info).
    pub track_info_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
    /// Fast oEmbed previews used by the Open Graph share page (see resolve_share_preview).
    pub share_preview_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
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

        // Dedicated short-timeout client for oEmbed lookups so Facebook's link
        // crawler (strict ~10s timeout) always gets an instant share page.
        let oembed_client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap_or_default();

        Self {
            download_dir,
            yt_client,
            oembed_client,
            cookie_jar,
            download_locks: Arc::new(std::sync::Mutex::new(HashMap::new())),
            search_cache: Arc::new(RwLock::new(HashMap::new())),
            browse_cache: Arc::new(RwLock::new(HashMap::new())),
            track_info_cache: Arc::new(RwLock::new(HashMap::new())),
            share_preview_cache: Arc::new(RwLock::new(HashMap::new())),
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

    /// True if any cookie file (uploaded, managed, COOKIE_FILE, docker, local) exists.
    /// Uses `is_file()` so a directory mounted in place of a missing file
    /// (Docker creates one for `./cookies.txt:/app/cookies.txt:ro` when the
    /// host file does not exist) is never mistaken for a real cookie file.
    pub fn has_cookies_file() -> bool {
        if Self::uploaded_cookie_path().is_file() {
            return true;
        }
        let managed = Self::managed_cookie_path();
        if managed.is_file() {
            return true;
        }
        if let Ok(env_path) = env::var("COOKIE_FILE") {
            if PathBuf::from(&env_path).is_file() {
                return true;
            }
        }
        Path::new("/app/cookies.txt").is_file() || Path::new("cookies.txt").is_file()
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
            if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
                Self::reject_user_cookies();
                println!("[Search] Cookies rejected by YouTube, retrying without rejected cookies...");
            } else if is_rate_limit && attempt < 2 {
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

    /// Resolve a single track's metadata (title, artist, cover, duration) from a
    /// YouTube video id. Used to build Open Graph previews for shared track links.
    pub async fn get_track_info(&self, id: &str) -> Result<Track, String> {
        // 1. Fast cache check - full metadata is cached for 6h
        {
            let cache = self.track_info_cache.read().await;
            if let Some(item) = cache.get(id) {
                if item.timestamp.elapsed() < Duration::from_secs(6 * 3600) {
                    if let Some(t) = item.tracks.first() {
                        println!("TrackInfo Cache Hit: {}", id);
                        return Ok(t.clone());
                    }
                }
            }
        }

        let path = Self::yt_dlp_path();
        let video_url = format!("https://www.youtube.com/watch?v={}", id);
        let output_args = vec![
            video_url.as_str(), "--dump-json", "--no-playlist",
        ];

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
                let line = stdout.lines().next().unwrap_or("");
                if let Ok(res) = serde_json::from_str::<YTResult>(line) {
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
                    let track = Track {
                        id: res.id.clone(),
                        title: res.title.clone(),
                        artist,
                        album: "YouTube Music".to_string(),
                        duration: res.duration.unwrap_or(0.0) as i32,
                        cover_url,
                        url: format!("/api/stream/{}", res.id),
                        view_count: res.view_count,
                        like_count: res.like_count,
                        comment_count: res.comment_count,
                        bitrate: res.abr.map(|b| b as i32),
                        codec: res.acodec,
                    };
                    let mut cache = self.track_info_cache.write().await;
                    cache.insert(id.to_string(), CacheItem {
                        tracks: vec![track.clone()],
                        timestamp: Instant::now(),
                    });
                    return Ok(track);
                }
                last_err = "Could not parse track metadata".to_string();
                break;
            }

            let stderr = String::from_utf8_lossy(&output.stderr);
            last_err = stderr.to_string();
            let is_rate_limit = stderr.contains("429") || stderr.contains("Too Many Requests");
            if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
                Self::reject_user_cookies();
                println!("[TrackInfo] Cookies rejected by YouTube, retrying without rejected cookies...");
            } else if is_rate_limit && attempt < 2 {
                let delay_secs = (attempt + 1) * 3;
                println!("[TrackInfo] Rate limited on attempt {}, retrying in {}s...", attempt + 1, delay_secs);
                tokio::time::sleep(Duration::from_secs(delay_secs as u64)).await;
            } else if use_ipv6 && Self::is_network_error(&stderr) {
                println!("[TrackInfo] IPv6 network error, falling back to IPv4: {}", stderr.trim().lines().last().unwrap_or(""));
                use_ipv6 = false;
            } else {
                break;
            }
        }

        Err(format!("Failed to resolve track {}. stderr: {}", id, last_err))
    }

    /// Fast, cached metadata for shared link previews (Open Graph tags).
    /// Uses YouTube's oEmbed API (usually <1s) instead of yt-dlp so the share
    /// page answers instantly - Facebook/Messenger crawlers time out after
    /// ~10s and show "connection timed out" when the page is slow. Results are
    /// cached for 24h so repeated crawler fetches are served from memory.
    pub async fn resolve_share_preview(&self, id: &str) -> (String, String, String) {
        // 1. Cache check
        {
            let cache = self.share_preview_cache.read().await;
            if let Some(item) = cache.get(id) {
                if item.timestamp.elapsed() < Duration::from_secs(24 * 3600) {
                    if let Some(t) = item.tracks.first() {
                        println!("SharePreview Cache Hit: {}", id);
                        return (t.title.clone(), t.artist.clone(), t.cover_url.clone());
                    }
                }
            }
        }

        let default_cover = format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id);
        let (title, artist, cover) = match self.fetch_oembed_preview(id).await {
            Some((t, a, c)) => (t, a, c),
            None => (
                "Listen to this track on kv-music".to_string(),
                "kv-music".to_string(),
                default_cover,
            ),
        };

        // 2. Cache the result for 24h
        let mut cache = self.share_preview_cache.write().await;
        cache.insert(id.to_string(), CacheItem {
            tracks: vec![Track {
                id: id.to_string(),
                title: title.clone(),
                artist: artist.clone(),
                album: "YouTube Music".to_string(),
                duration: 0,
                cover_url: cover.clone(),
                url: format!("/api/stream/{}", id),
                view_count: None,
                like_count: None,
                comment_count: None,
                bitrate: None,
                codec: None,
            }],
            timestamp: Instant::now(),
        });
        (title, artist, cover)
    }

    async fn fetch_oembed_preview(&self, id: &str) -> Option<(String, String, String)> {
        let url = format!(
            "https://www.youtube.com/oembed?format=json&url={}",
            urlencoding::encode(&format!("https://www.youtube.com/watch?v={}", id))
        );
        let res = self.oembed_client.get(&url).send().await.ok()?;
        if !res.status().is_success() {
            return None;
        }
        let data: OEmbedResponse = res.json().await.ok()?;
        let cover = data.thumbnail_url.unwrap_or_else(|| format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id));
        let artist = data.author_name.unwrap_or_else(|| "kv-music".to_string());
        Some((data.title, artist, cover))
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
            if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
                Self::reject_user_cookies();
                println!("[Chart] Cookies rejected by YouTube, retrying without rejected cookies...");
            } else if is_rate_limit && attempt < 2 {
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

    /// Writable location for user-uploaded cookies saved via Settings UI (`POST /api/settings/cookies`).
    /// Docker -> /app/data/user_cookies.txt, local -> data/user_cookies.txt.
    fn uploaded_cookie_path() -> PathBuf {
        if Path::new("/app/data").exists() {
            PathBuf::from("/app/data/user_cookies.txt")
        } else {
            PathBuf::from("data/user_cookies.txt")
        }
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
        // 1. User-uploaded cookies via Settings UI (/app/data/user_cookies.txt), if not rejected
        // 2. Explicit COOKIE_FILE env or /app/cookies.txt or cookies.txt (via writable_cookie_copy), if not rejected
        // 3. Managed auto-refreshed file (/app/data/cookies.txt)
        let rejected = USER_COOKIES_REJECTED.load(Ordering::Relaxed);
        if !rejected {
            let uploaded = Self::uploaded_cookie_path();
            if uploaded.is_file() {
                return uploaded;
            }
            if let Ok(env_path) = env::var("COOKIE_FILE") {
                let p = PathBuf::from(&env_path);
                if p.is_file() {
                    return Self::writable_cookie_copy(p);
                }
            }
            let docker_path = PathBuf::from("/app/cookies.txt");
            if docker_path.is_file() {
                return Self::writable_cookie_copy(docker_path);
            }
            let local_path = PathBuf::from("cookies.txt");
            if local_path.is_file() {
                return Self::writable_cookie_copy(local_path);
            }
        }
        let managed = Self::managed_cookie_path();
        if managed.is_file() {
            return managed;
        }
        PathBuf::from("cookies.txt")
    }

    /// True when yt-dlp reports that the supplied cookies are stale/expired
    /// or that a logged-in session is required (bot detection).
    fn is_rejected_cookie_error(stderr: &str) -> bool {
        let lower = stderr
            .to_lowercase()
            .replace('\u{2019}', "'")
            .replace('\u{2018}', "'");
        lower.contains("cookies are no longer valid")
            || lower.contains("sign in to confirm")
            || lower.contains("not a bot")
            || lower.contains("this helps protect our community")
            || (lower.contains("cookies") && (lower.contains("not valid") || lower.contains("expired")))
    }

    /// Mark user-provided cookies as rejected and remove their writable copy,
    /// so the next yt-dlp run uses fresh auto-refreshed cookies or unauthenticated clients.
    fn reject_user_cookies() {
        USER_COOKIES_REJECTED.store(true, Ordering::Relaxed);
        let ro_copy = PathBuf::from("/tmp/kv-music-ro-cookies.txt");
        if ro_copy.is_file() {
            let _ = fs::remove_file(&ro_copy);
        }
        let managed = Self::managed_cookie_path();
        if managed.is_file() {
            let _ = fs::remove_file(&managed);
            println!("[Cookies] User cookies rejected by YouTube - removed {}, will auto-refresh", managed.display());
        }
    }

    /// yt-dlp opens the cookies file for writing (it updates session cookies).
    /// A read-only mount (docker-compose `:ro`) crashes it, so copy the file to
    /// `/tmp/kv-music-ro-cookies.txt` (never clobbering `/app/data/cookies.txt`).
    fn writable_cookie_copy(path: PathBuf) -> PathBuf {
        if !path.is_file() {
            return path;
        }
        let writable = std::fs::OpenOptions::new().append(true).open(&path).is_ok();
        if writable {
            return path;
        }
        let target = PathBuf::from("/tmp/kv-music-ro-cookies.txt");
        let src_len = fs::metadata(&path).map(|m| m.len()).ok();
        let dst_len = fs::metadata(&target).map(|m| m.len()).ok();
        let needs_copy = match (src_len, dst_len) {
            (Some(s), Some(d)) => s != d,
            _ => !target.is_file(),
        };
        if needs_copy {
            if let Ok(content) = fs::read(&path) {
                if fs::write(&target, &content).is_ok() {
                    println!("[Cookies] Copied read-only {} -> {} for yt-dlp", path.display(), target.display());
                    return target;
                }
            }
        } else if target.is_file() {
            return target;
        }
        path
    }

    /// Check if Netscape cookie content contains real YouTube authentication cookies.
    pub fn is_authenticated_cookie_content(content: &str) -> bool {
        const AUTH_COOKIE_NAMES: &[&str] = &[
            "SID",
            "HSID",
            "SSID",
            "APISID",
            "SAPISID",
            "__Secure-1PSID",
            "__Secure-3PSID",
            "__Secure-1PAPISID",
            "__Secure-3PAPISID",
            "LOGIN_INFO",
        ];
        for raw_line in content.lines() {
            let line = raw_line.trim();
            let line = line.strip_prefix("#HttpOnly_").unwrap_or(line);
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let fields: Vec<&str> = line.split('\t').collect();
            if fields.len() >= 7 {
                let name = fields[5].trim();
                let value = fields[6].trim();
                if !value.is_empty() && AUTH_COOKIE_NAMES.contains(&name) {
                    return true;
                }
            } else {
                let ws_fields: Vec<&str> = line.split_whitespace().collect();
                if ws_fields.len() >= 7 {
                    let name = ws_fields[5].trim();
                    let value = ws_fields[6].trim();
                    if !value.is_empty() && AUTH_COOKIE_NAMES.contains(&name) {
                        return true;
                    }
                }
            }
        }
        false
    }

    fn count_cookie_lines(content: &str) -> usize {
        let mut count = 0;
        for raw_line in content.lines() {
            let line = raw_line.trim();
            let line = line.strip_prefix("#HttpOnly_").unwrap_or(line);
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if line.split('\t').count() >= 7 || line.split_whitespace().count() >= 7 {
                count += 1;
            }
        }
        count
    }

    /// Return structured status of the active cookies file and IPv6 routing.
    pub fn get_cookie_status(&self) -> serde_json::Value {
        let path = Self::cookies_file_path();
        let exists = path.is_file();
        let content = if exists {
            fs::read_to_string(&path).unwrap_or_default()
        } else {
            String::new()
        };
        let cookie_count = Self::count_cookie_lines(&content);
        let has_cookies = exists && cookie_count > 0;
        let is_authenticated = has_cookies && Self::is_authenticated_cookie_content(&content);
        let active_path = if has_cookies {
            Some(path.to_string_lossy().into_owned())
        } else {
            None
        };
        serde_json::json!({
            "has_cookies": has_cookies,
            "is_authenticated": is_authenticated,
            "cookie_count": cookie_count,
            "active_path": active_path,
            "user_cookies_rejected": USER_COOKIES_REJECTED.load(Ordering::Relaxed),
            "ipv6_routable": Self::ipv6_connectivity(),
        })
    }

    /// Validate and persist Netscape cookies uploaded from the Settings UI.
    pub async fn save_user_cookies(&self, content: &str) -> Result<serde_json::Value, String> {
        let trimmed = content.trim();
        if trimmed.is_empty() {
            return Err("Nội dung cookies trống.".to_string());
        }

        let cookie_count = Self::count_cookie_lines(trimmed);
        if cookie_count == 0 {
            return Err("Không tìm thấy dòng cookie hợp lệ (định dạng Netscape HTTP Cookie File cần 7 cột cách nhau bởi dấu tab).".to_string());
        }

        let mut normalized = String::new();
        if !trimmed.starts_with("# Netscape HTTP Cookie File") && !trimmed.starts_with("# HTTP Cookie File") {
            normalized.push_str("# Netscape HTTP Cookie File\n");
        }
        normalized.push_str(trimmed);
        normalized.push('\n');

        let uploaded = Self::uploaded_cookie_path();
        if let Some(parent) = uploaded.parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::write(&uploaded, &normalized)
            .map_err(|e| format!("Không thể ghi file {}: {}", uploaded.display(), e))?;

        let managed = Self::managed_cookie_path();
        if let Some(parent) = managed.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&managed, &normalized);

        let ro_copy = PathBuf::from("/tmp/kv-music-ro-cookies.txt");
        if ro_copy.is_file() {
            let _ = fs::remove_file(&ro_copy);
        }

        USER_COOKIES_REJECTED.store(false, Ordering::Relaxed);
        self.clear_caches().await;

        println!(
            "[Cookies] Saved {} user cookies to {} (authenticated={})",
            cookie_count,
            uploaded.display(),
            Self::is_authenticated_cookie_content(&normalized)
        );
        Ok(self.get_cookie_status())
    }

    /// Remove all stored cookie files and mark user cookies rejected so stale
    /// read-only mounts are also bypassed.
    pub async fn clear_user_cookies(&self) -> serde_json::Value {
        for p in [
            Self::uploaded_cookie_path(),
            Self::managed_cookie_path(),
            PathBuf::from("/tmp/kv-music-ro-cookies.txt"),
        ] {
            if p.is_file() {
                let _ = fs::remove_file(&p);
            }
        }
        USER_COOKIES_REJECTED.store(true, Ordering::Relaxed);
        self.cookie_jar.clear();
        self.clear_caches().await;
        println!("[Cookies] Cleared user and managed cookie files.");
        self.get_cookie_status()
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
        Self::yt_dlp_args_with_options_vec(use_ipv6, false, false, extra_args)
    }

    fn yt_dlp_args_with_options_vec(
        use_ipv6: bool,
        skip_cookies: bool,
        use_alt_clients: bool,
        extra_args: &[&str],
    ) -> Vec<String> {
        let mut args = vec![];

        args.push("--js-runtimes".to_string());
        args.push("node".to_string());

        // Prefer IPv6 when it is actually routable - YouTube bot detection
        // blocks many IPv4 routes but allows IPv6.
        if use_ipv6 {
            args.push("--force-ipv6".to_string());
        }

        if use_alt_clients {
            args.push("--extractor-args".to_string());
            args.push("youtube:player_client=visionos,tv_samsung,android_vr,mweb".to_string());
        }

        if !skip_cookies {
            let cookie_path = Self::cookies_file_path();
            if cookie_path.is_file() {
                args.push("--cookies".to_string());
                // yt-dlp runs with current_dir set to the download dir, so a
                // relative path (e.g. local "data/cookies.txt") would resolve to
                // the wrong location. Always pass an absolute path.
                let absolute = fs::canonicalize(&cookie_path).unwrap_or(cookie_path);
                args.push(absolute.to_string_lossy().into_owned());
            }
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
        self.cookie_jar.clear();

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

        // Ignore any stale read-only /app/cookies.txt mount so the freshly fetched
        // managed cookies are used.
        USER_COOKIES_REJECTED.store(true, Ordering::Relaxed);

        println!("[Cookies] Fetched {} fresh cookies -> {}", names.len(), path.display());
        Ok(format!("Đã lấy {} cookie mới từ YouTube và lưu vào {}", names.len(), path.display()))
    }

    /// Drop all in-memory caches so the next fetches re-query YouTube with the new cookies.
    pub async fn clear_caches(&self) {
        self.search_cache.write().await.clear();
        self.browse_cache.write().await.clear();
        self.track_info_cache.write().await.clear();
        self.share_preview_cache.write().await.clear();
        println!("[Cookies] All caches cleared - next fetches will use fresh cookies.");
    }

    fn find_downloaded_audio(&self, video_id: &str, preferred_ext: &str, allow_any_audio: bool) -> Option<String> {
        let prefix = format!("{}.", video_id);
        let entries: Vec<_> = fs::read_dir(&self.download_dir)
            .ok()?
            .flatten()
            .collect();

        // 1. Check preferred extension first
        for entry in &entries {
            if let Some(file_name) = entry.file_name().to_str() {
                if file_name == format!("{}.{}", video_id, preferred_ext) {
                    return Some(entry.path().to_string_lossy().into_owned());
                }
            }
        }

        if !allow_any_audio {
            return None;
        }

        // 2. Fallback to any valid audio extension (excluding .part / .ytdl / .temp)
        for ext in ["webm", "m4a", "opus", "mp4", "mp3", "ogg", "aac"] {
            for entry in &entries {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.starts_with(&prefix)
                        && !file_name.ends_with(".part")
                        && !file_name.ends_with(".ytdl")
                        && !file_name.ends_with(".temp")
                        && file_name == format!("{}.{}", video_id, ext)
                    {
                        return Some(entry.path().to_string_lossy().into_owned());
                    }
                }
            }
        }

        None
    }

    /// Fallback downloader via Invidious Companion (`COMPANION_URL`, local `:8282`, or Tailscale
    /// peer `100.94.92.63:8282`). Fetches in 2 MiB HTTP Range chunks so YouTube does not
    /// throttle the stream after the initial 512 KiB buffer.
    fn try_companion_download(&self, video_id: &str, prefer_m4a: bool) -> Option<String> {
        let handle = tokio::runtime::Handle::try_current().ok()?;
        let download_dir = self.download_dir.clone();
        let vid = video_id.to_string();

        handle.block_on(async move {
            let mut bases: Vec<String> = Vec::new();
            if let Ok(custom) = env::var("COMPANION_URL") {
                for u in custom.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
                    bases.push(u.trim_end_matches('/').to_string());
                }
            }
            for default_base in [
                "http://100.94.92.63:8282/companion",
                "http://127.0.0.1:8282/companion",
                "http://host.docker.internal:8282/companion",
            ] {
                if !bases.iter().any(|b| b == default_base) {
                    bases.push(default_base.to_string());
                }
            }

            let itags: &[(&str, &str)] = if prefer_m4a {
                &[("140", "m4a"), ("251", "webm")]
            } else {
                &[("251", "webm"), ("250", "webm"), ("140", "m4a")]
            };

            let no_redirect_client = reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(8))
                .build()
                .ok()?;

            let chunk_client = reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .build()
                .ok()?;

            for base in &bases {
                let origin = if let Some(idx) = base.find("/companion") {
                    &base[..idx]
                } else {
                    base.as_str()
                };

                for &(itag, ext) in itags {
                    let resolve_url = format!(
                        "{}/latest_version?id={}&itag={}&local=true",
                        base, vid, itag
                    );
                    let resp = match no_redirect_client.get(&resolve_url).send().await {
                        Ok(r) => r,
                        Err(_) => break, // This companion base is unreachable; try next base
                    };

                    if !resp.status().is_redirection() {
                        continue;
                    }

                    let Some(loc) = resp
                        .headers()
                        .get(reqwest::header::LOCATION)
                        .and_then(|v| v.to_str().ok())
                    else {
                        continue;
                    };

                    let playback_url = if loc.starts_with("http://") || loc.starts_with("https://") {
                        loc.to_string()
                    } else if loc.starts_with('/') {
                        format!("{}{}", origin, loc)
                    } else {
                        format!("{}/{}", base, loc)
                    };

                    let chunk_size: u64 = 2 * 1024 * 1024; // 2 MiB
                    let mut offset: u64 = 0;
                    let mut total_size: Option<u64> = None;
                    let mut data: Vec<u8> = Vec::new();
                    let mut ok = true;

                    loop {
                        let end = match total_size {
                            Some(t) if t > 0 => (offset + chunk_size - 1).min(t - 1),
                            _ => offset + chunk_size - 1,
                        };
                        let range_hdr = format!("bytes={}-{}", offset, end);
                        let chunk_resp = match chunk_client
                            .get(&playback_url)
                            .header(reqwest::header::RANGE, &range_hdr)
                            .send()
                            .await
                        {
                            Ok(r) => r,
                            Err(e) => {
                                println!("[Companion] Chunk request error for {}: {}", vid, e);
                                ok = false;
                                break;
                            }
                        };

                        let status = chunk_resp.status();
                        if status != reqwest::StatusCode::PARTIAL_CONTENT && status != reqwest::StatusCode::OK {
                            println!("[Companion] Unexpected HTTP {} for {}", status, vid);
                            ok = false;
                            break;
                        }

                        if total_size.is_none() {
                            if let Some(cr) = chunk_resp
                                .headers()
                                .get(reqwest::header::CONTENT_RANGE)
                                .and_then(|v| v.to_str().ok())
                            {
                                // Format: "bytes 0-2097151/6507225"
                                if let Some(slash_part) = cr.rsplit('/').next() {
                                    if let Ok(parsed_total) = slash_part.trim().parse::<u64>() {
                                        total_size = Some(parsed_total);
                                        data.reserve(parsed_total as usize);
                                    }
                                }
                            }
                        }

                        let bytes = match chunk_resp.bytes().await {
                            Ok(b) => b,
                            Err(_) => {
                                ok = false;
                                break;
                            }
                        };

                        if bytes.is_empty() {
                            break;
                        }

                        offset += bytes.len() as u64;
                        data.extend_from_slice(&bytes);

                        if status == reqwest::StatusCode::OK {
                            break;
                        }
                        if let Some(t) = total_size {
                            if offset >= t {
                                break;
                            }
                        } else if (bytes.len() as u64) < chunk_size {
                            break;
                        }
                    }

                    if ok && data.len() > 10_000 {
                        let tmp_path = download_dir.join(format!("{}.{}.tmp", vid, ext));
                        let final_path = download_dir.join(format!("{}.{}", vid, ext));
                        if fs::write(&tmp_path, &data).is_ok() && fs::rename(&tmp_path, &final_path).is_ok() {
                            println!(
                                "[Companion] Downloaded {} ({} bytes, itag={}) via {}",
                                final_path.display(),
                                data.len(),
                                itag,
                                base
                            );
                            return Some(final_path.to_string_lossy().into_owned());
                        }
                        let _ = fs::remove_file(&tmp_path);
                    }
                }
            }
            None
        })
    }

    /// Fetch (or return cached) audio for a video.
    ///
    /// `prefer_m4a`: when true, download AAC-in-MP4 (needed by Safari, which
    /// cannot play WebM/Opus). When false (default), download WebM/Opus - an
    /// open codec that plays in Chrome/Firefox/Edge and codec-restricted
    /// clients such as VS Code's embedded webview, which ships without an
    /// AAC/MP3 decoder.
    pub fn get_stream_url(&self, video_url: &str, prefer_m4a: bool) -> Result<String, String> {
        let target_url = if video_url.starts_with("http") {
            video_url.to_string()
        } else {
            format!("https://www.youtube.com/watch?v={}", video_url)
        };
        
        let video_id = Self::extract_id(&target_url);
        let ext = if prefer_m4a { "m4a" } else { "webm" };

        // Per-video lock so concurrent range/probe requests wait for the active download
        let video_lock = {
            let mut map = self.download_locks.lock().unwrap_or_else(|e| e.into_inner());
            map.entry(video_id.clone())
                .or_insert_with(|| Arc::new(std::sync::Mutex::new(())))
                .clone()
        };
        let _guard = video_lock.lock().unwrap_or_else(|e| e.into_inner());

        if let Some(cached) = self.find_downloaded_audio(&video_id, ext, !prefer_m4a) {
            return Ok(cached);
        }

        let output_pattern = format!("{}.%(ext)s", video_id);
        let format_selector = if prefer_m4a {
            "bestaudio[ext=m4a]/bestaudio[acodec=aac]/bestaudio/best"
        } else {
            "bestaudio/best"
        };
        let output_args = vec![
            "-f", format_selector,
            "--output", &output_pattern,
            &target_url,
        ];

        // Try IPv6 first when available; fall back to IPv4 on network errors
        let mut use_ipv6 = Self::ipv6_connectivity();
        let mut skip_cookies = false;
        let mut use_alt_clients = false;

        // Retry with fallbacks for transient 429 / rejected cookies / IPv6 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_options_vec(
                use_ipv6,
                skip_cookies,
                use_alt_clients,
                &output_args,
            );
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
                if let Some(found) = self.find_downloaded_audio(&video_id, ext, true) {
                    return Ok(found);
                }
                return Err("File not found after download".to_string());
            }
            
            let stderr = String::from_utf8_lossy(&output.stderr);
            last_err = stderr.to_string();
            println!("[Stream] yt-dlp download failed (attempt {}): {}", attempt + 1, stderr);
            
            let is_rate_limit = stderr.contains("429") || stderr.contains("Too Many Requests");
            if Self::is_rejected_cookie_error(&stderr) {
                // Fast-path fallback: if Invidious Companion is reachable (local or Tailscale),
                // download the audio stream in 2 MiB Range chunks in <1s instead of failing on IPv4.
                if let Some(companion_file) = self.try_companion_download(&video_id, prefer_m4a) {
                    return Ok(companion_file);
                }
            }
            if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
                // User cookies expired/rotated or bot check triggered.
                Self::reject_user_cookies();
                use_alt_clients = true;
                let has_auth = Self::cookies_file_path().is_file()
                    && fs::read_to_string(Self::cookies_file_path())
                        .map(|c| Self::is_authenticated_cookie_content(&c))
                        .unwrap_or(false);
                if !has_auth {
                    skip_cookies = true;
                }
                if let Ok(handle) = tokio::runtime::Handle::try_current() {
                    let s = self.clone();
                    handle.spawn(async move {
                        match s.refresh_cookies().await {
                            Ok(msg) => println!("[Cookies] Auto-refresh after rejection: {}", msg),
                            Err(e) => println!("[Cookies] Auto-refresh after rejection failed: {}", e),
                        }
                    });
                }
                println!("[Stream] Cookies rejected / bot check - retrying with alternate clients (skip_cookies={})...", skip_cookies);
                std::thread::sleep(Duration::from_secs(1));
            } else if is_rate_limit && attempt < 2 {
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

        if let Some(companion_file) = self.try_companion_download(&video_id, prefer_m4a) {
            return Ok(companion_file);
        }
        
        Err(format!("Download failed. stderr: {}", last_err))
    }

    /// Fetch (or return cached) best-quality video+audio for a video.
    ///
    /// Downloads H.264 (mp4) video + AAC (m4a) audio and merges them into a
    /// single .mp4 with ffmpeg (installed in the Docker image). YouTube caps
    /// H.264 at 1080p; higher resolutions require VP9/AV1 (webm), which we
    /// deliberately do not pick so downloaded files play everywhere.
    pub fn get_video_url(&self, video_url: &str) -> Result<String, String> {
        let target_url = if video_url.starts_with("http") {
            video_url.to_string()
        } else {
            format!("https://www.youtube.com/watch?v={}", video_url)
        };

        let video_id = Self::extract_id(&target_url);
        let ext = "mp4";

        let video_lock = {
            let mut map = self.download_locks.lock().unwrap_or_else(|e| e.into_inner());
            map.entry(format!("video:{}", video_id))
                .or_insert_with(|| Arc::new(std::sync::Mutex::new(())))
                .clone()
        };
        let _guard = video_lock.lock().unwrap_or_else(|e| e.into_inner());

        if let Ok(entries) = fs::read_dir(&self.download_dir) {
            for entry in entries.flatten() {
                if let Some(file_name) = entry.file_name().to_str() {
                    if file_name.starts_with(&format!("{}.", video_id)) && file_name.ends_with(ext) {
                        return Ok(entry.path().to_string_lossy().into_owned());
                    }
                }
            }
        }

        let output_pattern = format!("{}.%(ext)s", video_id);
        let format_selector = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/bestvideo+bestaudio/best";
        let output_args = vec![
            "-f", format_selector,
            "--merge-output-format", "mp4",
            "--output", &output_pattern,
            &target_url,
        ];

        // Try IPv6 first when available; fall back to IPv4 on network errors
        let mut use_ipv6 = Self::ipv6_connectivity();
        let mut skip_cookies = false;
        let mut use_alt_clients = false;

        // Retry up to 2 times with backoff for transient 429 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_options_vec(
                use_ipv6,
                skip_cookies,
                use_alt_clients,
                &output_args,
            );
            let output = match Command::new(Self::yt_dlp_path())
                .current_dir(&self.download_dir)
                .args(&all_args)
                .output() {
                Ok(o) => o,
                Err(e) => {
                    println!("[Download] yt-dlp spawn error: {}", e);
                    return Err(format!("Download spawn failed: {}", e));
                }
            };

            if output.status.success() {
                if let Ok(entries) = fs::read_dir(&self.download_dir) {
                    for entry in entries.flatten() {
                        if let Some(file_name) = entry.file_name().to_str() {
                            if file_name.starts_with(&format!("{}.", video_id)) && file_name.ends_with(ext) {
                                return Ok(entry.path().to_string_lossy().into_owned());
                            }
                        }
                    }
                }
                return Err("File not found after download".to_string());
            }

            let stderr = String::from_utf8_lossy(&output.stderr);
            last_err = stderr.to_string();
            println!("[Download] yt-dlp download failed (attempt {}): {}", attempt + 1, stderr);

            let is_rate_limit = stderr.contains("429") || stderr.contains("Too Many Requests");
            if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
                Self::reject_user_cookies();
                use_alt_clients = true;
                let has_auth = Self::cookies_file_path().is_file()
                    && fs::read_to_string(Self::cookies_file_path())
                        .map(|c| Self::is_authenticated_cookie_content(&c))
                        .unwrap_or(false);
                if !has_auth {
                    skip_cookies = true;
                }
                if let Ok(handle) = tokio::runtime::Handle::try_current() {
                    let s = self.clone();
                    handle.spawn(async move {
                        match s.refresh_cookies().await {
                            Ok(msg) => println!("[Cookies] Auto-refresh after rejection: {}", msg),
                            Err(e) => println!("[Cookies] Auto-refresh after rejection failed: {}", e),
                        }
                    });
                }
                println!("[Download] Cookies rejected / bot check - retrying with alternate clients (skip_cookies={})...", skip_cookies);
                std::thread::sleep(Duration::from_secs(1));
            } else if is_rate_limit && attempt < 2 {
                let delay_secs = (attempt + 1) * 5;
                println!("[Download] Rate limited, retrying in {}s...", delay_secs);
                std::thread::sleep(Duration::from_secs(delay_secs as u64));
            } else if use_ipv6 && Self::is_network_error(&stderr) {
                println!("[Download] IPv6 network error, falling back to IPv4: {}", stderr.trim().lines().last().unwrap_or(""));
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
