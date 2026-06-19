# KV Music

A modern music streaming web app built with **React (Vite)**, **Rust (Axum)**, and **TailwindCSS**. Features include real-time lyrics, custom playlists, and YouTube Music integration.

---

## Quick Start (Docker)

### Option 1: Pull from Registry
```bash
docker run -p 3110:8080 git.khoavo.myds.me/vndangkhoa/kv-music:v1
```
Open **[http://localhost:3110](http://localhost:3110)**.

### Option 2: Build Locally
```bash
docker build -t kv-music:v1 .
docker run -p 3110:8080 kv-music:v1
```

### Option 3: Docker Compose
```bash
docker compose up -d
```

---

## Docker Deployment

### Image Details
- **Registry**: `git.khoavo.myds.me/vndangkhoa/kv-music`
- **Tag**: `v1`
- **Ports**: `8080` (Backend API)

### docker-compose.yml
```yaml
services:
  kv-music:
    image: git.khoavo.myds.me/vndangkhoa/kv-music:v1
    container_name: kv-music
    restart: unless-stopped
    ports:
      - "3110:8080"
    environment:
      - PORT=8080
      - RUST_LOG=info
    volumes:
      - ./data:/tmp/kv-music-downloads
      - ./cache:/tmp/kv-music-cache
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Features

- **YouTube Music Integration**: Search and play from YouTube Music
- **Trending Auto-Fetch**: 15+ categories updated every 5 minutes
- **Real-Time Lyrics**: Synced lyrics from multiple free sources (LRCLIB, SimpMusic, lyrics.ovh)
- **Custom Playlists**: Create, save, and manage playlists (IndexedDB)
- **PWA Support**: Installable as a standalone app
- **Dark Theme**: Responsive design with glassmorphism UI
- **Local Profiles**: Create a profile to track liked songs and playlists
- **Collapsible Sidebar**: Desktop sidebar with quick navigation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, TypeScript |
| Backend | Rust, Axum, yt-dlp |
| Lyrics | LRCLIB, SimpMusic, lyrics.ovh |
| Storage | IndexedDB (browser), filesystem (server) |

---

## Local Development

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

The Vite dev server proxies `/api/*` to `localhost:8080`.

---

## License

MIT License
