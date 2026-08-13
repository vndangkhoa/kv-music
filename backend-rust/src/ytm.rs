use std::process::Command;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Thin wrapper over the ytmusicapi Python bridge. Results are cached in memory
/// so repeated hits (e.g. search-as-you-type) stay instant.
pub struct YtmBridge {
    cache: Arc<RwLock<HashMap<String, (Instant, String)>>>,
    cache_ttl: Duration,
}

impl YtmBridge {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl: Duration::from_secs(30 * 60),
        }
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
        let key = format!("sug:{}", query);
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
