use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

pub struct AuthStore {
    users: Arc<RwLock<HashMap<String, UserRecord>>>,
    sessions: Arc<RwLock<HashMap<String, String>>>, // token -> user id
    pair_codes: Arc<RwLock<HashMap<String, String>>>, // pair code -> user id
    file_path: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserRecord {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub avatar_color: String,
    pub pair_code: String,
    pub created_at: i64,
}

impl AuthStore {
    pub fn new(file_path: String) -> Self {
        let store = Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            sessions: Arc::new(RwLock::new(HashMap::new())),
            pair_codes: Arc::new(RwLock::new(HashMap::new())),
            file_path,
        };
        store.load();
        store
    }

    fn load(&self) {
        let content = match std::fs::read_to_string(&self.file_path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!(
                    "ERROR: users.json unreadable at {}: {} — all logins will fail until fixed",
                    self.file_path, e
                );
                return;
            }
        };
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

    fn save(&self) {
        let list: Vec<UserRecord> = match self.users.read() {
            Ok(users) => users.values().cloned().collect(),
            Err(_) => return,
        };
        if let Some(parent) = std::path::Path::new(&self.file_path).parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                eprintln!(
                    "ERROR: failed to create directory {} for users.json: {}",
                    parent.display(),
                    e
                );
            }
        }
        let json = match serde_json::to_string_pretty(&list) {
            Ok(j) => j,
            Err(e) => {
                eprintln!("ERROR: failed to serialize users for {}: {}", self.file_path, e);
                return;
            }
        };
        if let Err(e) = std::fs::write(&self.file_path, json) {
            eprintln!(
                "ERROR: failed to save users.json at {}: {} — registrations will be lost on restart",
                self.file_path, e
            );
        }
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
        let Ok(parsed) = PasswordHash::new(hash) else { return false };
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok()
    }

    pub async fn register(&self, name: &str, email: &str, password: &str, avatar_color: &str) -> Result<(UserRecord, String), String> {
        let email = email.trim().to_lowercase();
        if password.len() < 6 {
            return Err("Mật khẩu phải có ít nhất 6 ký tự".to_string());
        }
        {
            let users = self.users.read().map_err(|e| e.to_string())?;
            if users.values().any(|u| u.email == email) {
                return Err("Email đã được đăng ký".to_string());
            }
        }
        let password_hash = Self::hash_password(password)?;
        let pair_code = self.generate_pair_code();
        let user = UserRecord {
            id: format!("user_{}", Self::generate_token().chars().take(12).collect::<String>()),
            name: name.trim().to_string(),
            email,
            password_hash,
            avatar_color: avatar_color.to_string(),
            pair_code: pair_code.clone(),
            created_at: chrono_now(),
        };
        {
            let mut users = self.users.write().map_err(|e| e.to_string())?;
            users.insert(user.id.clone(), user.clone());
        }
        {
            let mut codes = self.pair_codes.write().map_err(|e| e.to_string())?;
            codes.insert(pair_code, user.id.clone());
        }
        self.save();
        let token = Self::generate_token();
        self.sessions.write().map_err(|e| e.to_string())?.insert(token.clone(), user.id.clone());
        Ok((user, token))
    }

    pub async fn login(&self, email: &str, password: &str) -> Result<(UserRecord, String), String> {
        let email = email.trim().to_lowercase();
        let users = self.users.read().map_err(|e| e.to_string())?;
        let Some(user) = users.values().find(|u| u.email == email).cloned() else {
            return Err("Email hoặc mật khẩu không đúng".to_string());
        };
        if !Self::verify_password(password, &user.password_hash) {
            return Err("Email hoặc mật khẩu không đúng".to_string());
        }
        drop(users);
        let token = Self::generate_token();
        self.sessions.write().map_err(|e| e.to_string())?.insert(token.clone(), user.id.clone());
        Ok((user, token))
    }

    pub async fn logout(&self, token: &str) {
        if let Ok(mut sessions) = self.sessions.write() {
            sessions.remove(token);
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

    pub async fn generate_pair_code_for(&self, token: &str) -> Result<String, String> {
        let user_id = {
            let sessions = self.sessions.read().map_err(|e| e.to_string())?;
            sessions.get(token).cloned().ok_or("Chưa đăng nhập")?
        };
        let code = self.generate_pair_code();
        let old_code = {
            let mut users = self.users.write().map_err(|e| e.to_string())?;
            users
                .get_mut(&user_id)
                .map(|u| std::mem::replace(&mut u.pair_code, code.clone()))
        };
        {
            let mut codes = self.pair_codes.write().map_err(|e| e.to_string())?;
            if let Some(old) = old_code {
                if !old.is_empty() {
                    codes.remove(&old);
                }
            }
            codes.insert(code.clone(), user_id);
        }
        self.save();
        Ok(code)
    }

    pub async fn link_pair_code(&self, code: &str) -> Option<(UserRecord, String)> {
        let formatted = code.trim().to_uppercase();
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
        self.save();
        eprintln!("[DEBUG] pair link attempt resolved");
        Some((linked_user, token))
    }
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

#[derive(Serialize)]
pub struct AuthResponse {
    pub user: UserRecord,
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
