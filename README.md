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
  <a href="#-youtube-cookies">YouTube Cookies</a> &bull;
  <a href="#-local-development">Development</a> &bull;
  <a href="#-architecture">Architecture</a> &bull;
  <a href="#-license">License</a>
</p>

---

## Overview

KV Music is a self-hosted music streaming web application that pulls content from YouTube Music. It features a sleek dark UI with glassmorphism design, real-time synced lyrics, real YouTube Music charts (BXH), a universal search (songs / albums / playlists / artists), real user accounts with cross-device pairing, and a responsive layout that works beautifully on both desktop and mobile.

## Features

### Playback & Discovery
- **YouTube Music Integration** - Search and stream millions of songs via YouTube
- **Universal Search** - One search box returns real Songs, Albums, Playlists and Artists
- **Real-Time Charts (BXH)** - Official YouTube Music charts: Trending 20, Top 100, Daily Top Music Videos (VN / KR / US / Global)
- **New Releases (MỚI PHÁT HÀNH)** - Real latest releases per region from YouTube Music
- **Top Artists** - Real artist rankings with actual channel avatars & subscriber counts
- **Video Mode** - Toggle between audio and video playback with a single tap
- **Smart Recommendations** - Get similar tracks based on what you're playing
- **Queue Management** - Full queue with bottom sheet UI and add-to-queue

### Accounts & Sync
- **Real Account System** - Register / login with password (argon2 hashed), stored server-side and persisted on your NAS
- **Cross-Device Pairing** - Pair code links any device to your account (full account takeover)
- **Liked Songs** - Heart tracks to save them to your personal collection
- **Custom Playlists** - Create and manage unlimited playlists
- **Follow Artists** - Track your favorite artists with photos and info
- **Saved Albums** - Save full albums from YouTube Music
- **Recently Played** - Auto-tracked listening history

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
- **Mobile Search Bar** - Always-visible search bar in the mobile header
- **Mobile Bottom Nav** - Quick access to Discovery and Library on mobile
- **FullPlayer** - Immersive player with Song/Video toggle, action row, and playback controls
- **MiniPlayer** - Compact bottom bar with progress indicator, skip, and play controls

### Player Features
- **Audio/Video Overlap Prevention** - Smart switching between audio and video modes
- **Mobile Full Player** - Dedicated mobile player with drag-to-dismiss, swipe between queue/lyrics
- **Synced Lyrics** - Time-aligned lyrics that scroll with playback (SimpMusic first for Vietnamese)
- **Volume Control** - Desktop volume slider (hidden on mobile)
- **Shuffle & Repeat** - Full playback mode controls
- **Share & Download** - Share track URL or download directly from mobile player

---

## Quick Start

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
      - COOKIE_FILE=/app/cookies.txt
    volumes:
      - ./data:/tmp/kv-music-downloads
      - ./cache:/tmp/kv-music-cache
      - ./cookies.txt:/app/cookies.txt:ro
      - ./users:/app/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
mkdir -p data cache users
docker compose up -d
```

Open **http://localhost:3110** and start listening!

> **Note:** The `cookies.txt` file is optional but strongly recommended to avoid YouTube bot detection (see [YouTube Cookies](#-youtube-cookies)).

### 1-Click Docker Deploy (no cookies)

```bash
docker run -d --name kv-music -p 3110:8080 \
  -v kv-music-data:/tmp/kv-music-downloads \
  -v kv-music-cache:/tmp/kv-music-cache \
  -v kv-music-users:/app/data \
  git.khoavo.myds.me/vndangkhoa/kv-music:latest
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
| `COOKIE_FILE` | `/app/cookies.txt` | Path to the Netscape-format cookies file for YouTube |

### Volumes

| Container Path | Purpose |
|----------------|---------|
| `/tmp/kv-music-downloads` | Downloaded audio files (auto-cleaned) |
| `/tmp/kv-music-cache` | Search and metadata cache |
| `/app/data` | **Persistent user accounts** (`users.json`) |
| `/app/cookies.txt` | YouTube cookies file (optional, read-only mount) |

### Build from Source

```bash
git clone https://git.khoavo.myds.me/vndangkhoa/kv-music.git
cd kv-music
docker build -t kv-music:latest .
docker run -d -p 3110:8080 -v kv-music-users:/app/data kv-music:latest
```

> **Note:** BuildKit is required for cargo cache mounts. Enable with `export DOCKER_BUILDKIT=1` or use Docker Desktop.

### yt-dlp Updates

yt-dlp is **auto-updated on every container start** (`yt-dlp -U` runs in the entrypoint before the server starts), and you can also click **Cài Đặt → Check Update** in the app to update it on demand.

---

## YouTube Cookies

YouTube increasingly rate-limits and blocks server-side requests (HTTP 429 "Too Many Requests" / "Sign in to confirm you're not a bot"). Passing a `cookies.txt` file exported from a real browser session fixes this.

### Step 1: Install a cookie exporter extension

- **Chrome / Edge**: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) (or "EditThisCookie")
- **Firefox**: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

### Step 2: Export cookies for youtube.com

1. Log in to **YouTube** (or YouTube Music) in your browser. Logging in gives the most reliable session, but a logged-out session also works in most cases.
2. Open the cookie exporter extension.
3. **Important:** export cookies only for `youtube.com` (and `music.youtube.com`) — not all sites.
4. Save the exported file as `cookies.txt` in the **same directory as your `docker-compose.yml`**.

