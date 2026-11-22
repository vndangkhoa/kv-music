# Changelog

All notable changes to KV Music will be documented in this file.

## [Unreleased]

## [1.2.9] / [Docker 1.0.0-29] - 2026-11-22

### Fixed
- **Fast Cold Streaming & Accurate Image Tag (`backend-rust`, `.github/workflows`)**:
  - Reconstructed direct `https://<host>/videoplayback?...` googlevideo URLs from Companion `/companion/videoplayback?...&host=...` redirects (preserving raw percent-encoded signatures/PO tokens) and ordered stream attempts direct -> Companion proxy -> local `usque` WARP proxy, cutting cold first-chunk TTFF from ~46s to ~1.2s by bypassing stalled Companion proxy streams
  - Added fast-fail Companion cooldown + break when all chunk candidates fail with transport/timeout errors so broken Companions fail over immediately without retrying every itag
  - Resolved `IMAGE_TAG` from `CHANGELOG.md` in `docker-publish.yml` so GitHub Actions builds bake the matching `KV_IMAGE_TAG` instead of `"dev"`

## [1.2.8] / [Docker 1.0.0-28] - 2026-11-22

### Fixed
- **High CPU & RAM Under Bot Crawls (`backend-rust`, `frontend-vite`)**:
  - Added `/robots.txt` and Axum `bot_and_rate_guard` middleware blocking AI scrapers (`Reflectionbot`, `Bytespider`, `GPTBot`, `ClaudeBot`, etc.), keeping social link-preview crawlers working for `/track/*` & `/share/*`, blocking search crawlers from infinite SPA discovery & `/api/*` loops, and rate-limiting discovery/stream endpoints per client IP
  - Validated Netscape cookie files strictly (`is_valid_netscape_cookie_file`) and matched `"does not look like a Netscape format cookies file"` so empty/0-byte `/app/cookies.txt` bind mounts are skipped instead of crashing every `yt-dlp` process
  - Removed speculative `prefetch_top_tracks` storms from search/charts/recommendations handlers, added a 5-minute failed-prefetch cooldown + Companion-only background prefetch (zero `yt-dlp` spawns), added `http://invidious-companion:8282/companion` with 60s failure cooldown, removed `yt-dlp` fallback from `search_artist()`, added a global 2-permit `sync_ytdlp_gate`, and bounded all in-memory caches (`search_cache`, `universal_search_cache`, `track_info_cache`, `share_preview_cache`, `artist_photo_cache`, `download_locks`)
  - Stopped web frontend search/recommendation bulk prefetching and skipped automated bot user agents

## [1.2.7] - 2026-11-20

### Added
- **On-Device Audio Cache & 256 KiB Head Pre-Buffering (`AudioCacheManager`)** - Added Media3 `SimpleCache` (250 MiB LRU at `exo_audio_cache`) and bounded 256 KiB head pre-buffering (aligned with backend progressive burst chunks) for visible Home, Search, Detail, and next-3 Queue tracks so tapped songs start immediately
- **Real Offline & Phone Storage Downloads (`OfflineDownloadManager`)** - Downloads full audio tracks via `/api/download/{id}?fmt=m4a` (with `/api/stream/{id}` fallback) into persistent offline app storage AND exports copy into public `Music/KV Music/` via `MediaStore.Audio.Media` (Android 10+) / external storage (API 26–28) with live progress indicators and restart persistence
- **Shared HTTP/2 Socket Prewarming & Cache-First Home (`MusicRepository`, `RetrofitClient`)** - Prewarms HTTP/2 + TLS socket at launch, deduplicates Home chart calls, fixes `/api/new-releases` (`region`), `/api/recommendations` (`seed`/`RecommendationsResponse`), and `/api/lyrics` (`track`/`video_id`) parameters, and renders Home immediately from SharedPreferences cache

### Changed
- **Instant Android Playback Path (`PlayerManager`)** - Switched default stream path to offline file → `SimpleCache` → server `/api/stream/{id}` (WebM/Opus, matching server prefetch cache) with automatic Direct InnerTube failover, removed the broken default InnerTube `403` pre-detour, tuned `DefaultLoadControl` (`250 ms` start / `750 ms` rebuffer), and removed `replaceMediaItem` artwork stutter during playback
- **Release APK Version** - Bumped `versionCode = 8`, `versionName = "1.2.7"`

## [1.2.5] - 2026-11-18

### Added
- **YouTube Music-Inspired Web & Android Visual Interface** - Replicated YouTube Music's dark canvas (`#030303`), collapsible `240px`/`72px` guide rail, `64px` search bar, `72px` bottom player bar, and expandable split Watch Page (`Song | Video`, `UP NEXT | LYRICS | RELATED`) across `frontend-vite` and `android-app` while preserving the **KV Music** app name, icon, and squircle emblem
- **Cloudflare WARP MASQUE IP-Block Bypass** - Integrated `usque` v4.2.1 (`ENABLE_WARP=1`, HTTP proxy `127.0.0.1:29083`) and OkHttp/innerTube failover across `backend-rust` and `android-app`

