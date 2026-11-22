use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserPlaylistTrack {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub artist: String,
    #[serde(default)]
    pub album: String,
    #[serde(default, alias = "coverUrl")]
    pub cover_url: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub duration: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserPlaylistRecord {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, alias = "coverUrl")]
    pub cover_url: Option<String>,
    #[serde(default)]
    pub tracks: Vec<UserPlaylistTrack>,
    #[serde(default, alias = "createdAt")]
    pub created_at: i64,
    #[serde(default, alias = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Clone)]
pub struct PlaylistStore {
    data: Arc<RwLock<HashMap<String, Vec<UserPlaylistRecord>>>>,
    file_path: String,
}

impl PlaylistStore {
    pub fn new(file_path: String) -> Self {
        let store = Self {
            data: Arc::new(RwLock::new(HashMap::new())),
            file_path,
        };
        store.load();
        store
    }

    fn load(&self) {
        let content = match std::fs::read_to_string(&self.file_path) {
            Ok(c) => c,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return,
            Err(e) => {
                eprintln!(
                    "WARNING: user_playlists.json unreadable at {}: {}",
                    self.file_path, e
                );
                return;
            }
        };
        let parsed = match serde_json::from_str::<HashMap<String, Vec<UserPlaylistRecord>>>(&content)
        {
            Ok(m) => m,
            Err(e) => {
                eprintln!(
                    "WARNING: user_playlists.json at {} failed to parse: {}",
                    self.file_path, e
                );
                return;
            }
        };
        if let Ok(mut guard) = self.data.write() {
            *guard = parsed;
        }
    }

    fn save_snapshot(
        file_path: &str,
        snapshot: &HashMap<String, Vec<UserPlaylistRecord>>,
    ) -> Result<(), String> {
        if let Some(parent) = std::path::Path::new(file_path).parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create playlist dir: {}", e))?;
            }
        }
        let json = serde_json::to_string_pretty(snapshot)
            .map_err(|e| format!("Failed to serialize playlists: {}", e))?;
        let tmp_path = format!("{}.tmp", file_path);
        std::fs::write(&tmp_path, json)
            .map_err(|e| format!("Failed to write playlist temp file: {}", e))?;
        std::fs::rename(&tmp_path, file_path)
            .map_err(|e| format!("Failed to commit playlist store: {}", e))?;
        Ok(())
    }

    pub fn get_for_user(&self, user_id: &str) -> Vec<UserPlaylistRecord> {
        self.data
            .read()
            .ok()
            .and_then(|guard| guard.get(user_id).cloned())
            .unwrap_or_default()
    }

    pub fn set_for_user(
        &self,
        user_id: &str,
        mut playlists: Vec<UserPlaylistRecord>,
    ) -> Result<Vec<UserPlaylistRecord>, String> {
        let now = now_millis();
        playlists.retain(|p| !p.id.trim().is_empty() && !p.title.trim().is_empty());
        playlists.truncate(100);

        for p in &mut playlists {
            p.id = p.id.trim().to_string();
            p.title = p.title.trim().to_string();
            if p.created_at <= 0 {
                p.created_at = now;
            }
            if p.updated_at <= 0 {
                p.updated_at = p.created_at;
            }
            p.tracks.retain(|t| !t.id.trim().is_empty());
            p.tracks.truncate(500);
        }

        let snapshot = {
            let mut guard = self
                .data
                .write()
                .map_err(|_| "Playlist store lock poisoned".to_string())?;
            guard.insert(user_id.to_string(), playlists.clone());
            guard.clone()
        };

        Self::save_snapshot(&self.file_path, &snapshot)?;
        Ok(playlists)
    }
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
