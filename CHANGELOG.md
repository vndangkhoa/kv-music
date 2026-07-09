# Changelog

All notable changes to KV Music will be documented in this file.

## [Unreleased]

### Added
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
