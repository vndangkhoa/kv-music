use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
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
    #[serde(default)]
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

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct UserPlaylistBundle {
    #[serde(default)]
    pub playlists: Vec<UserPlaylistRecord>,
    #[serde(default, alias = "removedPlaylistIds")]
    pub removed_playlist_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum StoredUserPlaylists {
    Bundle(UserPlaylistBundle),
    Legacy(Vec<UserPlaylistRecord>),
}

#[derive(Clone)]
pub struct PlaylistStore {
    data: Arc<RwLock<HashMap<String, UserPlaylistBundle>>>,
    file_path: String,
}

pub fn is_legacy_system_id(id: &str) -> bool {
    id.starts_with("playlist-system-")
}

pub fn is_curated_or_external_id(id: &str) -> bool {
    id.starts_with("playlist-")
        || id.starts_with("discovery-")
        || id.starts_with("VLPL")
        || id.starts_with("PL")
}

fn sanitize_playlists(mut playlists: Vec<UserPlaylistRecord>) -> Vec<UserPlaylistRecord> {
    let now = now_millis();
    let mut seen = HashSet::new();
    let mut clean = Vec::with_capacity(playlists.len());

    for mut p in playlists.drain(..) {
        let id = p.id.trim().to_string();
        let title = p.title.trim().to_string();
        if id.is_empty() || title.is_empty() || is_legacy_system_id(&id) {
            continue;
        }
        if !seen.insert(id.clone()) {
            continue;
        }
        p.id = id;
        p.title = title;
        if p.created_at <= 0 {
            p.created_at = now;
        }
        if p.updated_at <= 0 {
            p.updated_at = p.created_at;
        }
        p.tracks.retain(|t| !t.id.trim().is_empty());
        p.tracks.truncate(500);
        clean.push(p);
        if clean.len() >= 100 {
            break;
        }
    }
    clean
}

fn sanitize_removed_ids(ids: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut clean = Vec::with_capacity(ids.len());
    for raw in ids {
        let id = raw.trim().to_string();
        if id.is_empty() {
            continue;
        }
        if seen.insert(id.clone()) {
            clean.push(id);
            if clean.len() >= 500 {
                break;
            }
        }
    }
    clean
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
        if content.trim().is_empty() {
            return;
        }
        let parsed = match serde_json::from_str::<HashMap<String, StoredUserPlaylists>>(&content) {
            Ok(m) => m,
            Err(e) => {
                eprintln!(
                    "WARNING: user_playlists.json at {} failed to parse: {}",
                    self.file_path, e
                );
                return;
            }
        };
        let converted: HashMap<String, UserPlaylistBundle> = parsed
            .into_iter()
            .map(|(uid, entry)| {
                let bundle = match entry {
                    StoredUserPlaylists::Bundle(b) => UserPlaylistBundle {
                        playlists: sanitize_playlists(b.playlists),
                        removed_playlist_ids: sanitize_removed_ids(b.removed_playlist_ids),
                    },
                    StoredUserPlaylists::Legacy(list) => UserPlaylistBundle {
                        playlists: sanitize_playlists(list),
                        removed_playlist_ids: Vec::new(),
                    },
                };
                (uid, bundle)
            })
            .collect();

        if let Ok(mut guard) = self.data.write() {
            *guard = converted;
        }
    }

    fn save_snapshot(
        file_path: &str,
        snapshot: &HashMap<String, UserPlaylistBundle>,
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

    pub fn get_bundle_for_user(&self, user_id: &str) -> UserPlaylistBundle {
        self.data
            .read()
            .ok()
            .and_then(|guard| guard.get(user_id).cloned())
            .unwrap_or_default()
    }

    pub fn get_for_user(&self, user_id: &str) -> Vec<UserPlaylistRecord> {
        self.get_bundle_for_user(user_id).playlists
    }

    pub fn set_for_user(
        &self,
        user_id: &str,
        playlists: Vec<UserPlaylistRecord>,
        removed_playlist_ids: Option<Vec<String>>,
    ) -> Result<UserPlaylistBundle, String> {
        let clean_playlists = sanitize_playlists(playlists);
        let (bundle, snapshot) = {
            let mut guard = self
                .data
                .write()
                .map_err(|_| "Playlist store lock poisoned".to_string())?;
            let existing_removed = guard
                .get(user_id)
                .map(|b| b.removed_playlist_ids.clone())
                .unwrap_or_default();
            let clean_removed = match removed_playlist_ids {
                Some(ids) => sanitize_removed_ids(ids),
                None => existing_removed,
            };
            let bundle = UserPlaylistBundle {
                playlists: clean_playlists,
                removed_playlist_ids: clean_removed,
            };
            guard.insert(user_id.to_string(), bundle.clone());
            (bundle, guard.clone())
        };

        Self::save_snapshot(&self.file_path, &snapshot)?;
        Ok(bundle)
    }

    pub fn create_for_user(
        &self,
        user_id: &str,
        mut record: UserPlaylistRecord,
    ) -> Result<UserPlaylistRecord, String> {
        let title = record.title.trim().to_string();
        if title.is_empty() {
            return Err("Playlist title is required".to_string());
        }
        let now = now_millis();
        let id = record.id.trim().to_string();
        record.id = if id.is_empty() {
            generate_playlist_id(now)
        } else {
            id
        };
        if is_legacy_system_id(&record.id) {
            return Err("Invalid playlist ID".to_string());
        }
        record.title = title;
        if record.created_at <= 0 {
            record.created_at = now;
        }
        if record.updated_at <= 0 {
            record.updated_at = now;
        }
        record.tracks.retain(|t| !t.id.trim().is_empty());
        record.tracks.truncate(500);
        if record.cover_url.as_deref().unwrap_or("").is_empty() {
            if let Some(first_cover) = record.tracks.first().map(|t| t.cover_url.clone()) {
                if !first_cover.is_empty() {
                    record.cover_url = Some(first_cover);
                }
            }
        }

        let snapshot = {
            let mut guard = self
                .data
                .write()
                .map_err(|_| "Playlist store lock poisoned".to_string())?;
            let bundle = guard.entry(user_id.to_string()).or_default();
            bundle.playlists.retain(|p| p.id != record.id);
            bundle.playlists.insert(0, record.clone());
            bundle.playlists.truncate(100);
            guard.clone()
        };

        Self::save_snapshot(&self.file_path, &snapshot)?;
        Ok(record)
    }

    pub fn delete_for_user(
        &self,
        user_id: &str,
        playlist_id: &str,
    ) -> Result<UserPlaylistBundle, String> {
        let target_id = playlist_id.trim();
        if target_id.is_empty() {
            return Err("Playlist ID is required".to_string());
        }
        let (bundle, snapshot) = {
            let mut guard = self
                .data
                .write()
                .map_err(|_| "Playlist store lock poisoned".to_string())?;
            let bundle = guard.entry(user_id.to_string()).or_default();
            bundle.playlists.retain(|p| p.id != target_id);
            if is_curated_or_external_id(target_id)
                && !bundle.removed_playlist_ids.iter().any(|id| id == target_id)
            {
                bundle.removed_playlist_ids.push(target_id.to_string());
                bundle.removed_playlist_ids =
                    sanitize_removed_ids(std::mem::take(&mut bundle.removed_playlist_ids));
            }
            (bundle.clone(), guard.clone())
        };

        Self::save_snapshot(&self.file_path, &snapshot)?;
        Ok(bundle)
    }
}

fn generate_playlist_id(now: i64) -> String {
    use rand::Rng;
    let suffix: u32 = rand::rng().random_range(100000..999999);
    format!("user-pl-{}-{}", now, suffix)
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "kvmusic_playlist_test_{}_{}_{}",
            name,
            now_millis(),
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir.join("user_playlists.json")
    }

    #[test]
    fn loads_legacy_array_format_and_preserves_removed_on_none() {
        let file = temp_file("legacy");
        let legacy_json = r#"{
            "user_1": [
                {
                    "id": "user-pl-1",
                    "title": "Roadtrip",
                    "tracks": [],
                    "created_at": 1000,
                    "updated_at": 1000
                },
                {
                    "id": "playlist-system-weekend",
                    "title": "Weekend Vibes",
                    "tracks": [],
                    "created_at": 1000,
                    "updated_at": 1000
                }
            ]
        }"#;
        std::fs::write(&file, legacy_json).unwrap();

        let store = PlaylistStore::new(file.to_string_lossy().into_owned());
        let bundle = store.get_bundle_for_user("user_1");
        assert_eq!(bundle.playlists.len(), 1);
        assert_eq!(bundle.playlists[0].id, "user-pl-1");
        assert!(bundle.removed_playlist_ids.is_empty());

        let after_curated_delete = store
            .delete_for_user("user_1", "playlist-SoundCloud-Weekly-Charts")
            .unwrap();
        assert_eq!(
            after_curated_delete.removed_playlist_ids,
            vec!["playlist-SoundCloud-Weekly-Charts"]
        );

        // Passing None (e.g. Android client) keeps removed_playlist_ids intact
        let after_put = store
            .set_for_user("user_1", bundle.playlists.clone(), None)
            .unwrap();
        assert_eq!(
            after_put.removed_playlist_ids,
            vec!["playlist-SoundCloud-Weekly-Charts"]
        );

        let _ = std::fs::remove_dir_all(file.parent().unwrap());
    }

    #[test]
    fn create_delete_and_persist_across_reload() {
        let file = temp_file("crud");
        let file_str = file.to_string_lossy().into_owned();

        let created = {
            let store = PlaylistStore::new(file_str.clone());
            let c = store
                .create_for_user(
                    "user_2",
                    UserPlaylistRecord {
                        id: "".to_string(),
                        title: "My Mix".to_string(),
                        description: Some("Chill".to_string()),
                        cover_url: None,
                        tracks: vec![],
                        created_at: 0,
                        updated_at: 0,
                    },
                )
                .unwrap();
            assert!(c.id.starts_with("user-pl-"));
            store
                .delete_for_user("user_2", "playlist-Anime-Hits")
                .unwrap();
            c
        };

        let store2 = PlaylistStore::new(file_str.clone());
        let bundle = store2.get_bundle_for_user("user_2");
        assert_eq!(bundle.playlists.len(), 1);
        assert_eq!(bundle.playlists[0].id, created.id);
        assert_eq!(bundle.removed_playlist_ids, vec!["playlist-Anime-Hits"]);

        let after_del = store2.delete_for_user("user_2", &created.id).unwrap();
        assert!(after_del.playlists.is_empty());
        // Deleting a user-owned playlist does not pollute removed_playlist_ids
        assert_eq!(after_del.removed_playlist_ids, vec!["playlist-Anime-Hits"]);

        let _ = std::fs::remove_dir_all(file.parent().unwrap());
    }
}
