<p align="center">
  <img src="frontend-vite/public/icon-192.png" alt="KV Music Logo" width="100"/>
</p>

<h1 align="center">KV Music</h1>

<p align="center">
  <strong>A modern, self-hosted music streaming app powered by YouTube Music</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Rust-1.85-000000?style=flat&logo=rust" alt="Rust"/>
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat&logo=tailwindcss" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/Axum-0.8-000000?style=flat" alt="Axum"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
</p>

<p align="center">
  <a href="#-features">Features</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-docker-deployment">Docker</a> &bull;
  <a href="#-local-development">Development</a> &bull;
  <a href="#-architecture">Architecture</a> &bull;
  <a href="#-license">License</a>
</p>

---

## Overview

KV Music is a self-hosted music streaming web application that pulls content from YouTube Music. It features a sleek dark UI with glassmorphism design, real-time synced lyrics, smart playlists, and a responsive layout that works beautifully on both desktop and mobile.

## Features

### Playback & Discovery
- **YouTube Music Integration** - Search and stream millions of songs via YouTube
- **Video Mode** - Toggle between audio and video playback with a single tap
- **Smart Recommendations** - Get similar tracks based on what you're playing
- **Trending Content** - 15+ auto-refreshing categories (pop, hip-hop, rock, etc.)
- **Queue Management** - Full queue with bottom sheet UI and add-to-queue

### Library & Personalization
- **Liked Songs** - Heart tracks to save them to your personal collection
- **Custom Playlists** - Create and manage unlimited playlists
- **Follow Artists** - Track your favorite artists with photos and info
- **Saved Albums** - Save full albums from YouTube Music
- **Recently Played** - Auto-tracked listening history
- **Pre-populated Library** - Ships with 95 seed items (20 playlists, 55 artists, 20 albums)

### Lyrics
- **Real-Time Synced Lyrics** - Time-synced lyrics that highlight as songs play
- **Multiple Sources** - LRCLIB, SimpMusic, lyrics.ovh for maximum coverage
- **Bottom Sheet Panel** - Slide-up lyrics panel with drag-to-dismiss gesture
- **Auto-Scroll** - Lyrics follow the current playback position

### Interface
- **Responsive Layout** - Beautiful on desktop, tablet, and mobile
- **Collapsible Sidebar** - Desktop sidebar with quick navigation (toggle via hamburger)
- **Right Panel** - Now Playing card with toggle button in header
- **Dark Glassmorphism UI** - Modern translucent design with blur effects
- **PWA Support** - Install as a standalone app on any device
- **Mobile Bottom Nav** - Quick access to Home, Explore, and Library on mobile
- **FullPlayer** - Immersive player with Song/Video toggle, action row, and playback controls
- **MiniPlayer** - Compact bottom bar with progress indicator, skip, and play controls

### Player Features
- **Audio/Video Overlap Prevention** - Smart switching between audio and video modes
- **Synced Lyrics** - Time-aligned lyrics that scroll with playback
- **Volume Control** - Desktop volume slider (hidden on mobile)
- **Shuffle & Repeat** - Full playback mode controls

---

## Quick Start

### 1-Click Docker Deploy

```bash
docker run -d --name kv-music -p 3110:8080 git.khoavo.myds.me/vndangkhoa/kv-music:latest
```

Open **http://localhost:3110** and start listening!

### Docker Compose (Recommended)

```yaml
services:
  kv-music:
    image: git.khoavo.myds.me/vndangkhoa/kv-music:latest
    container_name: kv-music
    restart: unless-stopped
    ports:
      - "3110:8080"
    environment:
      - PORT=8080
      - RUST_LOG=info
      - PYTHONUNBUFFERED=1
    volumes:
      - ./data:/tmp/kv-music-downloads
      - ./cache:/tmp/kv-music-cache
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
docker compose up -d
```

---

## Docker Deployment

| Property | Value |
|----------|-------|
| Registry | `git.khoavo.myds.me/vndangkhoa/kv-music` |
| Tag | `latest` |
| Port | `3110` &rarr; `8080` |
| Platform | `linux/amd64` |
| Base | `debian:bookworm-slim` |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `RUST_LOG` | `info` | Log level (`info`, `debug`, `warn`, `error`) |
| `PYTHONUNBUFFERED` | `1` | Python stdout buffering (recommended) |

