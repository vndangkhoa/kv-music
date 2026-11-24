use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, RwLock};

#[derive(Debug, PartialEq, Eq)]
pub enum AuthError {
    Validation(String),
    Conflict(String),
    Unauthorized(String),
    Storage(String),
}

impl AuthError {
    pub fn message(&self) -> &str {
        match self {
            AuthError::Validation(msg)
            | AuthError::Conflict(msg)
            | AuthError::Unauthorized(msg)
            | AuthError::Storage(msg) => msg,
        }
    }
}

pub struct AuthStore {
    users: Arc<RwLock<HashMap<String, UserRecord>>>,
    sessions: Arc<RwLock<HashMap<String, String>>>, // token -> user id
    pair_codes: Arc<RwLock<HashMap<String, String>>>, // pair code -> user id
    file_path: String,
    sessions_path: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserRecord {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub password_hash: String,
    #[serde(default)]
    pub avatar_color: String,
    #[serde(default)]
    pub pair_code: String,
    #[serde(default)]
    pub created_at: i64,
}

impl AuthStore {
    pub fn new(file_path: String) -> Self {
        let sessions_path = derive_sessions_path(&file_path);
        let store = Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            sessions: Arc::new(RwLock::new(HashMap::new())),
            pair_codes: Arc::new(RwLock::new(HashMap::new())),
            file_path,
            sessions_path,
        };
        store.load();
        store.load_sessions();
        store
    }

    fn load(&self) {
        let content = match std::fs::read_to_string(&self.file_path) {
            Ok(c) => c,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return,
            Err(e) => {
                eprintln!(
                    "ERROR: users.json unreadable at {}: {} — all logins will fail until fixed",
                    self.file_path, e
                );
                return;
            }
        };
        if content.trim().is_empty() {
            return;
        }
        let users = match serde_json::from_str::<Vec<UserRecord>>(&content) {
            Ok(u) => u,
            Err(e) => {
                eprintln!(
                    "ERROR: users.json at {} is corrupt or schema-drifted, ignoring contents: {}",
                    self.file_path, e
                );
                return;
            }
        };
        let mut missing_hash_count = 0usize;
        for u in &users {
            if u.password_hash.trim().is_empty() {
                missing_hash_count += 1;
            }
        }
        if missing_hash_count > 0 {
            eprintln!(
                "WARNING: {} user record(s) in {} have an empty password_hash (legacy bug); those accounts cannot log in with password until re-registered",
                missing_hash_count, self.file_path
            );
        }
        {
            let mut map = match self.users.write() {
                Ok(m) => m,
                Err(_) => return,
            };
            for u in &users {
                map.insert(u.id.clone(), u.clone());
            }
        }
        {
            let mut codes = match self.pair_codes.write() {
                Ok(c) => c,
                Err(_) => return,
            };
            for u in users {
                if !u.pair_code.is_empty() {
                    codes.insert(u.pair_code.clone(), u.id.clone());
                }
            }
        }
    }

    fn load_sessions(&self) {
        let content = match std::fs::read_to_string(&self.sessions_path) {
            Ok(c) => c,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return,
            Err(e) => {
                eprintln!(
                    "WARNING: sessions.json unreadable at {}: {}",
                    self.sessions_path, e
                );
                return;
            }
        };
        if content.trim().is_empty() {
            return;
        }
        let parsed = match serde_json::from_str::<HashMap<String, String>>(&content) {
            Ok(s) => s,
            Err(e) => {
                eprintln!(
                    "WARNING: sessions.json at {} failed to parse: {}",
                    self.sessions_path, e
                );
                return;
            }
        };
        let valid_users: std::collections::HashSet<String> = match self.users.read() {
            Ok(u) => u.keys().cloned().collect(),
            Err(_) => return,
        };
        if let Ok(mut sessions) = self.sessions.write() {
            for (token, user_id) in parsed {
                if !token.trim().is_empty() && valid_users.contains(&user_id) {
                    sessions.insert(token, user_id);
                }
            }
        }
    }

