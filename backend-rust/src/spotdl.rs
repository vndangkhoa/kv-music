use std::process::Command;
use std::path::{Path, PathBuf};
use std::env;
use std::fs;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::RwLock;
use std::collections::{HashMap, HashSet};
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
    pub universal_search_cache: Arc<RwLock<HashMap<String, (Instant, serde_json::Value)>>>,
    pub browse_cache: Arc<RwLock<HashMap<String, HashMap<String, Vec<StaticPlaylist>>>>>,
    /// Full yt-dlp metadata for single tracks (see get_track_info).
    pub track_info_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
    /// Fast oEmbed previews used by the Open Graph share page (see resolve_share_preview).
    pub share_preview_cache: Arc<RwLock<HashMap<String, CacheItem>>>,
    /// Cached recommendations results by seed/type/limit (30m TTL).
    pub recommendations_cache: Arc<RwLock<HashMap<String, (Instant, crate::api::Recommendations)>>>,
    /// Cached artist avatar lookups by lowercase query (6h TTL).
    pub artist_photo_cache: Arc<RwLock<HashMap<String, (Instant, String)>>>,
}

pub struct CompanionResolvedStream {
    pub playback_url: String,
    pub total_size: Option<u64>,
    pub ext: &'static str,
    pub content_type: &'static str,
    pub use_warp: bool,
}

pub struct ProgressiveStreamPlan {
    pub status_206: bool,
    pub content_type: &'static str,
    pub total_size: Option<u64>,
    pub content_range: Option<String>,
    pub content_length: Option<u64>,
    pub initial_bytes: Vec<u8>,
    pub body_rx: Option<tokio::sync::mpsc::Receiver<Result<axum::body::Bytes, std::io::Error>>>,
}

fn companion_no_redirect_client() -> &'static reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_millis(1200))
            .timeout(Duration::from_secs(6))
            .pool_max_idle_per_host(8)
            .tcp_nodelay(true)
            .build()
            .unwrap_or_default()
    })
}

fn companion_chunk_client() -> &'static reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .no_proxy()
            .connect_timeout(Duration::from_millis(1500))
            .timeout(Duration::from_secs(15))
            .pool_max_idle_per_host(12)
            .tcp_nodelay(true)
            .build()
            .unwrap_or_default()
    })
}

fn companion_fast_burst_client() -> &'static reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .no_proxy()
            .connect_timeout(Duration::from_millis(1500))
            .timeout(Duration::from_secs(5))
            .pool_max_idle_per_host(8)
            .tcp_nodelay(true)
            .build()
            .unwrap_or_default()
    })
}

fn build_companion_warp_client(
    cache: &'static std::sync::OnceLock<std::sync::Mutex<Option<(String, reqwest::Client)>>>,
    connect_ms: u64,
    timeout_secs: u64,
    pool_max: usize,
) -> Option<reqwest::Client> {
    let proxy_url = SpotdlService::outbound_proxy()?;
    let mutex = cache.get_or_init(|| std::sync::Mutex::new(None));
    if let Ok(guard) = mutex.lock() {
        if let Some((ref cached_proxy, ref client)) = *guard {
            if cached_proxy == &proxy_url {
                return Some(client.clone());
            }
        }
    }
    let builder = reqwest::Client::builder()
        .connect_timeout(Duration::from_millis(connect_ms))
        .timeout(Duration::from_secs(timeout_secs))
        .pool_max_idle_per_host(pool_max)
        .tcp_nodelay(true);
    let client = SpotdlService::apply_outbound_proxy(builder).build().ok()?;
    if let Ok(mut guard) = mutex.lock() {
        *guard = Some((proxy_url, client.clone()));
    }
    Some(client)
}

fn companion_warp_burst_client() -> Option<reqwest::Client> {
    static CACHE: std::sync::OnceLock<std::sync::Mutex<Option<(String, reqwest::Client)>>> =
        std::sync::OnceLock::new();
    build_companion_warp_client(&CACHE, 2000, 6, 8)
}

fn companion_warp_chunk_client() -> Option<reqwest::Client> {
    static CACHE: std::sync::OnceLock<std::sync::Mutex<Option<(String, reqwest::Client)>>> =
        std::sync::OnceLock::new();
    build_companion_warp_client(&CACHE, 2000, 15, 8)
}

fn last_working_companion() -> &'static std::sync::Mutex<Option<String>> {
    static CACHE: std::sync::OnceLock<std::sync::Mutex<Option<String>>> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| std::sync::Mutex::new(None))
}

fn in_flight_downloads_map() -> &'static std::sync::Mutex<HashMap<String, Arc<tokio::sync::Notify>>> {
    static MAP: std::sync::OnceLock<std::sync::Mutex<HashMap<String, Arc<tokio::sync::Notify>>>> =
        std::sync::OnceLock::new();
    MAP.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

struct InFlightGuard {
    key: String,
    notify: Arc<tokio::sync::Notify>,
}

impl Drop for InFlightGuard {
    fn drop(&mut self) {
        if let Ok(mut map) = in_flight_downloads_map().lock() {
            map.remove(&self.key);
        }
        self.notify.notify_waiters();
    }
}

fn in_flight_prefetch_set() -> &'static std::sync::Mutex<HashSet<String>> {
    static SET: std::sync::OnceLock<std::sync::Mutex<HashSet<String>>> = std::sync::OnceLock::new();
    SET.get_or_init(|| std::sync::Mutex::new(HashSet::new()))
}

fn prefetch_semaphore() -> &'static tokio::sync::Semaphore {
    static SEM: std::sync::OnceLock<tokio::sync::Semaphore> = std::sync::OnceLock::new();
    SEM.get_or_init(|| tokio::sync::Semaphore::new(2))
}

fn failed_prefetch_cache() -> &'static std::sync::Mutex<HashMap<String, Instant>> {
    static MAP: std::sync::OnceLock<std::sync::Mutex<HashMap<String, Instant>>> = std::sync::OnceLock::new();
    MAP.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

fn failed_companion_bases() -> &'static std::sync::Mutex<HashMap<String, Instant>> {
    static MAP: std::sync::OnceLock<std::sync::Mutex<HashMap<String, Instant>>> = std::sync::OnceLock::new();
    MAP.get_or_init(|| std::sync::Mutex::new(HashMap::new()))
}

struct SyncSemaphore {
    state: std::sync::Mutex<usize>,
    cvar: std::sync::Condvar,
    max_permits: usize,
}

struct SyncPermit<'a> {
    sem: &'a SyncSemaphore,
}

impl Drop for SyncPermit<'_> {
    fn drop(&mut self) {
        if let Ok(mut count) = self.sem.state.lock() {
            *count = count.saturating_sub(1);
            self.sem.cvar.notify_one();
        }
    }
}

impl SyncSemaphore {
    fn new(max_permits: usize) -> Self {
        Self {
            state: std::sync::Mutex::new(0),
            cvar: std::sync::Condvar::new(),
            max_permits,
        }
    }

    fn acquire(&self) -> SyncPermit<'_> {
        let mut count = self.state.lock().unwrap_or_else(|e| e.into_inner());
        while *count >= self.max_permits {
            count = self.cvar.wait(count).unwrap_or_else(|e| e.into_inner());
        }
        *count += 1;
        SyncPermit { sem: self }
    }
}

