# Spotify Clone 🎵

A fully functional clone of the Spotify web player, built with **React**, **Rust (Axum)**, and **TailwindCSS**. This application replicates the premium authentic feel of the original web player with added features like synchronized lyrics, custom playlist management, and "Audiophile" technical specs.

![Preview](https://opengraph.githubassets.com/1/vndangkhoa/spotify-clone)

---

## 🚀 Quick Start (Docker)

### Option 1: Pull from Registry
```bash
docker pull git.khoavo.myds.me/vndangkhoa/spotify-clone:v3
docker run -d -p 3000:8080 --name spotify-clone \
  -v ./data:/app/data \
  -v ./cache:/tmp/spotify-clone-cache \
  --restart unless-stopped \
  git.khoavo.myds.me/vndangkhoa/spotify-clone:v3
```

### Option 2: Build Locally
```bash
docker build -t spotify-clone:v3 .
docker run -d -p 3000:8080 --name spotify-clone \
  -v ./data:/app/data \
  -v ./cache:/tmp/spotify-clone-cache \
  --restart unless-stopped \
  spotify-clone:v3
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

## 🐳 Docker Deployment

### Building the Image
```bash
# Build for linux/amd64 (Synology NAS)
docker build -t git.khoavo.myds.me/vndangkhoa/spotify-clone:v3 .

# Push to registry
docker push git.khoavo.myds.me/vndangkhoa/spotify-clone:v3
```

### Docker Compose (Recommended)
```yaml
services:
  spotify-clone:
    image: git.khoavo.myds.me/vndangkhoa/spotify-clone:v3
    container_name: spotify-clone
    restart: unless-stopped
    ports:
      - "3000:8080"
    environment:
      - PORT=8080
      - RUST_ENV=production
    volumes:
      - ./data:/app/data
      - ./cache:/tmp/spotify-clone-cache
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 📦 Synology NAS Deployment

### Method A: Container Manager UI (GUI)

1. **Open Container Manager** on your Synology NAS.
2. Go to **Registry** and click **Add**:
   - Registry URL: `https://git.khoavo.myds.me`
   - Enter credentials if prompted.
3. Search for `vndangkhoa/spotify-clone` and download the `v3` tag.
4. Go to **Image**, select the downloaded image, and click **Run**.
5. Configure:
   - **Container Name**: `spotify-clone`
   - **Port Settings**: 
     - Local Port: `3000` (or any available port)
     - Container Port: `8080`
   - **Volume Settings**:
     - Add folder: `docker/spotify-clone/data` → `/app/data`
     - Add folder: `docker/spotify-clone/cache` → `/tmp/spotify-clone-cache`
   - **Restart Policy**: `unless-stopped`
6. Click **Done** and access at `http://YOUR_NAS_IP:3000`.

### Method B: Docker Compose (CLI)

1. SSH into your Synology NAS or use the built-in terminal.
2. Create a folder:
   ```bash
   mkdir -p /volume1/docker/spotify-clone
   cd /volume1/docker/spotify-clone
   ```
3. Create `docker-compose.yml`:
   ```yaml
   services:
     spotify-clone:
       image: git.khoavo.myds.me/vndangkhoa/spotify-clone:v3
       container_name: spotify-clone
       restart: unless-stopped
       ports:
         - "3000:8080"
       environment:
         - PORT=8080
         - RUST_ENV=production
       volumes:
         - ./data:/app/data
         - ./cache:/tmp/spotify-clone-cache
   ```
4. Run:
   ```bash
   docker compose up -d
   ```

### Synology-Specific Notes

- **Architecture**: This image is built for `linux/amd64` (compatible with most Intel-based Synology NAS).
- **DSM 7+**: Use Container Manager (Docker GUI replacement).
- **Data Persistence**: The `./data` volume stores playlists and application data. Backup this folder to preserve your data.
- **Updating**: Pull the latest image and recreate the container, or use Watchtower for auto-updates.

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- Rust 1.75+
- Python 3.11+
- ffmpeg

### 1. Backend Setup (Rust)
```bash
cd backend-rust
cargo run
```
Backend runs on `http://localhost:8080`.

### 2. Frontend Setup
```bash
cd frontend-vite
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## ✨ Features

- **Real-Time Lyrics**: Fetch and sync lyrics from multiple sources.
- **Audiophile Engine**: "Tech Specs" view showing live bitrate, LUFS, and Dynamic Range.
- **Local-First**: Works offline (PWA) and syncs local playlists.
- **Smart Search**: Unified search across YouTube Music.
- **Responsive**: Full mobile support with dedicated full-screen player.
- **Smooth Loading**: Skeleton animations for seamless data fetching.

## 📝 License

MIT License