    fn save(&self) -> Result<(), String> {
        let list: Vec<UserRecord> = self
            .users
            .read()
            .map_err(|_| "User store lock poisoned".to_string())?
            .values()
            .cloned()
            .collect();
        write_json_atomic(&self.file_path, &list)
    }

    fn save_sessions(&self) -> Result<(), String> {
        let snapshot: HashMap<String, String> = self
            .sessions
            .read()
            .map_err(|_| "Session store lock poisoned".to_string())?
            .clone();
        write_json_atomic(&self.sessions_path, &snapshot)
    }

    fn generate_token() -> String {
        use rand::RngCore;
        let mut rng = rand::rng();
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);
        bytes.iter().map(|b| format!("{:02x}", b)).collect()
    }

    fn generate_pair_code(&self) -> String {
        use rand::Rng;
        let mut rng = rand::rng();
        let num: u32 = rng.random_range(100000..1000000);
        format!("KV-{}", num)
    }

    fn hash_password(password: &str) -> Result<String, String> {
        use rand::RngCore;
        let mut rng = rand::rng();
        let mut salt_bytes = [0u8; 16];
        rng.fill_bytes(&mut salt_bytes);
        let salt = SaltString::encode_b64(&salt_bytes).map_err(|e| format!("Salt error: {}", e))?;
        Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map(|h| h.to_string())
            .map_err(|e| format!("Hash error: {}", e))
    }

    fn verify_password(password: &str, hash: &str) -> bool {
        if hash.trim().is_empty() {
            return false;
        }
        let Ok(parsed) = PasswordHash::new(hash) else {
            return false;
        };
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok()
    }

    pub async fn register(
        &self,
        name: &str,
        email: &str,
        password: &str,
        avatar_color: &str,
    ) -> Result<(UserRecord, String), AuthError> {
        let trimmed_name = name.trim();
        if trimmed_name.is_empty() {
            return Err(AuthError::Validation("Name is required".to_string()));
        }
        let email = email.trim().to_lowercase();
        if !is_valid_email(&email) {
            return Err(AuthError::Validation("Please enter a valid email address".to_string()));
        }
        if password.chars().count() < 6 {
            return Err(AuthError::Validation(
                "Password must be at least 6 characters".to_string(),
            ));
        }

        let existing_legacy = {
            let users = self
                .users
                .read()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            if let Some(existing) = users.values().find(|u| u.email == email) {
                if !existing.password_hash.trim().is_empty() {
                    return Err(AuthError::Conflict(
                        "An account with this email already exists".to_string(),
                    ));
                }
                Some(existing.clone())
            } else {
                None
            }
        };

        let password_hash = Self::hash_password(password).map_err(AuthError::Storage)?;
        let pair_code = self.generate_pair_code();
        let user = match existing_legacy {
            Some(ref legacy) => UserRecord {
                id: legacy.id.clone(),
                name: trimmed_name.to_string(),
                email,
                password_hash,
                avatar_color: avatar_color.to_string(),
                pair_code: pair_code.clone(),
                created_at: if legacy.created_at > 0 {
                    legacy.created_at
                } else {
                    chrono_now()
                },
            },
            None => UserRecord {
                id: format!(
                    "user_{}",
                    Self::generate_token().chars().take(12).collect::<String>()
                ),
                name: trimmed_name.to_string(),
                email,
                password_hash,
                avatar_color: avatar_color.to_string(),
                pair_code: pair_code.clone(),
                created_at: chrono_now(),
            },
        };

        let previous_record: Option<UserRecord> = {
            let mut users = self
                .users
                .write()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            let mut prev = None;
            if let Some(existing) = users.values().find(|u| u.email == user.email) {
                if !existing.password_hash.trim().is_empty() {
                    return Err(AuthError::Conflict(
                        "An account with this email already exists".to_string(),
                    ));
                }
                prev = Some(existing.clone());
            }
            users.insert(user.id.clone(), user.clone());
            prev
        };
        {
            let mut codes = self
                .pair_codes
                .write()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            if let Some(ref prev) = previous_record {
                if !prev.pair_code.is_empty() {
                    codes.remove(&prev.pair_code);
                }
            }
            codes.insert(pair_code.clone(), user.id.clone());
        }

        if let Err(err) = self.save() {
            if let Ok(mut users) = self.users.write() {
                match previous_record {
                    Some(ref prev) => {
                        users.insert(user.id.clone(), prev.clone());
                    }
                    None => {
                        users.remove(&user.id);
                    }
                }
            }
            if let Ok(mut codes) = self.pair_codes.write() {
                codes.remove(&pair_code);
                if let Some(ref prev) = previous_record {
                    if !prev.pair_code.is_empty() {
                        codes.insert(prev.pair_code.clone(), prev.id.clone());
                    }
                }
            }
            return Err(AuthError::Storage(err));
        }

        let token = Self::generate_token();
        {
            let mut sessions = self
                .sessions
                .write()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            sessions.insert(token.clone(), user.id.clone());
        }
        if let Err(err) = self.save_sessions() {
            if let Ok(mut sessions) = self.sessions.write() {
                sessions.remove(&token);
            }
            return Err(AuthError::Storage(err));
        }
        Ok((user, token))
    }

    pub async fn login(&self, email: &str, password: &str) -> Result<(UserRecord, String), AuthError> {
        let email = email.trim().to_lowercase();
        let user = {
            let users = self
                .users
                .read()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            let Some(user) = users.values().find(|u| u.email == email).cloned() else {
                return Err(AuthError::Unauthorized(
                    "Incorrect email or password".to_string(),
                ));
            };
            user
        };
        if user.password_hash.trim().is_empty()
            || !Self::verify_password(password, &user.password_hash)
        {
            return Err(AuthError::Unauthorized(
                "Incorrect email or password".to_string(),
            ));
        }

        let token = Self::generate_token();
        {
            let mut sessions = self
                .sessions
                .write()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            sessions.insert(token.clone(), user.id.clone());
        }
        if let Err(err) = self.save_sessions() {
            if let Ok(mut sessions) = self.sessions.write() {
                sessions.remove(&token);
            }
            return Err(AuthError::Storage(err));
        }
        Ok((user, token))
    }

    pub async fn logout(&self, token: &str) {
        let removed = if let Ok(mut sessions) = self.sessions.write() {
            sessions.remove(token).is_some()
        } else {
            false
        };
        if removed {
            let _ = self.save_sessions();
        }
    }

    pub async fn me(&self, token: &str) -> Option<UserRecord> {
        let user_id = {
            let sessions = self.sessions.read().ok()?;
            sessions.get(token)?.clone()
        };
        let users = self.users.read().ok()?;
        users.get(&user_id).cloned()
    }

    pub async fn get_user(&self, user_id: &str) -> Option<UserRecord> {
        let users = self.users.read().ok()?;
        users.get(user_id).cloned()
    }

    pub async fn generate_pair_code_for(&self, token: &str) -> Result<String, AuthError> {
        let user_id = {
            let sessions = self
                .sessions
                .read()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            sessions
                .get(token)
                .cloned()
                .ok_or_else(|| AuthError::Unauthorized("Not signed in".to_string()))?
        };
        let code = self.generate_pair_code();
        let old_code = {
            let mut users = self
                .users
                .write()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            users
                .get_mut(&user_id)
                .map(|u| std::mem::replace(&mut u.pair_code, code.clone()))
        };
        {
            let mut codes = self
                .pair_codes
                .write()
                .map_err(|e| AuthError::Storage(e.to_string()))?;
            if let Some(ref old) = old_code {
                if !old.is_empty() {
                    codes.remove(old);
                }
            }
            codes.insert(code.clone(), user_id.clone());
        }
        if let Err(err) = self.save() {
            if let Ok(mut users) = self.users.write() {
                if let Some(u) = users.get_mut(&user_id) {
                    u.pair_code = old_code.clone().unwrap_or_default();
                }
            }
            if let Ok(mut codes) = self.pair_codes.write() {
                codes.remove(&code);
                if let Some(old) = old_code {
                    if !old.is_empty() {
                        codes.insert(old, user_id);
                    }
                }
            }
            return Err(AuthError::Storage(err));
        }
        Ok(code)
    }

    pub async fn link_pair_code(&self, code: &str) -> Option<(UserRecord, String)> {
        let raw = code.trim().to_uppercase();
        let formatted = if raw.len() == 6 && raw.chars().all(|c| c.is_ascii_digit()) {
            format!("KV-{}", raw)
        } else {
            raw
        };
        let user_id = match self.pair_codes.read().ok()?.get(&formatted).cloned() {
            Some(id) => id,
            None => {
                eprintln!("[DEBUG] pair link failed: code not found");
                return None;
            }
        };
        let user = match self.get_user(&user_id).await {
            Some(u) => u,
            None => {
                eprintln!("[DEBUG] pair link failed: user not found");
                return None;
            }
        };
        let token = Self::generate_token();
        self.sessions.write().ok()?.insert(token.clone(), user.id.clone());
        {
            let mut codes = self.pair_codes.write().ok()?;
            codes.remove(&formatted);
        }
        let mut linked_user = user;
        {
            let mut users = self.users.write().ok()?;
            if let Some(u) = users.get_mut(&user_id) {
                u.pair_code.clear();
            }
            linked_user.pair_code.clear();
        }
        let _ = self.save();
        let _ = self.save_sessions();
        eprintln!("[DEBUG] pair link attempt resolved");
        Some((linked_user, token))
    }
}