fn sync_ytdlp_gate() -> &'static SyncSemaphore {
    static GATE: std::sync::OnceLock<SyncSemaphore> = std::sync::OnceLock::new();
    GATE.get_or_init(|| SyncSemaphore::new(2))
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
        // When Cloudflare WARP MASQUE (usque) or YTDLP_PROXY is active, route
        // outbound YouTube HTTP requests through it as well.
        let cookie_jar = Arc::new(SharedCookieStore::new());
        let yt_builder = Self::apply_outbound_proxy(
            reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .cookie_provider(cookie_jar.clone())
                .timeout(Duration::from_secs(30)),
        );
        let yt_client = yt_builder.build().unwrap_or_default();

        // Dedicated short-timeout client for oEmbed lookups so Facebook's link
        // crawler (strict ~10s timeout) always gets an instant share page.
        let oembed_builder = Self::apply_outbound_proxy(
            reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .timeout(Duration::from_secs(3)),
        );
        let oembed_client = oembed_builder.build().unwrap_or_default();

        Self {
            download_dir,
            yt_client,
            oembed_client,
            cookie_jar,
            download_locks: Arc::new(std::sync::Mutex::new(HashMap::new())),
            search_cache: Arc::new(RwLock::new(HashMap::new())),
            universal_search_cache: Arc::new(RwLock::new(HashMap::new())),
            browse_cache: Arc::new(RwLock::new(HashMap::new())),
            track_info_cache: Arc::new(RwLock::new(HashMap::new())),
            share_preview_cache: Arc::new(RwLock::new(HashMap::new())),
            recommendations_cache: Arc::new(RwLock::new(HashMap::new())),
            artist_photo_cache: Arc::new(RwLock::new(HashMap::new())),
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

    async fn run_command_output(path: String, args: Vec<String>) -> std::io::Result<std::process::Output> {
        static YTDLP_SEMAPHORE: std::sync::OnceLock<tokio::sync::Semaphore> =
            std::sync::OnceLock::new();
        let sem = YTDLP_SEMAPHORE.get_or_init(|| tokio::sync::Semaphore::new(3));
        let _permit = sem
            .acquire()
            .await
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        tokio::task::spawn_blocking(move || Command::new(&path).args(&args).output())
            .await
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?
    }

    /// True when `path` is a non-empty regular file in valid Netscape cookie format.
    pub fn is_valid_netscape_cookie_file(path: &Path) -> bool {
        let Ok(meta) = fs::metadata(path) else {
            return false;
        };
        if !meta.is_file() || meta.len() < 20 {
            return false;
        }
        let Ok(content) = fs::read_to_string(path) else {
            return false;
        };
        let Some(first_non_empty) = content.lines().map(str::trim).find(|l| !l.is_empty()) else {
            return false;
        };
        let lower_head = first_non_empty.to_ascii_lowercase();
        let has_header = lower_head.starts_with("# netscape http cookie file")
            || lower_head.starts_with("# http cookie file")
            || lower_head.starts_with("#lwp-cookies");
        has_header && Self::count_cookie_lines(&content) > 0
    }

    /// True if any valid cookie file (uploaded, managed, COOKIE_FILE, docker, local) exists.
    /// Rejects 0-byte or non-Netscape mounts so empty `./cookies.txt` files never trigger
    /// repeated `yt-dlp` startup failures.
    pub fn has_cookies_file() -> bool {
        if Self::is_valid_netscape_cookie_file(&Self::uploaded_cookie_path()) {
            return true;
        }
        if Self::is_valid_netscape_cookie_file(&Self::managed_cookie_path()) {
            return true;
        }
        if let Ok(env_path) = env::var("COOKIE_FILE") {
            if Self::is_valid_netscape_cookie_file(Path::new(&env_path)) {
                return true;
            }
        }
        Self::is_valid_netscape_cookie_file(Path::new("/app/cookies.txt"))
            || Self::is_valid_netscape_cookie_file(Path::new("cookies.txt"))
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
            static IN_FLIGHT_COUNTRIES: std::sync::OnceLock<std::sync::Mutex<HashSet<String>>> =
                std::sync::OnceLock::new();
            let in_flight = IN_FLIGHT_COUNTRIES.get_or_init(|| std::sync::Mutex::new(HashSet::new()));
            {
                let mut set = in_flight.lock().unwrap_or_else(|e| e.into_inner());
                if !set.insert(country.clone()) {
                    return;
                }
            }

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

            // Spawn deduplicated dynamic preload
            let service_clone = self.clone();
            let cache_arc = self.browse_cache.clone();
            let country_task = country.clone();
            tokio::spawn(async move {
                service_clone.fetch_browse_content(&country_task, &cache_arc).await;
                if let Ok(mut set) = in_flight.lock() {
                    set.remove(&country_task);
                }
            });
        }
    }

    fn strip_ytsearch_prefix(raw: &str) -> String {
        let mut s = raw.trim();
        for prefix in ["ytsearch", "ytmusicsearch"] {
            if let Some(rest) = s.strip_prefix(prefix) {
                if let Some((_, tail)) = rest.split_once(':') {
                    s = tail.trim();
                }
            }
        }
        if let Some(stripped) = s.strip_suffix(" audio") {
            s = stripped.trim();
        }
        s.to_string()
    }

    fn parse_duration_secs(text: &str) -> Option<i32> {
        let parts: Vec<&str> = text.trim().split(':').collect();
        if parts.len() == 2 {
            let m: i32 = parts[0].parse().ok()?;
            let s: i32 = parts[1].parse().ok()?;
            return Some(m * 60 + s);
        } else if parts.len() == 3 {
            let h: i32 = parts[0].parse().ok()?;
            let m: i32 = parts[1].parse().ok()?;
            let s: i32 = parts[2].parse().ok()?;
            return Some(h * 3600 + m * 60 + s);
        }
        None
    }

    fn upgrade_thumb_url(url: &str, video_id: &str) -> String {
        if url.is_empty() {
            return format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", video_id);
        }
        if url.contains("googleusercontent.com/") && (url.contains("=w60-h60") || url.contains("=w120-h120")) {
            if let Some((base, _)) = url.split_once('=') {
                return format!("{}=w544-h544-l90-rj", base);
            }
        }
        url.to_string()
    }

    fn parse_innertube_track(renderer: &serde_json::Value) -> Option<Track> {
        let flex = renderer.get("flexColumns")?.as_array()?;
        let col0_runs = flex
            .first()?
            .get("musicResponsiveListItemFlexColumnRenderer")?
            .get("text")?
            .get("runs")?
            .as_array()?;

        let first_run = col0_runs.first()?;
        let title = first_run.get("text")?.as_str()?.trim().to_string();
        if title.is_empty() {
            return None;
        }

        let video_id = first_run
            .get("navigationEndpoint")
            .and_then(|ne| ne.get("watchEndpoint"))
            .and_then(|we| we.get("videoId"))
            .and_then(|v| v.as_str())
            .or_else(|| renderer.get("playlistItemData").and_then(|p| p.get("videoId")).and_then(|v| v.as_str()))
            .or_else(|| {
                renderer
                    .get("overlay")
                    .and_then(|o| o.get("musicItemThumbnailOverlayRenderer"))
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.get("musicPlayButtonRenderer"))
                    .and_then(|p| p.get("playNavigationEndpoint"))
                    .and_then(|ne| ne.get("watchEndpoint"))
                    .and_then(|we| we.get("videoId"))
                    .and_then(|v| v.as_str())
            })?
            .to_string();

        if video_id.len() != 11 || video_id.starts_with("UC") || video_id.starts_with("PL") {
            return None;
        }

        let mut segments: Vec<String> = Vec::new();
        if let Some(col1_runs) = flex
            .get(1)
            .and_then(|c| c.get("musicResponsiveListItemFlexColumnRenderer"))
            .and_then(|r| r.get("text"))
            .and_then(|t| t.get("runs"))
            .and_then(|r| r.as_array())
        {
            let mut cur = String::new();
            for r in col1_runs {
                if let Some(txt) = r.get("text").and_then(|t| t.as_str()) {
                    if txt.trim() == "•" {
                        let s = cur.trim().to_string();
                        if !s.is_empty() {
                            segments.push(s);
                        }
                        cur.clear();
                    } else {
                        cur.push_str(txt);
                    }
                }
            }
            let tail = cur.trim().to_string();
            if !tail.is_empty() {
                segments.push(tail);
            }
        }

        segments.retain(|s| {
            let low = s.to_ascii_lowercase();
            low != "song" && low != "video" && low != "single" && low != "ep"
        });

        let mut duration = 0;
        if let Some(last) = segments.last() {
            if let Some(secs) = Self::parse_duration_secs(last) {
                duration = secs;
                segments.pop();
            }
        }
        segments.retain(|s| {
            let low = s.to_ascii_lowercase();
            !low.ends_with("plays") && !low.ends_with("views") && !low.ends_with("subscribers")
        });

        let artist = segments
            .first()
            .cloned()
            .unwrap_or_else(|| "YouTube Music".to_string());
        let album = segments
            .get(1)
            .cloned()
            .unwrap_or_else(|| "YouTube Music".to_string());

        let raw_thumb = renderer
            .get("thumbnail")
            .and_then(|th| th.get("musicThumbnailRenderer"))
            .and_then(|r| r.get("thumbnail"))
            .and_then(|th| th.get("thumbnails"))
            .and_then(|arr| arr.as_array())
            .and_then(|arr| arr.last())
            .and_then(|t| t.get("url"))
            .and_then(|u| u.as_str())
            .unwrap_or("");
        let cover_url = Self::upgrade_thumb_url(raw_thumb, &video_id);

        Some(Track {
            id: video_id.clone(),
            title,
            artist,
            album,
            duration,
            cover_url,
            url: format!("/api/stream/{}", video_id),
            view_count: None,
            like_count: None,
            comment_count: None,
            bitrate: None,
            codec: None,
        })
    }

    fn collect_innertube_tracks(value: &serde_json::Value, out: &mut Vec<Track>) {
        match value {
            serde_json::Value::Array(arr) => {
                for item in arr {
                    Self::collect_innertube_tracks(item, out);
                }
            }
            serde_json::Value::Object(map) => {
                if let Some(renderer) = map.get("musicResponsiveListItemRenderer") {
                    if let Some(track) = Self::parse_innertube_track(renderer) {
                        if !out.iter().any(|t| t.id == track.id) {
                            out.push(track);
                        }
                    }
                }
                for v in map.values() {
                    Self::collect_innertube_tracks(v, out);
                }
            }
            _ => {}
        }
    }

    async fn search_innertube_filtered(&self, query: &str, params: &str) -> Vec<Track> {
        let body = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20260808.01.00",
                    "hl": "en",
                    "gl": "VN"
                }
            },
            "query": query,
            "params": params
        });

        let res = match self
            .yt_client
            .post("https://music.youtube.com/youtubei/v1/search?prettyPrint=false")
            .timeout(Duration::from_secs(4))
            .header("Content-Type", "application/json")
            .header("Origin", "https://music.youtube.com")
            .json(&body)
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => r,
            _ => return Vec::new(),
        };

        let Ok(json) = res.json::<serde_json::Value>().await else {
            return Vec::new();
        };
        let mut tracks = Vec::new();
        Self::collect_innertube_tracks(&json, &mut tracks);
        tracks
    }

    async fn search_tracks_innertube(&self, raw_query: &str) -> Option<Vec<Track>> {
        let cleaned = Self::strip_ytsearch_prefix(raw_query);
        if cleaned.is_empty()
            || cleaned.starts_with("http://")
            || cleaned.starts_with("https://")
        {
            return None;
        }
        // Single 11-char video ID lookup works more reliably via yt-dlp/get_track_info
        if cleaned.len() == 11
            && !cleaned.contains(' ')
            && cleaned
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        {
            return None;
        }

        // Songs + Videos concurrently (~400-900ms, zero subprocess overhead)
        let (songs, videos) = tokio::join!(
            self.search_innertube_filtered(&cleaned, "EgWKAQIIAWoMEA4QChADEAQQCRAF"),
            self.search_innertube_filtered(&cleaned, "EgWKAQIQAWoMEA4QChADEAQQCRAF")
        );

        let mut merged = Vec::new();
        let mut seen = HashSet::new();
        for t in songs.into_iter().chain(videos.into_iter()) {
            if t.duration > 0 && t.duration > 1200 {
                continue;
            }
            if seen.insert(t.id.clone()) {
                merged.push(t);
            }
            if merged.len() >= 30 {
                break;
            }
        }

        if merged.is_empty() {
            None
        } else {
            Some(merged)
        }
    }

    async fn fetch_innertube_artist_photo(&self, query: &str) -> Option<String> {
        let body = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20260808.01.00",
                    "hl": "en"
                }
            },
            "query": query,
            "params": "EgWKAQIgAWoMEA4QChADEAQQCRAF"
        });

        let res = self
            .yt_client
            .post("https://music.youtube.com/youtubei/v1/search?prettyPrint=false")
            .timeout(Duration::from_millis(3500))
            .header("Content-Type", "application/json")
            .header("Origin", "https://music.youtube.com")
            .json(&body)
            .send()
            .await
            .ok()?;
        if !res.status().is_success() {
            return None;
        }
        let json: serde_json::Value = res.json().await.ok()?;

        fn find_first_artist_thumb(v: &serde_json::Value) -> Option<String> {
            match v {
                serde_json::Value::Array(arr) => arr.iter().find_map(find_first_artist_thumb),
                serde_json::Value::Object(map) => {
                    if let Some(renderer) = map.get("musicResponsiveListItemRenderer") {
                        if let Some(url) = renderer
                            .get("thumbnail")
                            .and_then(|th| th.get("musicThumbnailRenderer"))
                            .and_then(|r| r.get("thumbnail"))
                            .and_then(|th| th.get("thumbnails"))
                            .and_then(|arr| arr.as_array())
                            .and_then(|arr| arr.last())
                            .and_then(|t| t.get("url"))
                            .and_then(|u| u.as_str())
                        {
                            if url.starts_with("http") {
                                return Some(url.to_string());
                            }
                        }
                    }
                    map.values().find_map(find_first_artist_thumb)
                }
                _ => None,
            }
        }

        find_first_artist_thumb(&json).map(|u| {
            if u.contains("googleusercontent.com/") && (u.contains("=w60-h60") || u.contains("=w120-h120")) {
                if let Some((base, _)) = u.split_once('=') {
                    return format!("{}=w544-h544-l90-rj", base);
                }
            }
            u
        })
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

    async fn fetch_browse_content(&self, country: &str, cache_arc: &Arc<RwLock<HashMap<String, HashMap<String, Vec<StaticPlaylist>>>>>) {
        use futures::stream::{self, StreamExt};

        let country = country.to_uppercase();
        let queries: Vec<(String, String)> = Self::get_queries_for_country(&country)
            .into_iter()
            .map(|(cat, q)| (cat.to_string(), q))
            .collect();
        let path = Self::yt_dlp_path();

        let category_results: Vec<(String, Vec<StaticPlaylist>)> = stream::iter(queries)
            .map(|(category, search_query)| {
                let path = path.clone();
                let this = self.clone();
                async move {
                    let is_album = category == "Top Albums";
                    let p_type = if is_album { "Album" } else { "Playlist" };

                    // Fast path: direct InnerTube WEB_REMIX search (~400ms, zero subprocess RAM)
                    if let Some(tracks) = this.search_tracks_innertube(&search_query).await {
                        let items: Vec<StaticPlaylist> = tracks
                            .into_iter()
                            .filter(|t| t.duration == 0 || t.duration >= 60)
                            .map(|t| {
                                let title = if is_album {
                                    t.title.clone()
                                } else {
                                    format!("{} Mix", t.title)
                                };
                                let id_slug = t
                                    .title
                                    .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
                                    .replace(' ', "-");
                                StaticPlaylist {
                                    id: format!("discovery-{}-{}-{}", p_type.to_lowercase(), id_slug, t.id),
                                    title,
                                    description: Some(if is_album {
                                        "Album".to_string()
                                    } else {
                                        format!("Made for you • {}", t.artist)
                                    }),
                                    cover_url: Some(t.cover_url),
                                    creator: Some(t.artist),
                                    tracks: Vec::new(),
                                    playlist_type: p_type.to_string(),
                                }
                            })
                            .collect();
                        if !items.is_empty() {
                            return (category, items);
                        }
                    }

                    // Fallback: yt-dlp flat-playlist search
                    let mut cmd_args = Self::build_yt_dlp_base_args_vec();
                    cmd_args.push(search_query);
                    cmd_args.push("--dump-json".to_string());
                    cmd_args.push("--no-playlist".to_string());
                    cmd_args.push("--flat-playlist".to_string());

                    let mut items = Vec::new();
                    if let Ok(o) = Self::run_command_output(path, cmd_args).await {
                        let stdout = String::from_utf8_lossy(&o.stdout);
                        for line in stdout.lines() {
                            if let Ok(res) = serde_json::from_str::<YTResult>(line) {
                                let duration = res.duration.unwrap_or(0.0);
                                if res.id.starts_with("UC") || duration < 60.0 {
                                    continue;
                                }
                                let cover_url = if let Some(t) = res.thumbnails.last() {
                                    t.url.clone()
                                } else {
                                    format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", res.id)
                                };
                                let artist = res.uploader.replace(" - Topic", "");
                                let title = if is_album {
                                    res.title.clone()
                                } else {
                                    format!("{} Mix", res.title.clone())
                                };
                                let id_slug = res
                                    .title
                                    .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
                                    .replace(' ', "-");
                                items.push(StaticPlaylist {
                                    id: format!("discovery-{}-{}-{}", p_type.to_lowercase(), id_slug, res.id),
                                    title,
                                    description: Some(if is_album {
                                        "Album".to_string()
                                    } else {
                                        format!("Made for you • {}", artist)
                                    }),
                                    cover_url: Some(cover_url),
                                    creator: Some(artist),
                                    tracks: Vec::new(),
                                    playlist_type: p_type.to_string(),
                                });
                            }
                        }
                    }
                    (category, items)
                }
            })
            .buffer_unordered(4)
            .collect()
            .await;

        let mut all_data: HashMap<String, Vec<StaticPlaylist>> = HashMap::new();
        for (category, items) in category_results {
            if !items.is_empty() {
                all_data.insert(category.to_string(), items);
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
        
        if let Ok(o) = Self::run_command_output(path.clone(), artist_cmd_args).await {
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

        // 2. Fast path: direct InnerTube WEB_REMIX search (~400-900ms, no subprocess)
        if let Some(tracks) = self.search_tracks_innertube(query).await {
            if !tracks.is_empty() {
                let mut cache = self.search_cache.write().await;
                if cache.len() >= 500 {
                    cache.retain(|_, v| v.timestamp.elapsed() < Duration::from_secs(3600));
                    if cache.len() >= 500 {
                        cache.clear();
                    }
                }
                cache.insert(query.to_string(), CacheItem {
                    tracks: tracks.clone(),
                    timestamp: Instant::now(),
                });
                return Ok(tracks);
            }
        }

        let path = Self::yt_dlp_path();
        let search_query = format!("ytsearch30:{} audio", query);

        let output_args = vec![
            search_query.as_str(), "--dump-json", "--no-playlist", "--flat-playlist",
        ];

        // Try IPv6 first when available; fall back to IPv4 or direct connection on errors
        let mut use_ipv6 = Self::ipv6_connectivity();
        let mut disable_proxy = false;

        // Retry up to 2 times with backoff for transient 429 / proxy / IPv6 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_flags_vec(use_ipv6, disable_proxy, &output_args);
            let output = match Self::run_command_output(path.clone(), all_args).await {
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
                    if cache.len() >= 500 {
                        cache.retain(|_, v| v.timestamp.elapsed() < Duration::from_secs(3600));
                        if cache.len() >= 500 {
                            cache.clear();
                        }
                    }
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
            if Self::is_proxy_error(&stderr) && !disable_proxy && attempt < 2 {
                Self::invalidate_warp_probe_cache();
                disable_proxy = true;
                println!("[Search] WARP proxy unreachable, retrying direct connection...");
            } else if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
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
        let mut disable_proxy = false;
        let mut last_err = String::new();

        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_flags_vec(use_ipv6, disable_proxy, &output_args);
            let output = match Self::run_command_output(path.clone(), all_args).await {
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
                    if cache.len() >= 500 {
                        cache.retain(|_, v| v.timestamp.elapsed() < Duration::from_secs(6 * 3600));
                        if cache.len() >= 500 {
                            cache.clear();
                        }
                    }
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
            if Self::is_proxy_error(&stderr) && !disable_proxy && attempt < 2 {
                Self::invalidate_warp_probe_cache();
                disable_proxy = true;
                println!("[TrackInfo] WARP proxy unreachable, retrying direct connection...");
            } else if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
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

        // 2. Cache the result for 24h (capped at 500 entries)
        let mut cache = self.share_preview_cache.write().await;
        if cache.len() >= 500 {
            cache.retain(|_, v| v.timestamp.elapsed() < Duration::from_secs(24 * 3600));
            if cache.len() >= 500 {
                cache.clear();
            }
        }
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

        // Try IPv6 first when available; fall back to IPv4 or direct connection on errors
        let mut use_ipv6 = Self::ipv6_connectivity();
        let mut disable_proxy = false;

        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_flags_vec(use_ipv6, disable_proxy, &output_args);
            let output = match Self::run_command_output(path.clone(), all_args).await {
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
                    if cache.len() >= 500 {
                        cache.retain(|_, v| v.timestamp.elapsed() < Duration::from_secs(3600));
                        if cache.len() >= 500 {
                            cache.clear();
                        }
                    }
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
            if Self::is_proxy_error(&stderr) && !disable_proxy && attempt < 2 {
                Self::invalidate_warp_probe_cache();
                disable_proxy = true;
                println!("[Chart] WARP proxy unreachable, retrying direct connection...");
            } else if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
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
        // Priority (all require valid non-empty Netscape cookie format):
        // 1. User-uploaded cookies via Settings UI (/app/data/user_cookies.txt), if not rejected
        // 2. Explicit COOKIE_FILE env or /app/cookies.txt or cookies.txt (via writable_cookie_copy), if not rejected
        // 3. Managed auto-refreshed file (/app/data/cookies.txt)
        let rejected = USER_COOKIES_REJECTED.load(Ordering::Relaxed);
        if !rejected {
            let uploaded = Self::uploaded_cookie_path();
            if Self::is_valid_netscape_cookie_file(&uploaded) {
                return uploaded;
            }
            if let Ok(env_path) = env::var("COOKIE_FILE") {
                let p = PathBuf::from(&env_path);
                if Self::is_valid_netscape_cookie_file(&p) {
                    return Self::writable_cookie_copy(p);
                }
            }
            let docker_path = PathBuf::from("/app/cookies.txt");
            if Self::is_valid_netscape_cookie_file(&docker_path) {
                return Self::writable_cookie_copy(docker_path);
            }
            let local_path = PathBuf::from("cookies.txt");
            if Self::is_valid_netscape_cookie_file(&local_path) {
                return Self::writable_cookie_copy(local_path);
            }
        }
        let managed = Self::managed_cookie_path();
        if Self::is_valid_netscape_cookie_file(&managed) {
            return managed;
        }
        PathBuf::new()
    }

    /// True when yt-dlp reports that the supplied cookies are stale/expired,
    /// malformed (empty / non-Netscape), or that a logged-in session is required.
    fn is_rejected_cookie_error(stderr: &str) -> bool {
        let lower = stderr
            .to_lowercase()
            .replace('\u{2019}', "'")
            .replace('\u{2018}', "'");
        lower.contains("cookies are no longer valid")
            || lower.contains("does not look like a netscape format cookies file")
            || lower.contains("sign in to confirm")
            || lower.contains("not a bot")
            || lower.contains("this helps protect our community")
            || (lower.contains("cookie") && lower.contains("format"))
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
        let warp_proxy = Self::outbound_proxy();
        serde_json::json!({
            "has_cookies": has_cookies,
            "is_authenticated": is_authenticated,
            "cookie_count": cookie_count,
            "active_path": active_path,
            "user_cookies_rejected": USER_COOKIES_REJECTED.load(Ordering::Relaxed),
            "ipv6_routable": Self::ipv6_connectivity(),
            "warp_active": warp_proxy.is_some(),
            "warp_proxy": warp_proxy,
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
    /// Probes a well-known IPv6 endpoint with a short timeout and caches the
    /// result for 60s. Override with FORCE_IPV6=1 (always) or FORCE_IPV6=0 (never).
    fn ipv6_connectivity() -> bool {
        use std::net::{SocketAddr, TcpStream};
        use std::str::FromStr;
        if let Ok(v) = env::var("FORCE_IPV6") {
            return v != "0";
        }
        static IPV6_CACHE: std::sync::OnceLock<std::sync::Mutex<Option<(bool, Instant)>>> =
            std::sync::OnceLock::new();
        let mutex = IPV6_CACHE.get_or_init(|| std::sync::Mutex::new(None));
        if let Ok(guard) = mutex.lock() {
            if let Some((ok, ts)) = *guard {
                if ts.elapsed() < Duration::from_secs(60) {
                    return ok;
                }
            }
        }
        let Ok(addr) = SocketAddr::from_str("[2001:4860:4860::8888]:443") else {
            return false;
        };
        let ok = TcpStream::connect_timeout(&addr, Duration::from_secs(2)).is_ok();
        if let Ok(mut guard) = mutex.lock() {
            *guard = Some((ok, Instant::now()));
        }
        ok
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

    fn is_proxy_error(stderr: &str) -> bool {
        let lower = stderr.to_lowercase();
        lower.contains("unable to connect to proxy")
            || lower.contains("proxyerror")
            || lower.contains("connection refused")
            || lower.contains("127.0.0.1', port=29083")
            || lower.contains("127.0.0.1:29083")
    }

    fn warp_probe_cache() -> &'static std::sync::Mutex<Option<(bool, Instant)>> {
        static WARP_PROBE_CACHE: std::sync::OnceLock<std::sync::Mutex<Option<(bool, Instant)>>> =
            std::sync::OnceLock::new();
        WARP_PROBE_CACHE.get_or_init(|| std::sync::Mutex::new(None))
    }

    pub fn invalidate_warp_probe_cache() {
        if let Ok(mut guard) = Self::warp_probe_cache().lock() {
            *guard = Some((false, Instant::now()));
        }
    }

    /// Resolve outbound HTTP/SOCKS proxy for YouTube traffic (KV-Tube WARP MASQUE symmetry).
    /// Checks `YTDLP_PROXY` / standard `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY` env vars first,
    /// then auto-detects a local `usque` WARP MASQUE HTTP proxy listening on `127.0.0.1:29083`
    /// (unless `ENABLE_WARP=0`).
    pub fn outbound_proxy() -> Option<String> {
        for key in [
            "YTDLP_PROXY",
            "HTTPS_PROXY",
            "https_proxy",
            "HTTP_PROXY",
            "http_proxy",
            "ALL_PROXY",
            "all_proxy",
        ] {
            if let Ok(val) = env::var(key) {
                let trimmed = val.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }

        if let Ok(disabled) = env::var("ENABLE_WARP") {
            let d = disabled.trim().to_ascii_lowercase();
            if matches!(d.as_str(), "0" | "false" | "no" | "off") {
                return None;
            }
        }

        // Probe local `usque` WARP MASQUE proxy (cached 30s) so standalone containers
        // or host-networked compose stacks automatically use WARP without manual config.
        use std::net::{SocketAddr, TcpStream};
        use std::str::FromStr;
        let mutex = Self::warp_probe_cache();
        if let Ok(guard) = mutex.lock() {
            if let Some((alive, ts)) = *guard {
                if ts.elapsed() < Duration::from_secs(30) {
                    return if alive {
                        Some("http://127.0.0.1:29083".to_string())
                    } else {
                        None
                    };
                }
            }
        }

        let alive = SocketAddr::from_str("127.0.0.1:29083")
            .ok()
            .and_then(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(150)).ok())
            .is_some();
        if let Ok(mut guard) = mutex.lock() {
            *guard = Some((alive, Instant::now()));
        }
        if alive {
            Some("http://127.0.0.1:29083".to_string())
        } else {
            None
        }
    }

    pub fn apply_outbound_proxy(builder: reqwest::ClientBuilder) -> reqwest::ClientBuilder {
        if let Some(proxy_url) = Self::outbound_proxy() {
            if let Ok(proxy) = reqwest::Proxy::all(&proxy_url) {
                let no_proxy = reqwest::NoProxy::from_string(
                    "localhost,127.0.0.1,0.0.0.0,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,100.64.0.0/10,companion,host.docker.internal",
                );
                return builder.proxy(proxy.no_proxy(no_proxy));
            }
        }
        builder
    }

    /// Build yt-dlp args with the IPv6 and proxy flags toggleable per attempt (for fallback).
    fn yt_dlp_args_with_flags_vec(use_ipv6: bool, disable_proxy: bool, extra_args: &[&str]) -> Vec<String> {
        Self::yt_dlp_args_with_options_vec(use_ipv6, false, false, disable_proxy, extra_args)
    }

    fn yt_dlp_args_with_options_vec(
        use_ipv6: bool,
        skip_cookies: bool,
        use_alt_clients: bool,
        disable_proxy: bool,
        extra_args: &[&str],
    ) -> Vec<String> {
        let mut args = vec![];

        args.push("--js-runtimes".to_string());
        args.push("node".to_string());

        let outbound_proxy = if disable_proxy { None } else { Self::outbound_proxy() };
        if let Some(ref proxy) = outbound_proxy {
            args.push("--proxy".to_string());
            args.push(proxy.clone());
        } else if use_ipv6 {
            // Prefer IPv6 when directly connected & routable — skip when a proxy
            // is active so local proxy socket resolution isn't forced to IPv6.
            args.push("--force-ipv6".to_string());
        }

        if use_alt_clients {
            args.push("--extractor-args".to_string());
            args.push("youtube:player_client=visionos,tv_samsung,android_vr,mweb".to_string());
        }

        if !skip_cookies {
            let cookie_path = Self::cookies_file_path();
            if Self::is_valid_netscape_cookie_file(&cookie_path) {
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
        Self::yt_dlp_args_with_flags_vec(Self::ipv6_connectivity(), false, &[])
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
        self.universal_search_cache.write().await.clear();
        self.browse_cache.write().await.clear();
        self.track_info_cache.write().await.clear();
        self.share_preview_cache.write().await.clear();
        self.recommendations_cache.write().await.clear();
        self.artist_photo_cache.write().await.clear();
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

    /// Public disk cache check used by `stream_handler` and `spawn_prefetch`.
    pub fn find_cached_audio(&self, video_url: &str, prefer_m4a: bool) -> Option<String> {
        let video_id = Self::extract_id(video_url);
        let ext = if prefer_m4a { "m4a" } else { "webm" };
        self.find_downloaded_audio(&video_id, ext, !prefer_m4a)
    }

    /// Wait up to 12s for an active download/prefetch of the given track to land on disk.
    pub async fn wait_for_in_flight(&self, video_or_id: &str, prefer_m4a: bool) -> Option<String> {
        let video_id = Self::extract_id(video_or_id);
        let key = format!("{}:{}", video_id, if prefer_m4a { "m4a" } else { "webm" });
        let notified = {
            let map = in_flight_downloads_map().lock().ok()?;
            map.get(&key).map(|n| {
                let notify = n.clone();
                async move { notify.notified().await }
            })
        };
        if let Some(fut) = notified {
            let _ = tokio::time::timeout(Duration::from_secs(12), fut).await;
            return self.find_cached_audio(&video_id, prefer_m4a);
        }
        None
    }

    /// Trigger a background audio download via Companion (zero `yt-dlp` subprocesses)
    /// so the track is already cached on disk when the user clicks or the queue advances to it.
    pub fn spawn_prefetch(&self, video_or_id: String, prefer_m4a: bool) {
        let video_id = Self::extract_id(&video_or_id);
        if video_id.is_empty() || self.find_cached_audio(&video_id, prefer_m4a).is_some() {
            return;
        }
        let key = format!("{}:{}", video_id, if prefer_m4a { "m4a" } else { "webm" });

        // Skip tracks that recently failed prefetch (5m cooldown) to prevent tight retry storms
        if let Ok(mut failed) = failed_prefetch_cache().lock() {
            let now = Instant::now();
            if failed.len() > 1000 {
                failed.retain(|_, ts| now.duration_since(*ts) < Duration::from_secs(300));
                if failed.len() > 1000 {
                    failed.clear();
                }
            }
            if let Some(ts) = failed.get(&key) {
                if ts.elapsed() < Duration::from_secs(300) {
                    return;
                }
            }
        }

        {
            let Ok(mut set) = in_flight_prefetch_set().lock() else {
                return;
            };
            if set.len() >= 6 {
                return;
            }
            if !set.insert(key.clone()) {
                return;
            }
        }
        if let Ok(map) = in_flight_downloads_map().lock() {
            if map.contains_key(&key) {
                if let Ok(mut set) = in_flight_prefetch_set().lock() {
                    set.remove(&key);
                }
                return;
            }
        }

        let service = self.clone();
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            handle.spawn(async move {
                let _permit = prefetch_semaphore().acquire().await;
                if service.find_cached_audio(&video_id, prefer_m4a).is_none() {
                    let s2 = service.clone();
                    let vid2 = video_id.clone();
                    let ok = tokio::task::spawn_blocking(move || {
                        s2.try_companion_download(&vid2, prefer_m4a).is_some()
                    })
                    .await
                    .unwrap_or(false);
                    if !ok {
                        if let Ok(mut failed) = failed_prefetch_cache().lock() {
                            failed.insert(key.clone(), Instant::now());
                        }
                    }
                }
                if let Ok(mut set) = in_flight_prefetch_set().lock() {
                    set.remove(&key);
                }
            });
        } else if let Ok(mut set) = in_flight_prefetch_set().lock() {
            set.remove(&key);
        }
    }

    fn is_companion_recently_failed(base: &str) -> bool {
        let Ok(mut guard) = failed_companion_bases().lock() else {
            return false;
        };
        guard.retain(|_, ts| ts.elapsed() < Duration::from_secs(60));
        guard.contains_key(base)
    }

    fn mark_companion_failed(base: &str) {
        if let Ok(mut guard) = failed_companion_bases().lock() {
            if guard.len() > 64 {
                guard.clear();
            }
            guard.insert(base.to_string(), Instant::now());
        }
    }

    /// Background-warm up to `count` (capped at 2) top tracks from lists/search results.
    pub fn prefetch_top_tracks(&self, tracks: &[Track], count: usize) {
        let cap = count.min(2);
        for track in tracks.iter().take(cap) {
            if track.id.len() == 11 {
                self.spawn_prefetch(track.id.clone(), false);
            }
        }
    }

    fn candidate_companion_bases() -> Vec<String> {
        let mut bases: Vec<String> = Vec::new();
        if let Ok(guard) = last_working_companion().lock() {
            if let Some(ref cached) = *guard {
                bases.push(cached.clone());
            }
        }
        if let Ok(custom) = env::var("COMPANION_URL") {
            for u in custom.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
                let trimmed = u.trim_end_matches('/').to_string();
                if !bases.iter().any(|b| b == &trimmed) {
                    bases.push(trimmed);
                }
            }
        }
        for default_base in [
            "http://invidious-companion:8282/companion",
            "http://companion:8282/companion",
            "http://127.0.0.1:8282/companion",
            "http://172.18.0.4:8282/companion",
            "http://192.168.31.71:8282/companion",
            "http://100.94.92.63:8282/companion",
            "http://host.docker.internal:8282/companion",
        ] {
            if !bases.iter().any(|b| b == default_base) {
                bases.push(default_base.to_string());
            }
        }
        bases
    }

    fn extract_direct_googlevideo_url(parsed: &reqwest::Url) -> Option<String> {
        let host = parsed
            .query_pairs()
            .find(|(k, _)| k == "host")
            .map(|(_, v)| v.trim().to_ascii_lowercase())?;
        if (host != "googlevideo.com" && !host.ends_with(".googlevideo.com"))
            || host.contains('/')
            || host.contains('@')
            || host.chars().any(|c| c.is_whitespace())
        {
            return None;
        }
        let raw_query = parsed.query().unwrap_or_default();
        let clean_query: Vec<&str> = raw_query
            .split('&')
            .filter(|seg| !seg.is_empty() && *seg != "host" && !seg.starts_with("host="))
            .collect();
        if clean_query.is_empty() {
            return None;
        }
        Some(format!(
            "https://{}/videoplayback?{}",
            host,
            clean_query.join("&")
        ))
    }

    fn parse_companion_location(base: &str, loc: &str) -> (Option<String>, String, Option<u64>) {
        let origin = if let Some(idx) = base.find("/companion") {
            &base[..idx]
        } else {
            base.trim_end_matches('/')
        };

        let mut total_size: Option<u64> = None;
        let mut direct_googlevideo_url: Option<String> = None;

        let proxy_url = if let Ok(parsed) = reqwest::Url::parse(loc) {
            for (k, v) in parsed.query_pairs() {
                if k == "clen" {
                    if let Ok(clen) = v.parse::<u64>() {
                        if clen > 0 {
                            total_size = Some(clen);
                        }
                    }
                    break;
                }
            }
            let host = parsed.host_str().unwrap_or_default().to_ascii_lowercase();
            if host.ends_with(".googlevideo.com") || host == "googlevideo.com" {
                direct_googlevideo_url = Some(loc.to_string());
                let path = parsed.path();
                let target_path = if path.starts_with("/companion/") {
                    path.to_string()
                } else if path == "/" || path.is_empty() {
                    "/companion/videoplayback".to_string()
                } else {
                    format!("/companion{}", path)
                };
                let query = parsed.query().unwrap_or_default();
                let has_host_param = query.split('&').any(|kv| kv.starts_with("host="));
                let joined_query = if has_host_param || query.is_empty() {
                    if query.is_empty() {
                        format!("host={}", urlencoding::encode(&host))
                    } else {
                        query.to_string()
                    }
                } else {
                    format!("{}&host={}", query, urlencoding::encode(&host))
                };
                format!("{}{}?{}", origin, target_path, joined_query)
            } else {
                direct_googlevideo_url = Self::extract_direct_googlevideo_url(&parsed);
                loc.to_string()
            }
        } else {
            let joined = if loc.starts_with('/') {
                format!("{}{}", origin, loc)
            } else {
                format!("{}/{}", base.trim_end_matches('/'), loc)
            };
            if let Ok(parsed) = reqwest::Url::parse(&joined) {
                for (k, v) in parsed.query_pairs() {
                    if k == "clen" {
                        if let Ok(clen) = v.parse::<u64>() {
                            if clen > 0 {
                                total_size = Some(clen);
                            }
                        }
                        break;
                    }
                }
                direct_googlevideo_url = Self::extract_direct_googlevideo_url(&parsed);
            }
            joined
        };

        (direct_googlevideo_url, proxy_url, total_size)
    }

    fn parse_content_range_total(headers: &reqwest::header::HeaderMap) -> Option<u64> {
        headers
            .get(reqwest::header::CONTENT_RANGE)
            .and_then(|v| v.to_str().ok())
            .and_then(|cr| cr.rsplit('/').next())
            .and_then(|s| s.trim().parse::<u64>().ok())
            .filter(|&n| n > 0)
    }

    /// Resolve a Companion playback URL and immediately fetch the initial 256 KiB burst
    /// so we verify the stream works and know `total_size` before returning HTTP headers.
    async fn fetch_companion_first_chunk(
        &self,
        video_id: &str,
        prefer_m4a: bool,
        first_chunk_end: u64,
    ) -> Option<(CompanionResolvedStream, Vec<u8>, bool)> {
        let bases = Self::candidate_companion_bases();
        let itags: &[(&str, &str, &str)] = if prefer_m4a {
            &[
                ("140", "m4a", "audio/mp4"),
                ("251", "webm", "video/webm"),
            ]
        } else {
            &[
                ("251", "webm", "video/webm"),
                ("250", "webm", "video/webm"),
                ("140", "m4a", "audio/mp4"),
            ]
        };

        let no_redirect_client = companion_no_redirect_client();
        let burst_client = companion_fast_burst_client();
        let warp_burst_client = companion_warp_burst_client();

        for base in &bases {
            if Self::is_companion_recently_failed(base) {
                continue;
            }
            for &(itag, ext, content_type) in itags {
                let resolve_url = format!(
                    "{}/latest_version?id={}&itag={}&local=true",
                    base, video_id, itag
                );
                let resp = match no_redirect_client.get(&resolve_url).send().await {
                    Ok(r) => r,
                    Err(_) => {
                        Self::mark_companion_failed(base);
                        if let Ok(mut guard) = last_working_companion().lock() {
                            if guard.as_deref() == Some(base.as_str()) {
                                *guard = None;
                            }
                        }
                        break;
                    }
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

                let (direct_url, proxy_url, mut total_size) =
                    Self::parse_companion_location(base, loc);
                let end = match total_size {
                    Some(t) if t > 0 => first_chunk_end.min(t - 1),
                    _ => first_chunk_end,
                };
                let range_hdr = format!("bytes=0-{}", end);

                let mut candidates: Vec<(String, bool)> = Vec::with_capacity(3);
                if let Some(ref d) = direct_url {
                    candidates.push((d.clone(), false));
                }
                candidates.push((proxy_url, false));
                if let Some(ref d) = direct_url {
                    if warp_burst_client.is_some() {
                        candidates.push((d.clone(), true));
                    }
                }

                let mut all_transport_fail = true;
                for (candidate_url, use_warp) in candidates {
                    let client = if use_warp {
                        match warp_burst_client {
                            Some(ref c) => c,
                            None => continue,
                        }
                    } else {
                        burst_client
                    };

                    let chunk_resp = match client
                        .get(&candidate_url)
                        .header(reqwest::header::RANGE, &range_hdr)
                        .send()
                        .await
                    {
                        Ok(r) => r,
                        Err(e) => {
                            println!(
                                "[Companion] First chunk request failed (warp={}) for {} itag={}: {}",
                                use_warp, video_id, itag, e
                            );
                            continue;
                        }
                    };

                    let status = chunk_resp.status();
                    if status != reqwest::StatusCode::PARTIAL_CONTENT
                        && status != reqwest::StatusCode::OK
                    {
                        all_transport_fail = false;
                        println!(
                            "[Companion] Initial chunk HTTP {} (warp={}) for {} itag={}",
                            status, use_warp, video_id, itag
                        );
                        continue;
                    }

                    if total_size.is_none() {
                        total_size = Self::parse_content_range_total(chunk_resp.headers());
                    }
                    if total_size.is_none() && status == reqwest::StatusCode::OK {
                        total_size = chunk_resp
                            .headers()
                            .get(reqwest::header::CONTENT_LENGTH)
                            .and_then(|v| v.to_str().ok())
                            .and_then(|s| s.trim().parse::<u64>().ok())
                            .filter(|&n| n > 0);
                    }

                    let bytes = match chunk_resp.bytes().await {
                        Ok(b) => b,
                        Err(e) => {
                            println!(
                                "[Companion] First chunk body failed (warp={}) for {} itag={}: {}",
                                use_warp, video_id, itag, e
                            );
                            continue;
                        }
                    };
                    if bytes.is_empty() {
                        continue;
                    }

                    if let Ok(mut guard) = last_working_companion().lock() {
                        *guard = Some(base.clone());
                    }

                    let resolved = CompanionResolvedStream {
                        playback_url: candidate_url,
                        total_size,
                        ext,
                        content_type,
                        use_warp,
                    };
                    return Some((resolved, bytes.to_vec(), status == reqwest::StatusCode::OK));
                }

                if all_transport_fail {
                    Self::mark_companion_failed(base);
                    if let Ok(mut guard) = last_working_companion().lock() {
                        if guard.as_deref() == Some(base.as_str()) {
                            *guard = None;
                        }
                    }
                    break;
                }
            }
        }
        None
    }

    async fn fetch_companion_chunk_with_retry(
        client: &reqwest::Client,
        url: &str,
        start: u64,
        end: u64,
    ) -> Result<(u64, Vec<u8>), String> {
        let range_hdr = format!("bytes={}-{}", start, end);
        for attempt in 0..2 {
            match client
                .get(url)
                .header(reqwest::header::RANGE, &range_hdr)
                .send()
                .await
            {
                Ok(resp) => {
                    let status = resp.status();
                    if status == reqwest::StatusCode::PARTIAL_CONTENT || status == reqwest::StatusCode::OK {
                        match resp.bytes().await {
                            Ok(b) if !b.is_empty() => return Ok((start, b.to_vec())),
                            Ok(_) if attempt == 0 => continue,
                            Ok(_) => return Err("empty chunk".to_string()),
                            Err(e) if attempt == 0 => {
                                println!("[Companion] Chunk read retry for {}: {}", range_hdr, e);
                                continue;
                            }
                            Err(e) => return Err(format!("chunk read failed: {}", e)),
                        }
                    } else if attempt == 0 {
                        continue;
                    } else {
                        return Err(format!("unexpected HTTP {}", status));
                    }
                }
                Err(e) if attempt == 0 => {
                    println!("[Companion] Chunk request retry for {}: {}", range_hdr, e);
                    continue;
                }
                Err(e) => return Err(format!("chunk request failed: {}", e)),
            }
        }
        Err("chunk failed after retries".to_string())
    }

    /// Stream the first 256 KiB burst immediately to the HTTP caller while downloading
    /// the remaining 1 MiB chunks in 3x parallel in the background and caching to disk.
    pub async fn stream_progressive_or_cache(
        &self,
        video_id: &str,
        prefer_m4a: bool,
        has_range_header: bool,
        requested_end: Option<u64>,
    ) -> Option<ProgressiveStreamPlan> {
        let vid = Self::extract_id(video_id);
        let key = format!("{}:{}", vid, if prefer_m4a { "m4a" } else { "webm" });

        // Coordinate with any concurrent progressive download / prefetch
        let guard = {
            let mut map = in_flight_downloads_map().lock().ok()?;
            if map.contains_key(&key) {
                return None;
            }
            let notify = Arc::new(tokio::sync::Notify::new());
            map.insert(key.clone(), notify.clone());
            InFlightGuard { key, notify }
        };

        let first_burst_end: u64 = 262_143; // 256 KiB (~13s of 160kbps Opus audio)
        let (resolved, initial_bytes, upstream_was_200) = self
            .fetch_companion_first_chunk(&vid, prefer_m4a, first_burst_end)
            .await?;

        let total_size = resolved.total_size;
        let initial_len = initial_bytes.len() as u64;
        let already_complete = upstream_was_200
            || matches!(total_size, Some(t) if initial_len >= t && t > 0);

        let target_end = match total_size {
            Some(t) if t > 0 => requested_end.map(|e| e.min(t - 1)).unwrap_or(t - 1),
            _ => requested_end.unwrap_or(u64::MAX),
        };

        let download_dir = self.download_dir.clone();
        let ext = resolved.ext;
        let content_type = resolved.content_type;

        if already_complete {
            let tmp_path = download_dir.join(format!("{}.{}.tmp", vid, ext));
            let final_path = download_dir.join(format!("{}.{}", vid, ext));
            if initial_bytes.len() > 10_000
                && fs::write(&tmp_path, &initial_bytes).is_ok()
                && fs::rename(&tmp_path, &final_path).is_ok()
            {
                println!(
                    "[Progressive] Cached complete {} ({} bytes)",
                    final_path.display(),
                    initial_bytes.len()
                );
            } else {
                let _ = fs::remove_file(&tmp_path);
            }
            drop(guard);

            let (status_206, content_range, content_length, slice_end) =
                Self::build_progressive_headers(
                    has_range_header,
                    Some(initial_bytes.len() as u64),
                    target_end.min(initial_bytes.len().saturating_sub(1) as u64),
                );
            let slice = initial_bytes[..=slice_end as usize].to_vec();
            return Some(ProgressiveStreamPlan {
                status_206,
                content_type,
                total_size: Some(initial_bytes.len() as u64),
                content_range,
                content_length,
                initial_bytes: slice,
                body_rx: None,
            });
        }

        // Fast path for small bounded probes (e.g. Safari 0-1 or 0-65535): respond immediately
        // from initial_bytes while continuing background caching to disk!
        let only_needs_initial = has_range_header && requested_end.is_some() && target_end < initial_len;

        let (tx_opt, body_rx) = if only_needs_initial {
            (None, None)
        } else {
            let (tx, rx) =
                tokio::sync::mpsc::channel::<Result<axum::body::Bytes, std::io::Error>>(16);
            let send_end = target_end.min(initial_len - 1) as usize;
            let _ = tx.try_send(Ok(axum::body::Bytes::copy_from_slice(&initial_bytes[..=send_end])));
            (Some(tx), Some(rx))
        };

        let playback_url = resolved.playback_url.clone();
        let use_warp = resolved.use_warp;
        let vid_bg = vid.clone();
        let initial_bg = initial_bytes.clone();

        tokio::spawn(async move {
            use futures::stream::{self, StreamExt};

            let _guard = guard;
            let mut tx = tx_opt;
            let client = if use_warp {
                companion_warp_chunk_client().unwrap_or_else(|| companion_chunk_client().clone())
            } else {
                companion_chunk_client().clone()
            };
            let chunk_size: u64 = 1024 * 1024; // 1 MiB parallel chunks

            let mut full_data = Vec::with_capacity(total_size.unwrap_or(4 * 1024 * 1024) as usize);
            full_data.extend_from_slice(&initial_bg);
            let mut ok = true;

            if let Some(total) = total_size {
                let mut ranges = Vec::new();
                let mut offset = initial_bg.len() as u64;
                while offset < total {
                    let end = (offset + chunk_size - 1).min(total - 1);
                    ranges.push((offset, end));
                    offset = end + 1;
                }

                let mut chunk_stream = stream::iter(ranges)
                    .map(|(s, e)| Self::fetch_companion_chunk_with_retry(&client, &playback_url, s, e))
                    .buffered(3);

                while let Some(res) = chunk_stream.next().await {
                    match res {
                        Ok((chunk_start, bytes)) => {
                            let bytes_len = bytes.len() as u64;
                            full_data.extend_from_slice(&bytes);

                            if let Some(ref sender) = tx {
                                if chunk_start <= target_end {
                                    let avail_end = target_end - chunk_start;
                                    let take_len = ((avail_end + 1).min(bytes_len)) as usize;
                                    let slice = axum::body::Bytes::copy_from_slice(&bytes[..take_len]);
                                    if sender.send(Ok(slice)).await.is_err() {
                                        tx = None;
                                    } else if chunk_start + (take_len as u64) - 1 >= target_end {
                                        tx = None;
                                    }
                                } else {
                                    tx = None;
                                }
                            }
                        }
                        Err(e) => {
                            println!("[Progressive] Chunk error for {}: {}", vid_bg, e);
                            if let Some(sender) = tx.take() {
                                let _ = sender
                                    .send(Err(std::io::Error::new(std::io::ErrorKind::Other, e)))
                                    .await;
                            }
                            ok = false;
                            break;
                        }
                    }
                }

                if ok && full_data.len() as u64 == total && total > 10_000 {
                    let tmp_path = download_dir.join(format!("{}.{}.tmp", vid_bg, ext));
                    let final_path = download_dir.join(format!("{}.{}", vid_bg, ext));
                    if fs::write(&tmp_path, &full_data).is_ok()
                        && fs::rename(&tmp_path, &final_path).is_ok()
                    {
                        println!(
                            "[Progressive] Streamed & cached {} ({} bytes)",
                            final_path.display(),
                            full_data.len()
                        );
                    } else {
                        let _ = fs::remove_file(&tmp_path);
                    }
                }
            } else {
                // Unknown total size: sequential continuation
                let mut offset = initial_bg.len() as u64;
                loop {
                    let end = offset + chunk_size - 1;
                    match Self::fetch_companion_chunk_with_retry(&client, &playback_url, offset, end).await {
                        Ok((_, bytes)) => {
                            let got = bytes.len() as u64;
                            full_data.extend_from_slice(&bytes);
                            if let Some(ref sender) = tx {
                                if sender.send(Ok(axum::body::Bytes::from(bytes))).await.is_err() {
                                    tx = None;
                                }
                            }
                            offset += got;
                            if got < chunk_size {
                                break;
                            }
                        }
                        Err(_) => {
                            ok = false;
                            break;
                        }
                    }
                }
                if ok && full_data.len() > 10_000 {
                    let tmp_path = download_dir.join(format!("{}.{}.tmp", vid_bg, ext));
                    let final_path = download_dir.join(format!("{}.{}", vid_bg, ext));
                    if fs::write(&tmp_path, &full_data).is_ok()
                        && fs::rename(&tmp_path, &final_path).is_ok()
                    {
                        println!(
                            "[Progressive] Streamed & cached {} ({} bytes)",
                            final_path.display(),
                            full_data.len()
                        );
                    } else {
                        let _ = fs::remove_file(&tmp_path);
                    }
                }
            }
        });

        let (status_206, content_range, content_length, _) =
            Self::build_progressive_headers(has_range_header, total_size, target_end);

        let initial_slice = if only_needs_initial {
            initial_bytes[..=(target_end as usize)].to_vec()
        } else {
            initial_bytes
        };

        Some(ProgressiveStreamPlan {
            status_206,
            content_type,
            total_size,
            content_range,
            content_length,
            initial_bytes: initial_slice,
            body_rx,
        })
    }

    fn build_progressive_headers(
        has_range_header: bool,
        total_size: Option<u64>,
        target_end: u64,
    ) -> (bool, Option<String>, Option<u64>, u64) {
        match total_size {
            Some(total) if total > 0 => {
                let clamped_end = target_end.min(total - 1);
                let len = clamped_end + 1;
                if has_range_header {
                    (
                        true,
                        Some(format!("bytes 0-{}/{}", clamped_end, total)),
                        Some(len),
                        clamped_end,
                    )
                } else {
                    (false, None, Some(total), total - 1)
                }
            }
            _ => (false, None, None, target_end),
        }
    }

    /// Parallel Companion downloader (`4x 1 MiB` concurrent chunks) used by
    /// `get_stream_url`, prefetching, and `/api/download`.
    fn try_companion_download(&self, video_id: &str, prefer_m4a: bool) -> Option<String> {
        let handle = tokio::runtime::Handle::try_current().ok()?;
        let download_dir = self.download_dir.clone();
        let vid = video_id.to_string();
        let this = self.clone();

        handle.block_on(async move {
            use futures::stream::{self, StreamExt};

            let (resolved, initial_bytes, upstream_was_200) =
                this.fetch_companion_first_chunk(&vid, prefer_m4a, 1024 * 1024 - 1).await?;

            let ext = resolved.ext;
            let mut data = Vec::with_capacity(resolved.total_size.unwrap_or(4 * 1024 * 1024) as usize);
            data.extend_from_slice(&initial_bytes);

            let complete = upstream_was_200
                || matches!(resolved.total_size, Some(t) if initial_bytes.len() as u64 >= t);

            let mut ok = true;
            if !complete {
                let client = if resolved.use_warp {
                    companion_warp_chunk_client().unwrap_or_else(|| companion_chunk_client().clone())
                } else {
                    companion_chunk_client().clone()
                };
                let chunk_size: u64 = 1024 * 1024;
                if let Some(total) = resolved.total_size {
                    let mut ranges = Vec::new();
                    let mut offset = initial_bytes.len() as u64;
                    while offset < total {
                        let end = (offset + chunk_size - 1).min(total - 1);
                        ranges.push((offset, end));
                        offset = end + 1;
                    }
                    let mut chunk_stream = stream::iter(ranges)
                        .map(|(s, e)| {
                            Self::fetch_companion_chunk_with_retry(&client, &resolved.playback_url, s, e)
                        })
                        .buffered(4);
                    while let Some(res) = chunk_stream.next().await {
                        match res {
                            Ok((_, bytes)) => data.extend_from_slice(&bytes),
                            Err(e) => {
                                println!("[Companion] Parallel chunk failed for {}: {}", vid, e);
                                ok = false;
                                break;
                            }
                        }
                    }
                } else {
                    let mut offset = initial_bytes.len() as u64;
                    loop {
                        let end = offset + chunk_size - 1;
                        match Self::fetch_companion_chunk_with_retry(
                            &client,
                            &resolved.playback_url,
                            offset,
                            end,
                        )
                        .await
                        {
                            Ok((_, bytes)) => {
                                let got = bytes.len() as u64;
                                data.extend_from_slice(&bytes);
                                offset += got;
                                if got < chunk_size {
                                    break;
                                }
                            }
                            Err(_) => {
                                ok = false;
                                break;
                            }
                        }
                    }
                }
            }

            if ok && data.len() > 10_000 {
                let tmp_path = download_dir.join(format!("{}.{}.tmp", vid, ext));
                let final_path = download_dir.join(format!("{}.{}", vid, ext));
                if fs::write(&tmp_path, &data).is_ok() && fs::rename(&tmp_path, &final_path).is_ok() {
                    println!(
                        "[Companion] Parallel downloaded {} ({} bytes)",
                        final_path.display(),
                        data.len()
                    );
                    return Some(final_path.to_string_lossy().into_owned());
                }
                let _ = fs::remove_file(&tmp_path);
            }
            None
        })
    }

    /// Fetch (or return cached) audio for a video.
    ///
    /// Checks disk cache -> Companion 4x parallel download (~1-3s, no subprocess) ->
    /// `yt-dlp --concurrent-fragments 4` fallback.
    pub fn get_stream_url(&self, video_url: &str, prefer_m4a: bool) -> Result<String, String> {
        let target_url = if video_url.starts_with("http") {
            video_url.to_string()
        } else {
            format!("https://www.youtube.com/watch?v={}", video_url)
        };
        
        let video_id = Self::extract_id(&target_url);
        let ext = if prefer_m4a { "m4a" } else { "webm" };

        // Fast lock-free disk hit check before acquiring per-video mutex
        if let Some(cached) = self.find_downloaded_audio(&video_id, ext, !prefer_m4a) {
            return Ok(cached);
        }

        // Per-video lock so concurrent range/probe requests wait for the active download
        let video_lock = {
            let mut map = self.download_locks.lock().unwrap_or_else(|e| e.into_inner());
            if map.len() > 256 {
                map.retain(|_, v| Arc::strong_count(v) > 1);
            }
            map.entry(video_id.clone())
                .or_insert_with(|| Arc::new(std::sync::Mutex::new(())))
                .clone()
        };
        let _guard = video_lock.lock().unwrap_or_else(|e| e.into_inner());

        if let Some(cached) = self.find_downloaded_audio(&video_id, ext, !prefer_m4a) {
            return Ok(cached);
        }

        // Fast path: Invidious Companion 4x parallel Range downloader (~1-3s, zero yt-dlp spawn)
        if let Some(companion_file) = self.try_companion_download(&video_id, prefer_m4a) {
            return Ok(companion_file);
        }

        let output_pattern = format!("{}.%(ext)s", video_id);
        let format_selector = if prefer_m4a {
            "bestaudio[ext=m4a]/bestaudio[acodec=aac]/bestaudio/best"
        } else {
            "bestaudio/best"
        };
        let output_args = vec![
            "-f", format_selector,
            "--concurrent-fragments", "4",
            "--output", &output_pattern,
            &target_url,
        ];

        // Try IPv6 first when available; fall back to IPv4, Companion, or direct connection on errors
        let mut use_ipv6 = Self::ipv6_connectivity();
        let mut skip_cookies = false;
        let mut use_alt_clients = false;
        let mut disable_proxy = false;

        let _ytdlp_permit = sync_ytdlp_gate().acquire();

        // Retry with fallbacks for transient 429 / proxy / rejected cookies / IPv6 errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_options_vec(
                use_ipv6,
                skip_cookies,
                use_alt_clients,
                disable_proxy,
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
            if Self::is_proxy_error(&stderr) && !disable_proxy && attempt < 2 {
                Self::invalidate_warp_probe_cache();
                disable_proxy = true;
                if let Some(companion_file) = self.try_companion_download(&video_id, prefer_m4a) {
                    return Ok(companion_file);
                }
                println!("[Stream] WARP proxy unreachable, retrying direct connection...");
            } else if Self::is_rejected_cookie_error(&stderr) {
                // Fast-path fallback: if Invidious Companion is reachable (local or Tailscale),
                // download the audio stream in 2 MiB Range chunks in <1s instead of failing on IPv4.
                if let Some(companion_file) = self.try_companion_download(&video_id, prefer_m4a) {
                    return Ok(companion_file);
                }
                if attempt < 2 {
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
                }
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
            if map.len() > 256 {
                map.retain(|_, v| Arc::strong_count(v) > 1);
            }
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

        // Try IPv6 first when available; fall back to IPv4 or direct connection on errors
        let mut use_ipv6 = Self::ipv6_connectivity();
        let mut skip_cookies = false;
        let mut use_alt_clients = false;
        let mut disable_proxy = false;

        let _ytdlp_permit = sync_ytdlp_gate().acquire();

        // Retry up to 2 times with backoff for transient 429 / proxy / network errors
        let mut last_err = String::new();
        for attempt in 0..3 {
            let all_args = Self::yt_dlp_args_with_options_vec(
                use_ipv6,
                skip_cookies,
                use_alt_clients,
                disable_proxy,
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
            if Self::is_proxy_error(&stderr) && !disable_proxy && attempt < 2 {
                Self::invalidate_warp_probe_cache();
                disable_proxy = true;
                println!("[Download] WARP proxy unreachable, retrying direct connection...");
            } else if Self::is_rejected_cookie_error(&stderr) && attempt < 2 {
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
        let cache_key = query.trim().to_lowercase();
        {
            let cache = self.artist_photo_cache.read().await;
            if let Some((ts, photo)) = cache.get(&cache_key) {
                if ts.elapsed() < Duration::from_secs(6 * 3600) {
                    return Ok(photo.clone());
                }
            }
        }
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

        // Fast path: direct InnerTube artist search (~350-600ms, zero subprocess)
        let photo = self
            .fetch_innertube_artist_photo(query)
            .await
            .unwrap_or_else(|| self.get_placeholder_image(query));

        let mut cache = self.artist_photo_cache.write().await;
        if cache.len() >= 1000 {
            cache.retain(|_, (ts, _)| ts.elapsed() < Duration::from_secs(6 * 3600));
            if cache.len() >= 1000 {
                cache.clear();
            }
        }
        cache.insert(cache_key, (Instant::now(), photo.clone()));
        Ok(photo)
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
        let cache_key = format!("{}:{}:{}", seed.trim().to_lowercase(), seed_type, limit);
        {
            let cache = self.recommendations_cache.read().await;
            if let Some((ts, rec)) = cache.get(&cache_key) {
                if ts.elapsed() < Duration::from_secs(1800) {
                    println!("[Recommendations] Cache Hit: {}", cache_key);
                    return Ok(rec.clone());
                }
            }
        }

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

        // Fetch real artist photos concurrently (cap to top 5 for speed)
        unique_artist_names.truncate(5);
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

        let rec = crate::api::Recommendations {
            tracks,
            albums,
            playlists,
            artists,
        };
        if !rec.tracks.is_empty() || !rec.artists.is_empty() {
            let mut cache = self.recommendations_cache.write().await;
            if cache.len() >= 300 {
                cache.retain(|_, (ts, _)| ts.elapsed() < Duration::from_secs(1800));
                if cache.len() >= 300 {
                    cache.clear();
                }
            }
            cache.insert(cache_key, (Instant::now(), rec.clone()));
        }

        Ok(rec)
    }
}
