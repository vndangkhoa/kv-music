use std::process::Command;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Thin wrapper over YouTube Music search/home APIs with ytmusicapi fallback.
/// Results are cached in memory so repeated hits (e.g. search-as-you-type) stay instant.
pub struct YtmBridge {
    cache: Arc<RwLock<HashMap<String, (Instant, String)>>>,
    cache_ttl: Duration,
    http: reqwest::Client,
}

impl YtmBridge {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap_or_default();
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl: Duration::from_secs(30 * 60),
            http,
        }
    }

    fn collect_innertube_suggestions(value: &serde_json::Value, out: &mut Vec<String>) {
        match value {
            serde_json::Value::Array(arr) => {
                for item in arr {
                    Self::collect_innertube_suggestions(item, out);
                }
            }
            serde_json::Value::Object(map) => {
                if let Some(renderer) = map.get("searchSuggestionRenderer") {
                    let query = renderer
                        .get("navigationEndpoint")
                        .and_then(|ne| ne.get("searchEndpoint"))
                        .and_then(|se| se.get("query"))
                        .and_then(|q| q.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| {
                            renderer
                                .get("suggestion")
                                .and_then(|s| s.get("runs"))
                                .and_then(|r| r.as_array())
                                .map(|runs| {
                                    runs.iter()
                                        .filter_map(|r| r.get("text").and_then(|t| t.as_str()))
                                        .collect::<String>()
                                })
                        });
                    if let Some(q) = query {
                        let trimmed = q.trim().to_string();
                        if !trimmed.is_empty() && !out.contains(&trimmed) {
                            out.push(trimmed);
                        }
                    }
                }
                for v in map.values() {
                    Self::collect_innertube_suggestions(v, out);
                }
            }
            _ => {}
        }
    }

    async fn fetch_innertube_suggestions(&self, query: &str) -> Option<String> {
        let body = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20260808.01.00",
                    "hl": "en"
                }
            },
            "input": query
        });

        let res = self.http
            .post("https://music.youtube.com/youtubei/v1/music/get_search_suggestions")
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
        let mut suggestions = Vec::new();
        Self::collect_innertube_suggestions(&json, &mut suggestions);
        if suggestions.is_empty() {
            return None;
        }
        serde_json::to_string(&suggestions).ok()
    }

    /// Locate the bridge script next to the executable or in the source tree.
    fn script_path() -> String {
        let exe = std::env::current_exe().ok();
        if let Some(path) = exe {
            if let Some(dir) = path.parent() {
                for candidate in [
                    dir.join("scripts/ytm_bridge.py"),
                    dir.join("ytm_bridge.py"),
                ] {
                    if candidate.exists() {
                        return candidate.to_string_lossy().to_string();
                    }
                }
            }
        }
        // Fallback: source-tree locations (dev runs)
        for candidate in [
            "scripts/ytm_bridge.py",
            "backend-rust/scripts/ytm_bridge.py",
        ] {
            if std::path::Path::new(candidate).exists() {
                return candidate.to_string();
            }
        }
        "scripts/ytm_bridge.py".to_string()
    }

    async fn run_cached(&self, key: &str, args: Vec<String>) -> String {
        {
            let cache = self.cache.read().await;
            if let Some((ts, val)) = cache.get(key) {
                if ts.elapsed() < self.cache_ttl {
                    return val.clone();
                }
            }
        }

        let script = Self::script_path();
        let output = tokio::task::spawn_blocking(move || {
            Command::new("python3")
                .arg(&script)
                .args(&args)
                .output()
        })
        .await;

        let text = match output {
            Ok(Ok(out)) if out.status.success() => String::from_utf8_lossy(&out.stdout).to_string(),
            _ => r#"{"error":"bridge failed"}"#.to_string(),
        };

        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), (Instant::now(), text.clone()));
        text
    }

    pub async fn suggestions(&self, query: &str) -> String {
        let key = format!("sug:{}", query.to_lowercase());
        {
            let cache = self.cache.read().await;
            if let Some((ts, val)) = cache.get(&key) {
                if ts.elapsed() < self.cache_ttl {
                    return val.clone();
                }
            }
        }

        // Fast path: direct innerTube HTTP call (~50ms, no Python subprocess)
        if let Some(json) = self.fetch_innertube_suggestions(query).await {
            let mut cache = self.cache.write().await;
            cache.insert(key, (Instant::now(), json.clone()));
            return json;
        }

        // Fallback to Python ytmusicapi bridge
        self.run_cached(&key, vec!["suggestions".to_string(), query.to_string()]).await
    }

    pub async fn home(&self) -> String {
        self.run_cached("home", vec!["home".to_string()]).await
    }
}

impl Default for YtmBridge {
    fn default() -> Self {
        Self::new()
    }
}