## [1.2.4] - 2026-11-17

### Added
- **Unified Brand Icon & Logo Suite** - 4x-supersampled KV Music flame-orange squircle + obsidian studio disc + 7 harmonic waveform bars across Web (`icon.svg`, `logo.svg`, `favicon.svg`, `icon-maskable.svg`, `og-image.png`), PWA icons (`72x72`–`512x512` standard & maskable), Synology DSM SPK icons (`PACKAGE_ICON*.PNG`, `KVMusic-{16..256}.png`), Android launcher icons (`ic_launcher*.png`), and iOS `AppIcon-1024.png`
- **Unified `<Logo />` Component** - Exported reusable `Logo` with scoped SVG IDs and `KVMusic PRO / HI-RES STREAMING` identity across header, modals, sidebar, missing-cover fallbacks, and player control cards

### Changed
- **PWA Manifest & Metadata** - Standardized `#121212` theme/background colors across `index.html`, `manifest.json`, `site.webmanifest`, and `vite.config`, separated `any` and `maskable` icons, added shortcuts & Open Graph tags, and excluded `/api/` from SW navigation fallback
- **Media Control Cards & OS MediaSession** - Replaced blob-fetch artwork in `useMediaSession.ts` with direct origin-resolved URLs and KV Music icon fallbacks, bound native `<audio>` lifecycle events for reliable lock-screen state/position sync, and upgraded `MobileMiniBar`, `PlayerBar`, and `MobileFullPlayer` with unified brand badges, transport buttons, and live `currentTime / duration` readouts

## [1.2.3] - 2026-11-13

### Fixed
- **Search stuck while typing (Android)** - Removed `focusManager.clearFocus()` on keystrokes, added 400 ms debounce with coroutine job cancellation, rethrew `CancellationException` in `MusicRepository`, and isolated `SoundCloudTrackCard` playback progress collection to the active track only
- **Search stuck while typing (Web)** - Prevented URL query sync from overwriting active/IME input in `Header.tsx` and `Search.tsx`, kept mobile search bar open while typing on `/search`, added 200 ms debounced `/api/suggestions` with `AbortController`, added 450–500 ms debounced live search with stale-response sequence guards, and wired Clear (`×`) button
- **Search typing race (iOS)** - Added 400 ms debounced `Task` cancellation and fixed suggestions dropdown visibility in `SearchView.swift`
- **Backend async stalling** - Moved `yt-dlp` subprocess calls in `spotdl.rs` and `api.rs` into `tokio::task::spawn_blocking`, replaced per-keystroke Python subprocess in `/api/suggestions` with direct YouTube Music innerTube lookup + cache, and added 10-minute in-memory caching + 10s request timeouts to `/api/universal-search`

## [1.2.2] - 2026-09-07

### Added
- **Check for updates in Settings (web)** - New App Updates section: shows the running server build, checks Docker Hub for a newer image via `/api/update-check`, and lists bundled changelog highlights for newer builds
- **Backend version endpoints** - `GET /api/version` (running image tag via `KV_IMAGE_TAG`) and `GET /api/update-check` (server-side Docker Hub comparison, no CORS needed)
- **Check for updates in Settings (Android)** - New App Updates card: installed version chip, Check button (GitHub releases with Forgejo fallback), expandable what's-new notes from the release changelog, and one-tap APK download
- **Docker build-arg plumbing** - `IMAGE_TAG` baked into `KV_IMAGE_TAG` at image build time (`ship.sh` passes it automatically)
- **Feed instant paint** - Cache-first suggestions (`kv_feed_cache_v1`): cached list paints immediately, fast charts path fills in parallel, personalized suggestions upgrade in place
- **Waveform scrub time bubble** - Web player shows `current / total` preview while scrubbing; Android full player shows a time bubble following the finger plus a "Touch & hold, then slide to seek" hint
- **Route code-splitting** - All pages lazy-loaded (`React.lazy`); Feed/Library/Track ship as separate chunks instead of one bundle
- **Hold-to-seek accessibility** - Waveform exposes slider role with arrow-key seeking and live region value

### Changed
- **Waveform data is opt-in** - `useWaveformData` no longer downloads + decodes full audio per card; lists render zero-network seeded bars, only the player/playing row fetches real peaks
- **Card re-render isolation** - `SoundCloudTrackCard` memoized; playback ticks re-render only the playing card (non-playing rows select stable `0`)
- **Waveform touch model (web)** - Plain taps no longer seek; scrub starts on 220 ms hold or 8 px slide, audio seeks once on release (`onScrubEnd`); taller touch target with `touch-action: pan-y` so vertical scroll still works
- **Waveform touch model (Android)** - `SoundCloudWaveform` gains `interactive` + `requireHoldToSeek`: hold (~280 ms, haptic) or slide to scrub, commit on release; list cards are display-only so wave taps never seek or start playback
- **Track-page hero wave** - Only scrubs the playing track; tapping another track's wave no longer autoplays
- **Desktop PlayerBar wave** - Keeps classic click-to-seek (`requireHoldToSeek={false}`)
- **Android phone release** - `versionCode` 3, `versionName` 1.2.2 (Settings → Check for updates with changelog notes)
- **CoverImage** - `decoding="async"`, non-draggable images