The file must be in **Netscape cookie format**, which looks like this:

```
# Netscape HTTP Cookie File
# This file is generated by yt-dlp.  Do not edit.

.youtube.com	TRUE	/	TRUE	1799121502	__Secure-YNID	20.YT=a5DZ...
.youtube.com	TRUE	/	TRUE	0	YSC	s7lGd3GOn1U
.youtube.com	TRUE	/	TRUE	1799140599	VISITOR_INFO1_LIVE	4OUa9K8zXNE
```

### Step 3: Restart the container

```bash
docker compose up -d --force-recreate
```

The backend automatically picks up `/app/cookies.txt` (via `COOKIE_FILE`). After exporting fresh cookies, restart the container again — **cookies expire**, so re-export them whenever you see 429 / bot-detection errors.

### Verify it works

```bash
docker exec kv-music yt-dlp --cookies /app/cookies.txt "ytsearch1:test audio" --dump-json --flat-playlist | head -c 200
```

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
| **Auth** | argon2 + bearer tokens | Password hashing & sessions |
| **Storage** | JSON file (`/app/data/users.json`) | Server-side user accounts (NAS volume) |
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

Server starts at `http://localhost:8080`. User accounts persist to `backend-rust/data/users.json` locally (or `/app/data/users.json` in Docker).

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
│   │   │   ├── player/         # MiniPlayer, FullPlayer, MobileFullPlayer, ProgressBar
│   │   │   ├── layout/         # AppLayout, NowPlayingBar, Header
│   │   │   ├── BottomSheet.tsx # Reusable bottom sheet with drag-to-dismiss
│   │   │   ├── LoginModal.tsx  # Login / Register / Pair code UI
│   │   │   ├── CoverImage.tsx  # Image with fallback
│   │   │   ├── Lyrics.tsx      # Synced lyrics display
│   │   │   └── ...
│   │   ├── stores/             # Zustand state management
│   │   │   ├── playerStore.ts  # Playback, queue, liked tracks
│   │   │   ├── libraryStore.ts # Library, playlists, artists, albums
│   │   │   ├── authStore.ts    # Real account API calls (register/login/pair)
│   │   │   └── uiStore.ts      # UI state (sidebar, panels)
│   │   ├── pages/              # Route pages
│   │   │   ├── Search.tsx      # Universal search (songs/albums/playlists/artists)
│   │   │   ├── ChartsSection.tsx # Real YT Music charts (BXH)
│   │   │   ├── ArtistsPage.tsx # Top artists ranking with real avatars
│   │   │   └── ...
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API calls (library.ts)
│   │   └── types/              # TypeScript interfaces
│   ├── public/                 # Static assets and PWA manifest
│   └── tailwind.config.js      # TailwindCSS configuration
├── backend-rust/               # Rust backend
│   └── src/
│       ├── main.rs             # Entry point, routes, server setup
│       ├── api.rs              # HTTP route handlers
│       ├── auth.rs             # Accounts: register/login/pair (argon2)
│       ├── spotdl.rs           # yt-dlp integration, search, charts, streams
│       └── models.rs           # Data models and serialization
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose config
└── .dockerignore               # Build context exclusions
```

---

## API Endpoints

### Music

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q={query}` | Search songs (yt-dlp) |
| `GET` | `/api/universal-search?q={query}` | Search songs + albums + playlists + artists (YT Music API) |
| `GET` | `/api/collection?id={id}` | Get tracks of an album (`MPRE...`) or playlist (`VLPL...`) |
| `GET` | `/api/stream/{video_id}` | Stream audio (with yt-dlp) |
| `GET` | `/api/charts?chart_type={type}` | Real YT Music charts (vn/us/kr/cn, top-hits, trending, top-albums, hits-collection) |
| `GET` | `/api/new-releases?region={vn\|us}` | Real latest releases |
| `GET` | `/api/artists?region={vn\|us\|kr\|cn}` | Top artists with real avatars |
| `GET` | `/api/artist/info?q={artist}` | Artist photo |
| `GET` | `/api/browse?country={VN}` | Browse categories per country |
| `GET` | `/api/recommendations?seed={seed}` | Smart recommendations |
| `GET` | `/api/lyrics?track={t}&artist={a}&video_id={id}` | Fetch synced lyrics (SimpMusic, LRCLIB, lyrics.ovh, ZingMP3) |
| `GET` | `/api/video-stats?id={id}` | Get video stats (views, likes) |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register `{name, email, password, avatar_color}` (min 6 chars, unique email) |
| `POST` | `/api/auth/login` | Login `{email, password}` → `{user, token}` |
| `POST` | `/api/auth/logout` | Logout `{token}` |
| `POST` | `/api/auth/me` | Get current user from `{token}` |
| `POST` | `/api/auth/pair/generate` | Generate a new pair code for the logged-in account |
| `POST` | `/api/auth/pair/link` | Link device via `{code}` → full account takeover |

### System

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/settings/update-ytdlp` | Run `yt-dlp -U` self-update, returns output |

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

## Support

If you find this project helpful, consider buying me a coffee! Your support helps keep this project alive and maintained.

<p align="center">
  <img src="frontend-vite/public/donation.jpg" alt="Donate via MoMo / VietQR" width="300"/>
</p>

---

## License

[MIT License](LICENSE) - Free to use, modify, and distribute.
