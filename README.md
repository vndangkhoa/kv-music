<p align="center">
  <img src="frontend-vite/public/icon-192.png" alt="KV Music Logo" width="100"/>
</p>

<h1 align="center">KV Music</h1>

<p align="center">
  <strong>A modern, self-hosted music streaming app powered by YouTube Music</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Rust-1.88-000000?style=flat&logo=rust" alt="Rust"/>
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
- **Smart Audio Format Negotiation** - Serves WebM/Opus by default (open codec, plays everywhere including VS Code's webview) and auto-switches to m4a/AAC for browsers that can't play WebM (e.g. Safari)
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
    # Pull from any of these registries:
    # docker.io/vndangkhoa/kv-music:latest
    # ghcr.io/vndangkhoa/kv-music:latest
    # git.khoavo.myds.me/vndangkhoa/kv-music:latest
    image: vndangkhoa/kv-music:latest
    container_name: kv-music
    restart: unless-stopped
    ports:
      - "3110:8080"
    environment:
      - PORT=8080
      - RUST_LOG=info
      - PYTHONUNBUFFERED=1
      - COOKIE_FILE=/app/cookies.txt
      # - FORCE_IPV6=0   # uncomment to force IPv4 for yt-dlp
    dns:
      - 8.8.8.8
      - 1.1.1.1
    volumes:
      - ./data:/tmp/kv-music-downloads
      - ./cache:/tmp/kv-music-cache
      - ./cookies.txt:/app/cookies.txt:ro
      - ./users:/app/data
    networks:
      - kvnet
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  kvnet:
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.20.0.0/16
        - subnet: fd00:1::/64
```

```bash
mkdir -p data cache users
docker compose up -d
```

Open **http://localhost:3110** and start listening!

> **IPv6 & DNS note:** YouTube's bot detection blocks many IPv4 routes but allows IPv6. The compose file above gives the container IPv6 (requires Docker with IPv6 enabled: `"ipv6": true, "fixed-cidr-v6": "fd00::/64"` in `/etc/docker/daemon.json` or Docker Desktop Engine settings) and uses external DNS (Docker's embedded DNS strips AAAA records). The backend **probes actual IPv6 connectivity** (TCP connect, 3s timeout) and only then adds `--force-ipv6` to yt-dlp; if IPv6 is assigned but not routed (common on Synology Docker), it automatically falls back to IPv4. Set `FORCE_IPV6=0` to disable, `FORCE_IPV6=1` to force.

### 1-Click Docker Deploy (no cookies)

```bash
docker run -d --name kv-music -p 3110:8080 \
  -v kv-music-data:/tmp/kv-music-downloads \
  -v kv-music-cache:/tmp/kv-music-cache \
  -v kv-music-users:/app/data \
  git.khoavo.myds.me/vndangkhoa/kv-music:latest
```

> **Note:** the `docker run` one-liner uses Docker's default bridge network (IPv4-only).
> If YouTube bot-blocks your IPv4 route, prefer the [docker-compose](#-docker-compose-recommended)
> setup above (IPv6-enabled network + external DNS), or add:
> `--network host --dns 8.8.8.8`

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
| `FORCE_IPV6` | auto | Force yt-dlp to use IPv6 (`1` = always, `0` = never; default: auto-probes IPv6 connectivity and falls back to IPv4 on network errors) |

### Volumes

| Container Path | Purpose |
|----------------|---------|
| `/tmp/kv-music-downloads` | Downloaded audio files (auto-cleaned) |
| `/tmp/kv-music-cache` | Search and metadata cache |
| `/app/data` | **Persistent user accounts** (`users.json`) and auto-refreshed cookies (`cookies.txt`) |
| `/app/cookies.txt` | YouTube cookies file (optional, read-only mount; auto-refreshed file in `/app/data` takes priority) |

### Networks

| Network | Purpose |
|---------|---------|
| `kvnet` | Dual-stack (IPv4 + IPv6) bridge network required so yt-dlp can connect to YouTube over IPv6 (see [Automatic Cookie Refresh](#automatic-cookie-refresh) note on bot detection) |

### Build from Source

```bash
git clone https://git.khoavo.myds.me/vndangkhoa/kv-music.git
cd kv-music
docker build -t kv-music:latest .
docker run -d -p 3110:8080 -v kv-music-users:/app/data kv-music:latest
```

> **Note:** BuildKit is required for cargo cache mounts. Enable with `export DOCKER_BUILDKIT=1` or use Docker Desktop.
>
> **Note:** the simple `docker run` above uses the default IPv4-only bridge network. If YouTube bot-blocks your IPv4 route, add `--network host --dns 8.8.8.8` (or use the [docker-compose](#-docker-compose-recommended) setup with the IPv6 `kvnet` network).

### yt-dlp Updates

yt-dlp is **auto-updated to the latest nightly binary on every container start** (nightly builds include the newest YouTube anti-bot workarounds such as PO tokens), and you can also click **Cài Đặt → Check Update** in the app to update it on demand.

### Automatic Cookie Refresh

YouTube increasingly rate-limits server-side requests (HTTP 429 / "Sign in to confirm you're not a bot"). KV Music can fetch **fresh YouTube session cookies automatically** — no manual export needed:

- Click **Cài Đặt → Lấy Cookie Mới** (Settings → Fetch Fresh Cookies) in the app, or
- On server start, if no cookie file exists at all, fresh cookies are fetched automatically, or
- **Automatically when YouTube rejects the current cookies**: if yt-dlp reports "cookies are no longer valid" / "Sign in to confirm you're not a bot", the backend discards the rejected cookie file, refreshes the anonymous session and retries the download — no manual re-export needed.

Fresh cookies are written to a **writable, persistent** location (`/app/data/cookies.txt` in Docker, `data/cookies.txt` locally). After a refresh, **all in-memory caches are cleared**, so every subsequent fetch (search, charts, new releases, artists, streams, browse) uses the new cookies.

> **IPv6 matters too:** YouTube's bot detection also blocks many residential **IPv4** routes while allowing IPv6. The docker-compose `kvnet` network is dual-stack so yt-dlp connects over IPv6 when the host supports it (the backend auto-adds `--force-ipv6`; set `FORCE_IPV6=0` to disable). Docker's embedded DNS strips `AAAA` records, so the compose file points at `8.8.8.8` / `1.1.1.1` instead.

> **Important — anonymous cookies cannot override an IP-level block.** If your NAS IP itself is bot-flagged by YouTube (common on residential/Synology connections), "Sign in to confirm you're not a bot" persists even with fresh anonymous cookies. Two real fixes exist: enable routed IPv6 in the container (preferred, no cookies needed), or export a **logged-in** `cookies.txt` from your browser — a logged-in session defeats the IP-level block (see [Troubleshooting on a NAS](#troubleshooting-on-a-nas)).

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
docker exec kv-music yt-dlp --js-runtimes node --cookies /app/cookies.txt "ytsearch1:test audio" --dump-json --flat-playlist | head -c 200
```

If you see `HTTP Error 429` / `Sign in to confirm you're not a bot`, make sure the container has IPv6 (dual-stack `kvnet` network from docker-compose) — see [Automatic Cookie Refresh](#automatic-cookie-refresh).

---

## Troubleshooting on a NAS

### Symptom: "cannot play music", stream endpoint returns HTTP 500

Open the 500 response body (or `docker logs kv-music`) to see yt-dlp's real error:

**1. `The provided YouTube account cookies are no longer valid`**

Your mounted `cookies.txt` export expired (browser sessions rotate). The backend now detects this, discards the rejected file and auto-refreshes — but the strongest fix is re-exporting a fresh **logged-in** `cookies.txt` (see [YouTube Cookies](#youtube-cookies)).

**2. `Sign in to confirm you're not a bot` (no cookie warning)**

Your NAS **IP itself is bot-flagged** and anonymous cookies can't override that. Check which network path the container actually has:

```bash
# Inside the container - is IPv6 routed?
docker exec kv-music sh -c "curl -6 -m 8 -s -o /dev/null -w IPv6:%{http_code} https://www.youtube.com/ || echo IPv6-FAILED"
# IPv4?
docker exec kv-music sh -c "curl -4 -m 8 -s -o /dev/null -w IPv4:%{http_code} https://www.youtube.com/ || echo IPv4-FAILED"
```

- **`IPv6:200`** → the container should already stream over IPv6 (backend probes and adds `--force-ipv6`). If streams still fail, the probe result may be stale — restart the container.
- **`IPv6:000` + `IPv4:200`** → the `kvnet` dual-stack network has IPv6 assigned but **not routed** (very common on Synology Docker). The container falls back to IPv4, which YouTube blocks. Fixes, in order of preference:
  1. **Enable routed IPv6**: enable IPv6 on your router (ISP must provide it) and on the Synology (`Control Panel → Network → Network Interface → IPv6`, e.g. DHCPv6), then restart the container until `IPv6:200`.
  2. **Export a fresh logged-in `cookies.txt`** from your browser — a logged-in session defeats IP-level bot checks even over a flagged IPv4 route (this is the reliable fix if IPv6 is unavailable).

### Other playback issues

- **`NotSupportedError: no supported source was found`** (browser console): the app serves **WebM/Opus** by default (open codec — plays in Chrome/Firefox/Edge and codec-restricted clients like VS Code's webview) and requests **m4a/AAC** (`?fmt=m4a`) only when the browser can't play WebM/Opus (e.g. Safari). If you still hit this, hard-refresh (Ctrl+Shift+R) — an old tab keeps a stuck error state from before the format fix.
- **Songs previously played still fail**: the server caches downloads; after a backend upgrade, clear the old cache volume (`docker compose down && rm -rf cache`) so stale files are re-downloaded in the new format.
- **Search shows "No results found"**: hard-refresh the page (Ctrl+Shift+R) — an old tab runs pre-fix frontend code.

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
| **Storage** | JSON file (`/app/data/users.json`) | Server-side user accounts + auto-refreshed cookies (NAS volume) |
| **Container** | Docker, Debian | Deployment packaging |

---

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Frontend build & yt-dlp JS runtime |
| Rust | 1.88+ | Backend compilation |
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
| `POST` | `/api/settings/fetch-cookies` | Automatically fetch fresh YouTube session cookies (writes Netscape cookie file, clears all caches so every fetch re-uses the new cookies) |

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