### Fixed
- **Waveform miss-taps (web + Android)** - Accidental taps on the sound wave no longer jump the timestamp or trigger playback; seeking requires touch-hold-and-slide
- **Feed/Library slow load** - Eliminated per-card full-audio downloads; first paint no longer waits on 6 fan-out searches
- **List scroll jank** - Offscreen cards skip layout via `content-visibility: auto`
- **Non-playing rows showed live duration** - Duration display now only binds on the current track

### Previous unreleased entries
- **Charts section** - New `/api/charts` backend endpoint and `ChartsSection` page (Top Hits, Trending Now, Top Albums, etc.)
- **Seed playlist hydration** - Empty seed playlists auto-filled with real tracks on demand
- **Discovery redesign** - ChartSection-based layout with curated Vietnamese artist queries
- **Database persistence** - New IndexedDB helpers for library data
- **MobileFullPlayer** - Dedicated mobile full-screen player with framer-motion drag-to-dismiss, swipe between queue/lyrics
- **BottomSheet component** - Reusable slide-up panel with drag handle and swipe-to-dismiss gesture
- **FullPlayer redesign** - Song/Video toggle, action row (heart, lyrics, queue, related), clean layout
- **MiniPlayer redesign** - Edge-to-edge bar with thin progress indicator, skip/play controls, tablet layout
- **Library pre-population** - Ships with 95 seed items (20 playlists, 55 artists, 20 albums)
- **Artist cover lookup** - Artist thumbnails from `GENERATED_CONTENT` instead of generic avatars
- **Queue/Related bottom sheets** - Slide-up panels replacing inline compact lists
- **Lyrics bottom sheet** - Slide-up panel replacing fullscreen overlay
- **Video mode toggle** - Switch between audio and video playback in FullPlayer
- **Lyrics search button** - Search for lyrics directly from lyrics panel
- **Share track** - Share track URL from mobile player
- **Download track** - Download track from mobile player

### Changed
- **Lyrics priority** - SimpMusic tried first (better Vietnamese coverage), then LRCLIB, then lyrics.ovh
- **Browse preload** - Backend preload disabled; content loads on-demand when first requested
- **MiniPlayer** - Simplified; playback logic consolidated into MobileFullPlayer
- **MobileFullPlayer** - Major rewrite: improved drag gestures, queue/lyrics swipe panels, share/download
- **State management** - Migrated from React Context to Zustand stores (playerStore, libraryStore, uiStore)
- **Title overlap fix** - FullPlayer title now 1 line on mobile, 2 lines on desktop
- **Action row separated** - Heart, lyrics, queue, related icons in their own row below track info
- **Volume slider** - Hidden on mobile, shown on desktop only in FullPlayer
- **Library page** - Browse content always visible (not just when library is empty)
- **Right panel** - NowPlayingBar toggleable via header button; hidden by default on first load
- **Mobile MiniPlayer** - Removed duplicate progress bar, fixed title/button overlap
- **BottomNav** - Redesigned with animation and better spacing
- **AppLayout** - Improved layout structure for mobile/desktop

### Fixed
- **Stream 500 error** - Removed `--extractor-args "youtube:player_client=web"` and `--js-runtimes node` from yt-dlp args
- **Audio/video overlap** - Added `isVideoMode` to playerStore; MiniPlayer skips audio play when video active
- **Mobile MiniPlayer overlap** - Fixed title/button spacing with `flex-[3]` text, `flex-shrink-0` controls
- **Scrollbars** - Hidden everywhere with `no-scrollbar` class (Sidebar, Artist page)

### Removed
- **Info button** - Removed from FullPlayer action row
- **Song Info modal** - Removed from FullPlayer
- **Volume slider on mobile** - Hidden (users use hardware volume buttons)
- **Unused React contexts** - PlayerContext, AuthContext, LibraryContext, LayoutContext, ThemeContext
- **LRCLIB first priority** - Demoted in favor of SimpMusic for better Vietnamese lyrics coverage

---

## [1.0.0] - 2025-01-01

### Added
- Initial release
- YouTube Music search and streaming
- Real-time synced lyrics (LRCLIB, SimpMusic, lyrics.ovh)
- Library management (playlists, artists, albums, liked songs)
- Queue management
- PWA support
- Docker deployment
- Responsive design (desktop, tablet, mobile)
- Dark glassmorphism UI
- Right panel with NowPlayingBar
- Collapsible sidebar
