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
        let Ok(content) = std::fs::read_to_string(&self.file_path) else { return };
        let Ok(users) = serde_json::from_str::<Vec<UserRecord>>(&content) else { return };
        if let Ok(mut map) = self.users.write() {
            for u in users {
                map.insert(u.id.clone(), u);
            }
        }
    }

    fn save(&self) {
        let list: Vec<UserRecord> = match self.users.read() {
            Ok(users) => users.values().cloned().collect(),
            Err(_) => return,
        };
        if let Some(parent) = std::path::Path::new(&self.file_path).parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(&list) {
            let _ = std::fs::write(&self.file_path, json);
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
        {
            let mut users = self.users.write().map_err(|e| e.to_string())?;
            if let Some(u) = users.get_mut(&user_id) {
                u.pair_code = code.clone();
            }
        }
        self.pair_codes.write().map_err(|e| e.to_string())?.insert(code.clone(), user_id);
        self.save();
        Ok(code)
    }

    pub async fn link_pair_code(&self, code: &str) -> Option<(UserRecord, String)> {
        let formatted = code.trim().to_uppercase();
        let user_id = {
            let codes = self.pair_codes.read().ok()?;
            codes.get(&formatted)?.clone()
        };
        let user = self.get_user(&user_id).await?;
        let token = Self::generate_token();
        self.sessions.write().ok()?.insert(token.clone(), user.id.clone());
        Some((user, token))
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