fn derive_sessions_path(users_file_path: &str) -> String {
    let path = Path::new(users_file_path);
    match path.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => {
            parent.join("sessions.json").to_string_lossy().into_owned()
        }
        _ => "sessions.json".to_string(),
    }
}

fn write_json_atomic<T: Serialize + ?Sized>(file_path: &str, value: &T) -> Result<(), String> {
    if let Some(parent) = Path::new(file_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
        }
    }
    let json = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Failed to serialize {}: {}", file_path, e))?;
    let tmp_path = format!("{}.tmp", file_path);
    std::fs::write(&tmp_path, json)
        .map_err(|e| format!("Failed to write {}: {}", tmp_path, e))?;
    std::fs::rename(&tmp_path, file_path)
        .map_err(|e| format!("Failed to commit {}: {}", file_path, e))?;
    Ok(())
}

fn is_valid_email(email: &str) -> bool {
    if email.is_empty() || email.chars().any(char::is_whitespace) {
        return false;
    }
    let Some((local, domain)) = email.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && !domain.is_empty()
        && !domain.contains('@')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && domain.contains('.')
}

fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub name: String,
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub avatar_color: String,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct PairLinkPayload {
    pub code: String,
}

#[derive(Deserialize)]
pub struct AuthToken {
    pub token: String,
}