### Volumes

| Container Path | Purpose |
|----------------|---------|
| `/tmp/kv-music-downloads` | Downloaded audio files (auto-cleaned) |
| `/tmp/kv-music-cache` | Search and metadata cache |

### Build from Source

```bash
git clone https://git.khoavo.myds.me/vndangkhoa/kv-music.git
cd kv-music
docker build -t kv-music:latest .
docker run -d -p 3110:8080 kv-music:latest
```

> **Note:** BuildKit is required for cargo cache mounts. Enable with `export DOCKER_BUILDKIT=1` or use Docker Desktop.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Zustand | UI framework & state management |
| **Build** | Vite 5, PWA | Fast bundling & offline support |
| **Styling** | TailwindCSS + animate | Utility-first CSS with animations |
| **Backend** | Rust, Axum | High-performance HTTP server |
| **Streaming** | yt-dlp + Node.js 22 | YouTube audio extraction |
| **Lyrics** | LRCLIB, SimpMusic, lyrics.ovh | Free synced lyrics APIs |
| **Storage** | IndexedDB (browser) | User data, playlists, history |
| **Database** | SQLite (server) | Metadata and search cache |
| **Container** | Docker, Debian | Deployment packaging |

---

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Frontend build & yt-dlp JS runtime |
| Rust | 1.85+ | Backend compilation |
| Python | 3.11+ | yt-dlp dependency |
| ffmpeg | Any | Audio processing |
| yt-dlp | Latest | YouTube audio extraction |

### Backend (Rust)

```bash
cd backend-rust
cargo run --release
```

Server starts at `http://localhost:8080`.

### Frontend (React)

```bash
cd frontend-vite
npm install
npm run dev
```

Dev server at `http://localhost:5173` with API proxy to `localhost:8080`.

### Project Structure

```
kv-music/
├── frontend-vite/              # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── player/         # MiniPlayer, FullPlayer, ProgressBar
│   │   │   ├── layout/         # AppLayout, NowPlayingBar, Header
│   │   │   ├── BottomSheet.tsx # Reusable bottom sheet with drag-to-dismiss
│   │   │   ├── CoverImage.tsx  # Image with fallback
│   │   │   ├── Lyrics.tsx      # Synced lyrics display
│   │   │   └── ...
│   │   ├── stores/             # Zustand state management
│   │   │   ├── playerStore.ts  # Playback, queue, liked tracks
│   │   │   ├── libraryStore.ts # Library, playlists, artists, albums
│   │   │   └── uiStore.ts      # UI state (sidebar, panels)
│   │   ├── pages/              # Route pages
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API calls (library.ts)
│   │   └── types/              # TypeScript interfaces
│   ├── public/                 # Static assets and PWA manifest
│   └── tailwind.config.js      # TailwindCSS configuration
├── backend-rust/               # Rust backend
│   └── src/
│       ├── main.rs             # Entry point and server setup
│       ├── api.rs              # HTTP route handlers
│       ├── spotdl.rs           # yt-dlp integration and search
│       └── types.rs            # Data models and serialization
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose config
└── .dockerignore               # Build context exclusions
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q={query}` | Search YouTube Music |
| `GET` | `/api/trending?country={VN}` | Get trending categories |
| `GET` | `/api/stream/{video_id}` | Stream audio (with yt-dlp) |
| `GET` | `/api/lyrics?title={t}&artist={a}` | Fetch synced lyrics |
| `GET` | `/api/artist/{id}` | Get artist info & top tracks |
| `GET` | `/api/recommendations/{id}` | Get similar songs |
| `GET` | `/api/related/{id}` | Get related content (albums, artists) |
| `GET` | `/static/*` | Serve frontend build |

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome 90+ | Supported |
| Firefox 90+ | Supported |
| Safari 15+ | Supported |
| Edge 90+ | Supported |
| Mobile Chrome | Supported |
| Mobile Safari | Supported |

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

[MIT License](LICENSE) - Free to use, modify, and distribute.
