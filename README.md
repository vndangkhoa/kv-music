# Spotify Clone 🎵

A fully functional Spotify-like web player built with **React (Vite)**, **Rust (Axum)**, and **TailwindCSS**. Features include real-time lyrics, custom playlists, and YouTube Music integration.

---

## 🚀 Quick Start (Docker)

### Option 1: Pull from Forgejo Registry
```bash
docker run -p 3110:8080 git.khoavo.myds.me/vndangkhoa/spotify-clone:v4
```
Open **[http://localhost:3110](http://localhost:3110)**.

### Option 2: Build Locally
```bash
docker build -t spotify-clone:v4 .
docker run -p 3110:8080 spotify-clone:v4
```

---

## 🐳 Docker Deployment

### Image Details
- **Registry**: `git.khoavo.myds.me/vndangkhoa/spotify-clone`
- **Tag**: `v4`
- **Architecture**: `linux/amd64`
- **Ports**: 
  - `8080` (Backend API)

### docker-compose.yml
```yaml
services:
  spotify-clone:
    image: git.khoavo.myds.me/vndangkhoa/spotify-clone:v4
    container_name: spotify-clone
    restart: unless-stopped
    ports:
      - "3110:8080"
    environment:
      - PORT=8080
    volumes:
      - ./data:/tmp/spotify-clone-downloads
      - ./cache:/tmp/spotify-clone-cache
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🖥️ Synology NAS Deployment (Container Manager)

### Step-by-Step for Synology Container Manager

1. **Create Shared Folders**: 
   - Open **File Station**.
   - Navigate to your `docker` share.
   - Create a folder named `spotify-clone`.
   - Inside `spotify-clone`, create two subfolders: `data` and `cache`.

2. **Project Setup (Docker Compose)**:
   - Open **Container Manager**.
   - Go to **Project** → **Create**.
   - **Project Name**: `spotify-clone`.
   - **Path**: Select the `/docker/spotify-clone` folder you just created.
   - **Source**: Choose **Create docker-compose.yml** and paste the content from below (ensure image tag is `v4`).
   - Click **Next** until finished.

3. **Registry (Alternative Method)**:
   - Go to **Registry** → **Settings** → **Add**.
   - Name: `Forgejo`
   - URL: `https://git.khoavo.myds.me`
   - Search for `spotify-clone` and download `v4`.
4. Go to **Image** → Select the image → **Run**.
5. Configure:
   - **Container Name**: `spotify-clone`
   - **Network**: Bridge
   - **Port Settings**: Local Port `3110` → Container Port `8080`
   - **Volume Settings**:
     - Create folder `/docker/spotify-clone/data` → `/tmp/spotify-clone-downloads`
     - Create folder `/docker/spotify-clone/cache` → `/tmp/spotify-clone-cache`
6. Click **Run**.

### Method B: Using Docker Compose

1. Create folder: `/volume1/docker/spotify-clone`
2. Save the `docker-compose.yml` above to that folder.
3. Open Container Manager → **Project** → **Create**.
4. Select the folder path.
5. The container will start automatically.
6. Access at `http://YOUR_NAS_IP:3110`

---

## 🔄 Auto-Refresh

The backend automatically fetches trending content from YouTube Music every 5 minutes. No additional setup required.

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- Rust 1.75+
- Python 3.11+
- ffmpeg

### Backend (Rust)
```bash
cd backend-rust
cargo run
```

### Frontend
```bash
cd frontend-vite
npm install
npm run dev
```

---

## ✨ Features

- **YouTube Music Integration**: Search and play from YouTube Music
- **Trending Auto-Fetch**: 15+ categories updated every 5 minutes
- **Real-Time Lyrics**: Sync lyrics from multiple sources
- **Custom Playlists**: Create, save, and manage playlists (IndexedDB)
- **PWA Support**: Works offline with cached content
- **Responsive Design**: Mobile-first with dark theme

---

## 📝 License

MIT License