pub fn public_user(user: &UserRecord) -> serde_json::Value {
    serde_json::json!({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_color": user.avatar_color,
        "pair_code": user.pair_code,
        "created_at": user.created_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "kvmusic_auth_test_{}_{}",
            name,
            chrono_now() ^ (std::process::id() as i64)
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[tokio::test]
    async fn register_and_login_persist_across_restart() {
        let dir = temp_dir("persist");
        let users_file = dir.join("users.json").to_string_lossy().into_owned();

        let (created, token) = {
            let store = AuthStore::new(users_file.clone());
            store
                .register("Alice", "Alice@Example.com", "secret123", "#ff5500")
                .await
                .expect("register should succeed")
        };

        let store2 = AuthStore::new(users_file.clone());
        let (logged_in, _) = store2
            .login("alice@example.com", "secret123")
            .await
            .expect("login after restart should succeed");
        assert_eq!(logged_in.id, created.id);

        let me = store2.me(&token).await.expect("session should survive restart");
        assert_eq!(me.id, created.id);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn validation_and_duplicate_email_errors() {
        let dir = temp_dir("validation");
        let users_file = dir.join("users.json").to_string_lossy().into_owned();
        let store = AuthStore::new(users_file);

        assert!(matches!(
            store.register("  ", "a@b.com", "123456", "").await,
            Err(AuthError::Validation(_))
        ));
        assert!(matches!(
            store.register("Bob", "not-an-email", "123456", "").await,
            Err(AuthError::Validation(_))
        ));
        assert!(matches!(
            store.register("Bob", "bob@test.com", "12345", "").await,
            Err(AuthError::Validation(_))
        ));

        store
            .register("Bob", "bob@test.com", "123456", "")
            .await
            .unwrap();
        assert!(matches!(
            store.register("Bob2", "BOB@test.com", "123456", "").await,
            Err(AuthError::Conflict(_))
        ));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn public_user_omits_password_hash() {
        let dir = temp_dir("public");
        let users_file = dir.join("users.json").to_string_lossy().into_owned();
        let store = AuthStore::new(users_file);
        let (user, _) = store
            .register("Carol", "carol@test.com", "pass1234", "")
            .await
            .unwrap();
        let json = public_user(&user);
        assert!(json.get("password_hash").is_none());
        assert_eq!(json.get("email").and_then(|v| v.as_str()), Some("carol@test.com"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn pair_code_accepts_prefixed_and_bare_six_digits() {
        let dir = temp_dir("pair");
        let users_file = dir.join("users.json").to_string_lossy().into_owned();
        let store = AuthStore::new(users_file);
        let (user, token) = store
            .register("Dave", "dave@test.com", "pass1234", "")
            .await
            .unwrap();

        let code1 = user.pair_code.clone();
        let (linked1, _) = store
            .link_pair_code(&code1)
            .await
            .expect("KV-XXXXXX code should link");
        assert_eq!(linked1.id, user.id);

        let code2 = store.generate_pair_code_for(&token).await.unwrap();
        let bare_digits = code2.strip_prefix("KV-").unwrap();
        let (linked2, _) = store
            .link_pair_code(bare_digits)
            .await
            .expect("bare 6-digit code should link");
        assert_eq!(linked2.id, user.id);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn register_repairs_legacy_record_without_password_hash() {
        let dir = temp_dir("legacy_repair");
        let users_file = dir.join("users.json").to_string_lossy().into_owned();
        let legacy_json = r##"[
          {
            "id": "user_legacy123456",
            "name": "Legacy User",
            "email": "legacy@example.com",
            "avatar_color": "#ff5500",
            "pair_code": "KV-111222",
            "created_at": 1700000000
          }
        ]"##;
        std::fs::write(&users_file, legacy_json).unwrap();

        let store = AuthStore::new(users_file.clone());
        assert!(store.login("legacy@example.com", "newpass123").await.is_err());

        let (repaired, token) = store
            .register("Legacy User Updated", "legacy@example.com", "newpass123", "#00b894")
            .await
            .expect("re-registering legacy record without password_hash should succeed");
        assert_eq!(repaired.id, "user_legacy123456");
        assert_eq!(repaired.created_at, 1700000000);
        assert!(!repaired.password_hash.is_empty());

        let store2 = AuthStore::new(users_file.clone());
        let (logged_in, _) = store2
            .login("legacy@example.com", "newpass123")
            .await
            .expect("login after restart should succeed");
        assert_eq!(logged_in.id, "user_legacy123456");
        assert_eq!(store2.me(&token).await.unwrap().id, "user_legacy123456");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
